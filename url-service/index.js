// url-service/index.js
const express = require('express');
const { createClient } = require('redis');
const { nanoid } = require('nanoid');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const QRCode = require('qrcode');

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
  longUrl: Joi.string().uri().required(),
  customCode: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(20).optional()
});

const shortCodeSchema = Joi.object({
  shortCode: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(20).required()
});

const qrCodeSchema = Joi.object({
  shortCode: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(20).required(),
  size: Joi.number().integer().min(100).max(1000).default(200),
  format: Joi.string().valid('png', 'svg').default('png'),
  errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').default('M'),
  // Handle color parameters as individual query params
  'color[dark]': Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  'color[light]': Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF'),
  margin: Joi.number().integer().min(0).max(10).default(4)
}).unknown(true); // Allow unknown parameters to be ignored

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

// Generate QR Code for URL
app.get('/api/v1/qr/:shortCode', asyncHandler(async (req, res) => {
  // Validate input
  const { error: paramError, value: paramValue } = shortCodeSchema.validate(req.params);
  if (paramError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: paramError.details.map(detail => detail.message)
    });
  }

  // Validate query parameters for QR customization
  const { error: queryError, value: queryValue } = qrCodeSchema.validate({
    shortCode: paramValue.shortCode,
    ...req.query
  });
  if (queryError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: queryError.details.map(detail => detail.message)
    });
  }

  const { 
    shortCode, 
    size, 
    format, 
    errorCorrectionLevel, 
    margin,
    'color[dark]': colorDark,
    'color[light]': colorLight
  } = queryValue;
  
  // Reconstruct color object
  const color = {
    dark: colorDark || '#000000',
    light: colorLight || '#FFFFFF'
  };

  // Check if Redis is connected
  if (!redisClient.isReady) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Cache service is not available'
    });
  }

  // Check if short code exists
  const longUrl = await redisClient.get(shortCode);
  if (!longUrl) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found'
    });
  }

  const shortUrl = BASE_URL + shortCode;

  try {
    // QR Code options
    const qrOptions = {
      errorCorrectionLevel: errorCorrectionLevel,
      type: format === 'png' ? 'image/png' : 'svg',
      quality: 0.92,
      margin: margin,
      color: {
        dark: color.dark,
        light: color.light
      },
      width: size
    };

    if (format === 'svg') {
      // Generate SVG QR code
      const qrSvg = await QRCode.toString(shortUrl, {
        ...qrOptions,
        type: 'svg'
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `inline; filename="qr-${shortCode}.svg"`);
      res.send(qrSvg);
    } else {
      // Generate PNG QR code
      const qrBuffer = await QRCode.toBuffer(shortUrl, qrOptions);
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-${shortCode}.png"`);
      res.send(qrBuffer);
    }

    // Track QR code generation (optional analytics)
    console.log(`QR code generated for ${shortCode} (${format}, ${size}x${size})`);
    
  } catch (error) {
    console.error('QR Code generation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QR code'
    });
  }
}));

// Get QR Code data URL (for embedding in frontend)
app.get('/api/v1/qr-data/:shortCode', asyncHandler(async (req, res) => {
  // Validate input
  const { error: paramError, value: paramValue } = shortCodeSchema.validate(req.params);
  if (paramError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: paramError.details.map(detail => detail.message)
    });
  }

  // Validate query parameters
  const { error: queryError, value: queryValue } = qrCodeSchema.validate({
    shortCode: paramValue.shortCode,
    ...req.query
  });
  if (queryError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: queryError.details.map(detail => detail.message)
    });
  }

  const { 
    shortCode, 
    size, 
    errorCorrectionLevel, 
    margin,
    'color[dark]': colorDark,
    'color[light]': colorLight
  } = queryValue;
  
  // Reconstruct color object
  const color = {
    dark: colorDark || '#000000',
    light: colorLight || '#FFFFFF'
  };

  // Check if Redis is connected
  if (!redisClient.isReady) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Cache service is not available'
    });
  }

  // Check if short code exists
  const longUrl = await redisClient.get(shortCode);
  if (!longUrl) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Short URL not found'
    });
  }

  const shortUrl = BASE_URL + shortCode;

  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(shortUrl, {
      errorCorrectionLevel: errorCorrectionLevel,
      margin: margin,
      color: {
        dark: color.dark,
        light: color.light
      },
      width: size
    });

    res.status(200).json({
      shortCode: shortCode,
      shortUrl: shortUrl,
      longUrl: longUrl,
      qrCode: {
        dataUrl: qrDataUrl,
        size: size,
        format: 'png',
        errorCorrectionLevel: errorCorrectionLevel,
        color: color,
        margin: margin
      },
      downloadUrls: {
        png: `/api/v1/qr/${shortCode}?size=${size}&format=png&errorCorrectionLevel=${errorCorrectionLevel}&margin=${margin}`,
        svg: `/api/v1/qr/${shortCode}?size=${size}&format=svg&errorCorrectionLevel=${errorCorrectionLevel}&margin=${margin}`
      }
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QR code data'
    });
  }
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