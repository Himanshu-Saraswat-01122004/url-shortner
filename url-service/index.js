// url-service/index.js
const express = require('express');
const { createClient } = require('redis');
const { nanoid } = require('nanoid');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

const BASE_URL = process.env.BASE_URL || 'http://localhost:8091/';
const PORT = process.env.PORT || 8080;

// Validation schemas
const urlSchema = Joi.object({
  longUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required().messages({
    'string.uri': 'Please provide a valid URL with http:// or https://',
    'any.required': 'URL is required'
  }),
  customCode: Joi.string().alphanum().min(3).max(20).optional().messages({
    'string.alphanum': 'Custom code must contain only letters and numbers',
    'string.min': 'Custom code must be at least 3 characters long',
    'string.max': 'Custom code must be at most 20 characters long'
  })
});

const shortCodeSchema = Joi.object({
  shortCode: Joi.string().alphanum().min(3).max(20).required().messages({
    'string.alphanum': 'Short code must contain only letters and numbers',
    'any.required': 'Short code is required'
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
      message: 'Database connection failed'
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'url-service',
    timestamp: new Date().toISOString()
  });
});

// Create short URL
app.post('/api/v1/url', asyncHandler(async (req, res) => {
  // Validate input
  const { error, value } = urlSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }

  const { longUrl, customCode } = value;

  // Check if Redis is connected
  if (!redisClient.isReady) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Cache service is not available'
    });
  }

  let shortCode;
  
  if (customCode) {
    // Check if custom code already exists
    const exists = await redisClient.exists(customCode);
    if (exists) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Custom code already exists. Please choose a different one.'
      });
    }
    shortCode = customCode;
  } else {
    // Generate a unique short code
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      shortCode = nanoid(7);
      attempts++;
      
      if (attempts > maxAttempts) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Unable to generate unique short code'
        });
      }
    } while (await redisClient.exists(shortCode));
  }

  // Store the mapping in Redis with TTL (optional)
  await redisClient.setEx(shortCode, 31536000, longUrl); // 1 year TTL
  
  res.status(201).json({ 
    shortUrl: BASE_URL + shortCode,
    shortCode: shortCode,
    longUrl: longUrl,
    createdAt: new Date().toISOString()
  });
}));

// Get URL details
app.get('/api/v1/url/:shortCode', asyncHandler(async (req, res) => {
  // Validate short code
  const { error, value } = shortCodeSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
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
  
  if (!longUrl) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found'
    });
  }

  res.status(200).json({
    shortCode: shortCode,
    longUrl: longUrl,
    shortUrl: BASE_URL + shortCode
  });
}));

// Delete URL
app.delete('/api/v1/url/:shortCode', asyncHandler(async (req, res) => {
  // Validate short code
  const { error, value } = shortCodeSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
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

  const deleted = await redisClient.del(shortCode);
  
  if (deleted === 0) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found'
    });
  }

  res.status(200).json({
    message: 'Short URL deleted successfully',
    shortCode: shortCode
  });
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

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await redisClient.quit();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await redisClient.quit();
      process.exit(0);
    });

    app.listen(PORT, () => {
      console.log(`URL-Service is running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();