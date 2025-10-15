// analytics-service/index.js
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const amqp = require('amqplib');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// --- Database Setup (Sequelize ORM) ---
const sequelize = new Sequelize(
  process.env.DB_NAME || 'analytics_db', 
  process.env.DB_USER || 'user', 
  process.env.DB_PASSWORD || 'password', 
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      match: [
        /ConnectionError/,
        /ConnectionRefusedError/,
        /ConnectionTimedOutError/,
        /TimeoutError/,
      ],
      max: 3
    }
  }
);

const Click = sequelize.define('Click', {
  shortCode: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: {
      len: [3, 20],
      isAlphanumeric: true
    }
  },
  timestamp: { 
    type: DataTypes.DATE, 
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ipAddress: { 
    type: DataTypes.STRING,
    validate: {
      isIP: true
    }
  },
  userAgent: { 
    type: DataTypes.TEXT
  },
  referer: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        args: true,
        msg: 'Referer must be a valid URL'
      }
    }
  },
  longUrl: {
    type: DataTypes.TEXT,
    allowNull: true, // Allow null for existing records
    validate: {
      isUrl: {
        args: true,
        msg: 'Long URL must be a valid URL'
      }
    }
  }
}, { 
  timestamps: true,
  indexes: [
    {
      fields: ['shortCode']
    },
    {
      fields: ['timestamp']
    }
  ]
});


// --- RabbitMQ Consumer ---
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'q.click-events';

// Validation schemas
const shortCodeSchema = Joi.object({
  shortCode: Joi.string().alphanum().min(3).max(20).required().messages({
    'string.alphanum': 'Short code must contain only letters and numbers',
    'any.required': 'Short code is required'
  })
});

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
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
  
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed'
    });
  }
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => e.message)
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

async function startConsumer() {
  let retries = 5;
  while (retries > 0) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      
      console.log('Analytics consumer is waiting for messages.');

      // Handle connection errors
      connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });
      
      connection.on('close', () => {
        console.log('RabbitMQ connection closed, attempting to reconnect...');
        setTimeout(() => startConsumer(), 5000);
      });

      channel.consume(QUEUE_NAME, async (msg) => {
        if (msg !== null) {
          try {
            const event = JSON.parse(msg.content.toString());
            console.log(`Received click event for: ${event.shortCode}`);
            
            // Validate event data
            const validatedEvent = {
              shortCode: event.shortCode,
              timestamp: new Date(event.timestamp),
              ipAddress: event.ipAddress === 'unknown' ? null : event.ipAddress,
              userAgent: event.userAgent === 'unknown' ? null : event.userAgent,
              referer: event.referer || null,
              longUrl: event.longUrl || null // Handle missing longUrl from older events
            };
            
            await Click.create(validatedEvent); // Save to PostgreSQL
            channel.ack(msg); // Acknowledge the message
            console.log(`Successfully processed click event for: ${event.shortCode}`);
          } catch (error) {
            console.error('Error processing message:', error);
            
            // Check if it's a validation error or database error
            if (error.name === 'SequelizeValidationError' || error instanceof SyntaxError) {
              // Don't retry validation errors or JSON parse errors
              console.error('Message rejected due to validation error:', error.message);
              channel.nack(msg, false, false); // Reject and don't requeue
            } else {
              // Retry other errors
              console.error('Message processing failed, will retry:', error.message);
              channel.nack(msg, false, true); // Reject and requeue
            }
          }
        }
      });
      
      return; // Success, exit retry loop
    } catch (error) {
      retries--;
      console.log(`RabbitMQ connection failed. Retries left: ${retries}`);
      if (retries === 0) {
        console.error('Failed to connect to RabbitMQ after multiple attempts');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
  }
}


// --- API Setup (Express) ---
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
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const PORT = process.env.PORT || 8082;

// Health check endpoint
app.get('/health', async (req, res) => {
  console.log('Health endpoint hit!');
  try {
    await sequelize.authenticate();
    console.log('Database authentication successful');
    res.status(200).json({ 
      status: 'healthy', 
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.log('Database authentication failed:', error.message);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Get analytics for specific short code
app.get('/api/v1/analytics/:shortCode', asyncHandler(async (req, res) => {
  // Validate short code
  const { error: paramError, value: paramValue } = shortCodeSchema.validate(req.params);
  if (paramError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: paramError.details.map(detail => detail.message)
    });
  }

  // Validate query parameters
  const { error: queryError, value: queryValue } = analyticsQuerySchema.validate(req.query);
  if (queryError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: queryError.details.map(detail => detail.message)
    });
  }

  const { shortCode } = paramValue;
  const { startDate, endDate, limit, offset } = queryValue;

  // Build where clause
  const whereClause = { shortCode };
  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp[Sequelize.Op.gte] = startDate;
    if (endDate) whereClause.timestamp[Sequelize.Op.lte] = endDate;
  }

  const result = await Click.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['timestamp', 'DESC']],
    attributes: {
      exclude: ['id'] // Don't expose internal IDs
    }
  });

  res.json({ 
    shortCode, 
    totalClicks: result.count,
    clicks: result.rows,
    pagination: {
      limit,
      offset,
      total: result.count,
      hasMore: offset + limit < result.count
    }
  });
}));

// Get overall analytics
app.get('/api/v1/analytics', asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = analyticsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => detail.message)
    });
  }

  const { startDate, endDate, limit, offset } = value;

  // Build where clause
  const whereClause = {};
  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp[Sequelize.Op.gte] = startDate;
    if (endDate) whereClause.timestamp[Sequelize.Op.lte] = endDate;
  }

  // Get top URLs by click count
  const topUrls = await Click.findAll({
    where: whereClause,
    attributes: [
      'shortCode',
      'longUrl',
      [Sequelize.fn('COUNT', Sequelize.col('shortCode')), 'clickCount']
    ],
    group: ['shortCode', 'longUrl'],
    order: [[Sequelize.fn('COUNT', Sequelize.col('shortCode')), 'DESC']],
    limit,
    offset
  });

  // Get total clicks
  const totalClicks = await Click.count({ where: whereClause });

  // Get unique URLs count
  const uniqueUrls = await Click.count({
    where: whereClause,
    distinct: true,
    col: 'shortCode'
  });

  res.json({
    summary: {
      totalClicks,
      uniqueUrls,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    },
    topUrls,
    pagination: {
      limit,
      offset,
      hasMore: offset + limit < uniqueUrls
    }
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


// --- Start Application ---
const startServer = async () => {
  try {
    // Connect to PostgreSQL with retry logic
    let retries = 5;
    while (retries > 0) {
      try {
        await sequelize.authenticate();
        console.log('Connected to PostgreSQL successfully');
        break;
      } catch (error) {
        retries--;
        console.log(`PostgreSQL connection failed. Retries left: ${retries}`);
        if (retries === 0) {
          console.error('Failed to connect to PostgreSQL after multiple attempts');
          process.exit(1);
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }

    // Sync models with DB - handle existing data gracefully
    try {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');
    } catch (syncError) {
      if (syncError.name === 'SequelizeDatabaseError' && syncError.original.code === '23502') {
        console.log('Handling existing data migration...');
        // Drop and recreate table if there's a constraint issue
        await sequelize.sync({ force: true });
        console.log('Database models recreated (existing data cleared)');
      } else {
        throw syncError;
      }
    }
    
    // Start RabbitMQ consumer
    startConsumer();
    
    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await sequelize.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await sequelize.close();
      process.exit(0);
    });
    
    app.listen(PORT, () => {
      console.log(`Analytics-Service is running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Unable to start the service:', error);
    process.exit(1);
  }
};

startServer();