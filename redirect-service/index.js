// redirect-service/index.js
const express = require('express');
const { createClient } = require('redis');
const amqp = require('amqplib');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limiting for redirects
const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 redirects per minute
  message: {
    error: 'Too many redirect requests from this IP, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/', redirectLimiter);

// Redis setup
const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// RabbitMQ setup
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'q.click-events';
let channel, connection;

// Validation schemas
const shortCodeSchema = Joi.object({
  shortCode: Joi.string().alphanum().min(3).max(20).required().messages({
    'string.alphanum': 'Short code must contain only letters and numbers',
    'any.required': 'Short code is required',
    'string.min': 'Short code must be at least 3 characters long',
    'string.max': 'Short code must be at most 20 characters long'
  })
});

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details.map(detail => detail.message)
    });
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'External service connection failed'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

async function connectRabbitMQ() {
  let retries = 5;
  while (retries > 0) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      console.log('Connected to RabbitMQ successfully');
      
      // Handle connection errors
      connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });
      
      connection.on('close', () => {
        console.log('RabbitMQ connection closed');
      });
      
      return;
    } catch (error) {
      retries--;
      console.log(`RabbitMQ connection failed. Retries left: ${retries}`);
      if (retries === 0) {
        console.error('Failed to connect to RabbitMQ after multiple attempts');
        // Don't exit, continue without message queue (graceful degradation)
        channel = null;
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
  }
}

app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    service: 'redirect-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      redis: redisClient.isReady ? 'connected' : 'disconnected',
      rabbitmq: channel ? 'connected' : 'disconnected'
    }
  };
  
  const isHealthy = redisClient.isReady;
  res.status(isHealthy ? 200 : 503).json(health);
});

app.get('/:shortCode', asyncHandler(async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for: ${req.params.shortCode}`);
  
  // Validate short code
  const { error, value } = shortCodeSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      error: 'Invalid Short Code',
      message: 'The provided short code format is invalid',
      details: error.details.map(detail => detail.message)
    });
  }

  const { shortCode } = value;

  // Check if Redis is connected
  if (!redisClient.isReady) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Cache service is not available'
    });
  }

  const longUrl = await redisClient.get(shortCode);
  console.log(`Retrieved longUrl: ${longUrl}`);

  if (!longUrl) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found or has expired'
    });
  }

  // Validate the retrieved URL
  try {
    new URL(longUrl); // This will throw if URL is invalid
  } catch (urlError) {
    console.error('Invalid URL stored in cache:', longUrl);
    return res.status(500).json({
      error: 'Invalid URL',
      message: 'The stored URL is malformed'
    });
  }

  // Asynchronously publish a click event (with error handling)
  try {
    if (channel) {
      const event = {
        shortCode,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        referer: req.headers.referer || null,
        longUrl: longUrl
      };
      
      // Send to queue with error handling
      await channel.sendToQueue(
        QUEUE_NAME, 
        Buffer.from(JSON.stringify(event)), 
        { persistent: true }
      );
      console.log('Click event sent to queue successfully');
    } else {
      console.warn('RabbitMQ channel not available, skipping analytics');
    }
  } catch (queueError) {
    console.error('Failed to send click event to queue:', queueError);
    // Continue with redirect even if analytics fails
  }

  // Perform redirect
  console.log(`Redirecting to: ${longUrl}`);
  return res.redirect(302, longUrl);
}));

// Handle 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const startServer = async () => {
  try {
    const PORT = process.env.PORT || 8091;
    
    // Connect to Redis with retry logic
    let retries = 5;
    while (retries > 0) {
      try {
        await redisClient.connect();
        console.log('Connected to Redis successfully');
        break;
      } catch (error) {
        retries--;
        console.log(`Redis connection failed. Retries left: ${retries}`);
        if (retries === 0) {
          console.error('Failed to connect to Redis after multiple attempts');
          process.exit(1);
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }

    // Connect to RabbitMQ (with graceful degradation)
    await connectRabbitMQ();

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      if (connection) {
        await connection.close();
      }
      await redisClient.quit();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      if (connection) {
        await connection.close();
      }
      await redisClient.quit();
      process.exit(0);
    });

    app.listen(PORT, () => {
      console.log(`Redirect-Service is running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();