const winston = require('winston');
const path = require('path');

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Custom format for console output (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: 'advanced-todo-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    
    // Separate file for database operations
    new winston.transports.File({
      filename: path.join(logsDir, 'database.log'),
      level: 'debug',
      format: winston.format.combine(
        winston.format.label({ label: 'DATABASE' }),
        customFormat
      )
    }),
    
    // Security events log
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      format: winston.format.combine(
        winston.format.label({ label: 'SECURITY' }),
        customFormat
      )
    })
  ],
  
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Custom logging methods for specific contexts
logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, context: 'security' });
};

logger.database = (message, meta = {}) => {
  logger.debug(message, { ...meta, context: 'database' });
};

logger.auth = (message, meta = {}) => {
  logger.info(message, { ...meta, context: 'authentication' });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, context: 'api' });
};

logger.job = (message, meta = {}) => {
  logger.info(message, { ...meta, context: 'background-job' });
};

// Performance logging helper
logger.performance = (operation, duration, meta = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, `${operation} completed in ${duration}ms`, {
    ...meta,
    context: 'performance',
    duration
  });
};

// Request logging middleware helper
logger.createRequestLogger = () => {
  return (req, res, next) => {
    const start = Date.now();
    
    // Log request
    logger.api('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - start;
      
      logger.api('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id
      });
      
      // Log slow requests
      if (duration > 2000) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration,
          statusCode: res.statusCode
        });
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Error logging helper
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
    errorName: error.name
  });
};

// Cleanup function for graceful shutdown
logger.close = () => {
  return new Promise((resolve) => {
    logger.end(() => {
      resolve();
    });
  });
};

module.exports = logger;