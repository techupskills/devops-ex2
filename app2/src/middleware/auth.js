const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const redisManager = require('../config/redis');
const { User } = require('../models/User');

class AuthenticationManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  // JWT token generation with enhanced security
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    };

    // Access token (short-lived)
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
      issuer: 'advanced-todo-api',
      audience: 'todo-clients'
    });

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      this.jwtRefreshSecret,
      {
        expiresIn: this.jwtExpiresIn,
        issuer: 'advanced-todo-api',
        audience: 'todo-clients'
      }
    );

    logger.auth('Tokens generated successfully', { 
      userId: user.id, 
      email: user.email 
    });

    return { accessToken, refreshToken };
  }

  // Verify JWT token with comprehensive error handling
  async verifyToken(token, secret = this.jwtSecret) {
    try {
      const decoded = jwt.verify(token, secret);
      
      // Check if token is blacklisted (for logout)
      const isBlacklisted = await redisManager.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }
      
      return decoded;
    } catch (error) {
      logger.security('Token verification failed', {
        error: error.message,
        token: token?.substring(0, 20) + '...'
      });
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  // Middleware: Verify authentication
  authenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Access token required'
          });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = await this.verifyToken(token);
        
        // Fetch fresh user data for permission checks
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          logger.security('Authentication failed - inactive user', {
            userId: decoded.userId
          });
          return res.status(401).json({
            success: false,
            message: 'User account is not active'
          });
        }

        // Add user info to request
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || []
        };
        
        req.token = token;
        
        logger.auth('User authenticated successfully', {
          userId: user.id,
          endpoint: req.path
        });
        
        next();
      } catch (error) {
        logger.security('Authentication middleware error', {
          error: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({
          success: false,
          message: error.message || 'Authentication failed'
        });
      }
    };
  }

  // Middleware: Check user permissions
  authorize(requiredPermissions = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Super admin bypasses all permission checks
        if (req.user.role === 'admin') {
          return next();
        }

        // Check if user has required permissions
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          logger.security('Authorization failed - insufficient permissions', {
            userId: req.user.id,
            required: requiredPermissions,
            user: userPermissions
          });
          
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }

        logger.auth('User authorized successfully', {
          userId: req.user.id,
          permissions: requiredPermissions
        });

        next();
      } catch (error) {
        logger.error('Authorization middleware error:', error);
        return res.status(500).json({
          success: false,
          message: 'Authorization check failed'
        });
      }
    };
  }

  // Password hashing with configurable rounds
  async hashPassword(password) {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  // Password verification with timing attack protection
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      
      logger.debug('Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  // Refresh token handling
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = await this.verifyToken(refreshToken, this.jwtRefreshSecret);
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }

      // Fetch user data
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const { accessToken } = this.generateTokens(user);
      
      logger.auth('Access token refreshed', { userId: user.id });
      
      return { accessToken };
    } catch (error) {
      logger.security('Token refresh failed', {
        error: error.message,
        token: refreshToken?.substring(0, 20) + '...'
      });
      throw error;
    }
  }

  // Token blacklisting for logout
  async blacklistToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisManager.set(`blacklist:${token}`, true, ttl);
          logger.auth('Token blacklisted successfully');
        }
      }
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
    }
  }

  // Rate limiting for authentication endpoints
  createAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.security('Rate limit exceeded for authentication', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({
          success: false,
          message: 'Too many authentication attempts, please try again later'
        });
      }
    });
  }

  // Optional: Two-factor authentication setup
  async setupTwoFactor(userId) {
    // Implementation would depend on 2FA provider (Google Authenticator, SMS, etc.)
    logger.info('Two-factor authentication setup initiated', { userId });
    // Return setup details for client to display QR code or send SMS
  }

  // Session management helpers
  async createSession(userId, deviceInfo = {}) {
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const sessionData = {
      userId,
      deviceInfo,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    await redisManager.setSession(sessionId, sessionData, 86400); // 24 hours
    logger.auth('Session created', { userId, sessionId });
    
    return sessionId;
  }

  async validateSession(sessionId) {
    const session = await redisManager.getSession(sessionId);
    if (session) {
      // Update last accessed time
      session.lastAccessed = new Date().toISOString();
      await redisManager.setSession(sessionId, session, 86400);
    }
    return session;
  }

  async destroySession(sessionId) {
    await redisManager.deleteSession(sessionId);
    logger.auth('Session destroyed', { sessionId });
  }
}

module.exports = new AuthenticationManager();