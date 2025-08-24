require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

// Import configurations and utilities
const database = require('./config/database');
const redisManager = require('./config/redis');
const logger = require('./utils/logger');
const securityMiddleware = require('./middleware/security');
const jobProcessor = require('./services/jobProcessor');

// Import routes
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');

// Import models for table creation
const { User } = require('./models/User');
const { Todo } = require('./models/Todo');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      logger.info('🚀 Starting Advanced Todo API Server...');
      
      // Initialize database
      await database.initialize();
      
      // Initialize Redis (optional - continue without if fails)
      try {
        await redisManager.initialize();
      } catch (error) {
        logger.warn('Redis initialization failed, continuing without caching:', error.message);
      }
      
      // Initialize job processor (requires Redis)
      if (redisManager.isConnected) {
        try {
          await jobProcessor.initialize();
          await jobProcessor.scheduleRecurringJobs();
        } catch (error) {
          logger.warn('Job processor initialization failed:', error.message);
        }
      }
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Create database tables
      await this.createTables();
      
      logger.info('✅ Server initialization completed');
      
    } catch (error) {
      logger.error('❌ Server initialization failed:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Trust proxy (for accurate IP addresses behind load balancers)
    this.app.set('trust proxy', 1);
    
    // Security middleware
    this.app.use(securityMiddleware.getHelmetConfig());
    this.app.use(securityMiddleware.securityHeaders());
    this.app.use(securityMiddleware.sanitizeInput());
    this.app.use(securityMiddleware.preventSQLInjection());
    
    // CORS configuration
    this.app.use(cors(securityMiddleware.getCorsConfig()));
    
    // Compression middleware
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
      level: 6
    }));
    
    // Request parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));
    
    // Request logging middleware
    this.app.use(logger.createRequestLogger());
    
    // Global rate limiting
    const globalRateLimit = securityMiddleware.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per window per IP
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later'
      }
    });
    this.app.use(globalRateLimit);
  }

  setupRoutes() {
    // Health check endpoint (no auth required)
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          services: {
            database: 'unknown',
            redis: 'unknown',
            jobProcessor: 'unknown'
          }
        };

        // Check database status
        try {
          const dbStatus = await database.getConnectionStatus();
          health.services.database = dbStatus.status;
        } catch (error) {
          health.services.database = 'error';
          health.status = 'degraded';
        }

        // Check Redis status
        try {
          const redisInfo = await redisManager.getConnectionInfo();
          health.services.redis = redisInfo.status;
        } catch (error) {
          health.services.redis = 'disconnected';
        }

        // Check job processor status
        if (jobProcessor.isInitialized) {
          try {
            const queueStats = await jobProcessor.getQueueStats();
            health.services.jobProcessor = 'active';
            health.queueStats = queueStats;
          } catch (error) {
            health.services.jobProcessor = 'error';
          }
        } else {
          health.services.jobProcessor = 'inactive';
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

      } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Advanced Todo API',
        version: '1.0.0',
        description: 'Sophisticated todo API with JWT authentication, database pooling, and async processing',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          todos: '/api/todos',
          health: '/health'
        },
        features: [
          'JWT Authentication with refresh tokens',
          'MySQL connection pooling',
          'Redis caching and session management',
          'Background job processing with Bull queue',
          'Comprehensive input validation and sanitization',
          'Advanced security middleware',
          'Structured logging with Winston',
          'Rate limiting and CORS protection',
          'Full-text search capabilities',
          'Real-time analytics tracking'
        ]
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/todos', todoRoutes);

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      logger.warn('404 - Route not found', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(404).json({
        success: false,
        message: 'Route not found',
        availableEndpoints: {
          auth: '/api/auth',
          todos: '/api/todos',
          health: '/health',
          info: '/api'
        }
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      // Don't log 4xx client errors as server errors
      if (error.status && error.status < 500) {
        logger.warn('Client error', {
          status: error.status,
          message: error.message,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });
      } else {
        logger.error('Server error', {
          error: error.message,
          stack: error.stack,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          body: req.body
        });
      }

      // Don't send error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(isDevelopment && { 
          stack: error.stack,
          details: error.details 
        })
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason.stack || reason
      });
      
      // Don't exit immediately, allow graceful shutdown
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      
      // Exit immediately for uncaught exceptions
      process.exit(1);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown('SIGINT');
    });
  }

  async createTables() {
    try {
      logger.info('Creating database tables...');
      
      await User.createTable();
      await Todo.createTable();
      
      logger.info('✅ Database tables created successfully');
    } catch (error) {
      logger.error('Failed to create database tables:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.initialize();
      
      this.server = this.app.listen(this.port, () => {
        logger.info(`🌐 Server running on port ${this.port}`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          pid: process.pid
        });
        
        // Log available endpoints
        logger.info('📍 Available endpoints:', {
          health: `http://localhost:${this.port}/health`,
          api: `http://localhost:${this.port}/api`,
          auth: `http://localhost:${this.port}/api/auth`,
          todos: `http://localhost:${this.port}/api/todos`
        });
      });

      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info(`Graceful shutdown initiated by ${signal}`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close job processor
      if (jobProcessor.isInitialized) {
        await jobProcessor.shutdown();
      }

      // Close Redis connections
      await redisManager.close();

      // Close database connections
      await database.close();

      // Close logger
      await logger.close();

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = Server;