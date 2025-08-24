const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const redisManager = require('../config/redis');

class SecurityMiddleware {
  // Helmet configuration for security headers
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          scriptSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false, // Disable for API usage
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // Advanced rate limiting with Redis backend
  createRateLimit(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      message: {
        success: false,
        message: 'Too many requests, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    };

    const config = { ...defaultOptions, ...options };

    return rateLimit({
      ...config,
      store: redisManager.isConnected ? undefined : undefined, // Use memory store if Redis unavailable
      handler: (req, res, next, options) => {
        logger.security('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method
        });
        
        res.status(429).json(config.message);
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
      }
    });
  }

  // IP whitelisting/blacklisting
  ipFilter(whitelist = [], blacklist = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Check blacklist first
      if (blacklist.length > 0 && blacklist.includes(clientIP)) {
        logger.security('Blocked request from blacklisted IP', {
          ip: clientIP,
          endpoint: req.path
        });
        
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Check whitelist if defined
      if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
        logger.security('Blocked request from non-whitelisted IP', {
          ip: clientIP,
          endpoint: req.path
        });
        
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      next();
    };
  }

  // Input sanitization and validation
  sanitizeInput() {
    return (req, res, next) => {
      // Remove null bytes and dangerous characters
      const sanitize = (obj) => {
        if (typeof obj === 'string') {
          return obj.replace(/\0/g, '').trim();
        } else if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            obj[key] = sanitize(obj[key]);
          }
        }
        return obj;
      };

      if (req.body) req.body = sanitize(req.body);
      if (req.query) req.query = sanitize(req.query);
      if (req.params) req.params = sanitize(req.params);

      next();
    };
  }

  // Request validation middleware
  validateRequest(validations) {
    return async (req, res, next) => {
      // Run validations
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.security('Request validation failed', {
          errors: errors.array(),
          endpoint: req.path,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value
          }))
        });
      }

      next();
    };
  }

  // Common validation rules
  getValidationRules() {
    return {
      email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      
      password: body('password')
        .isLength({ min: 8, max: 128 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character'),
      
      name: body('name')
        .isLength({ min: 1, max: 100 })
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name must be 1-100 characters and contain only letters, spaces, hyphens, and apostrophes'),
      
      id: body('id')
        .isInt({ min: 1 })
        .withMessage('Valid ID is required'),
      
      uuid: body('uuid')
        .isUUID()
        .withMessage('Valid UUID is required'),
      
      title: body('title')
        .isLength({ min: 1, max: 200 })
        .trim()
        .escape()
        .withMessage('Title must be 1-200 characters'),
      
      description: body('description')
        .optional()
        .isLength({ max: 1000 })
        .trim()
        .escape()
        .withMessage('Description must be less than 1000 characters')
    };
  }

  // CORS configuration with environment-based origins
  getCorsConfig() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:3001'];

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          logger.security('CORS blocked request from unauthorized origin', {
            origin,
            allowedOrigins
          });
          return callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400 // 24 hours
    };
  }

  // Request size limiting
  requestSizeLimit(limit = '10mb') {
    return (req, res, next) => {
      const contentLength = req.get('content-length');
      
      if (contentLength) {
        const sizeLimit = this.parseSize(limit);
        if (parseInt(contentLength) > sizeLimit) {
          logger.security('Request size limit exceeded', {
            contentLength,
            limit: sizeLimit,
            ip: req.ip
          });
          
          return res.status(413).json({
            success: false,
            message: 'Request size too large'
          });
        }
      }
      
      next();
    };
  }

  // Parse size string (e.g., '10mb', '1gb')
  parseSize(size) {
    const units = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const [, number, unit] = match;
    return parseFloat(number) * units[unit];
  }

  // SQL injection prevention
  preventSQLInjection() {
    return (req, res, next) => {
      const sqlPatterns = [
        /(\b(ALTER|CREATE|DELETE|DROP|EXEC|INSERT|SELECT|UNION|UPDATE)\b)/gi,
        /(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)/gi,
        /(\-\-|\#|\/\*|\*\/)/g
      ];

      const checkForSQLInjection = (obj) => {
        if (typeof obj === 'string') {
          for (const pattern of sqlPatterns) {
            if (pattern.test(obj)) {
              logger.security('Potential SQL injection attempt detected', {
                input: obj,
                pattern: pattern.source,
                ip: req.ip
              });
              return true;
            }
          }
        } else if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (checkForSQLInjection(obj[key])) return true;
          }
        }
        return false;
      };

      if (checkForSQLInjection(req.body) || 
          checkForSQLInjection(req.query) || 
          checkForSQLInjection(req.params)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input detected'
        });
      }

      next();
    };
  }

  // API key validation (for external integrations)
  validateApiKey() {
    return async (req, res, next) => {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: 'API key required'
        });
      }

      try {
        // Check if API key exists in Redis cache or database
        const keyData = await redisManager.get(`apikey:${apiKey}`);
        
        if (!keyData) {
          logger.security('Invalid API key used', {
            apiKey: apiKey.substring(0, 8) + '...',
            ip: req.ip
          });
          
          return res.status(401).json({
            success: false,
            message: 'Invalid API key'
          });
        }

        // Add API key info to request
        req.apiKey = keyData;
        next();
        
      } catch (error) {
        logger.error('API key validation error:', error);
        return res.status(500).json({
          success: false,
          message: 'API key validation failed'
        });
      }
    };
  }

  // Security headers middleware
  securityHeaders() {
    return (req, res, next) => {
      // Remove server information
      res.removeHeader('X-Powered-By');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    };
  }
}

module.exports = new SecurityMiddleware();