const express = require('express');
const { body } = require('express-validator');
const authManager = require('../middleware/auth');
const securityMiddleware = require('../middleware/security');
const logger = require('../utils/logger');
const { User } = require('../models/User');
const jobProcessor = require('../services/jobProcessor');

const router = express.Router();

// Validation rules
const validationRules = securityMiddleware.getValidationRules();

// Rate limiting for auth endpoints
const authRateLimit = authManager.createAuthRateLimit();

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register', 
  authRateLimit,
  securityMiddleware.validateRequest([
    validationRules.email,
    validationRules.password,
    body('firstName').isLength({ min: 1, max: 50 }).trim().escape(),
    body('lastName').isLength({ min: 1, max: 50 }).trim().escape()
  ]),
  async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        logger.security('Registration attempt with existing email', {
          email: email.substring(0, 3) + '***',
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await authManager.hashPassword(password);
      
      // Create user
      const userData = {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'user',
        permissions: ['read:todos', 'write:todos', 'delete:todos']
      };
      
      const user = await User.create(userData);
      
      // Generate JWT tokens
      const tokens = authManager.generateTokens(user);
      
      // Create session
      const sessionId = await authManager.createSession(user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Add welcome email job
      await jobProcessor.addEmailJob('welcome-email', {
        userId: user.id,
        email: user.email,
        firstName: user.firstName
      });
      
      // Add analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: user.id,
        action: 'user_registered',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });
      
      logger.auth('User registered successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          tokens,
          sessionId
        }
      });
      
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login',
  authRateLimit,
  securityMiddleware.validateRequest([
    validationRules.email,
    body('password').notEmpty().withMessage('Password is required')
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        logger.security('Login attempt with non-existent email', {
          email: email.substring(0, 3) + '***',
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Verify password
      const isPasswordValid = await authManager.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        logger.security('Login attempt with invalid password', {
          userId: user.id,
          email: user.email.substring(0, 3) + '***',
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        logger.security('Login attempt with inactive account', {
          userId: user.id,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }
      
      // Update last login
      await user.updateLastLogin();
      
      // Generate tokens
      const tokens = authManager.generateTokens(user);
      
      // Create session
      const sessionId = await authManager.createSession(user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Add analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: user.id,
        action: 'user_login',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });
      
      logger.auth('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          tokens,
          sessionId
        }
      });
      
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh',
  securityMiddleware.validateRequest([
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ]),
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      // Refresh access token
      const { accessToken } = await authManager.refreshAccessToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken }
      });
      
    } catch (error) {
      logger.security('Token refresh failed', {
        error: error.message,
        ip: req.ip
      });
      
      res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user and blacklist token
 * @access Private
 */
router.post('/logout',
  authManager.authenticate(),
  async (req, res) => {
    try {
      // Blacklist current token
      await authManager.blacklistToken(req.token);
      
      // Destroy session if provided
      if (req.body.sessionId) {
        await authManager.destroySession(req.body.sessionId);
      }
      
      // Add analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'user_logout',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });
      
      logger.auth('User logged out successfully', {
        userId: req.user.id,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
      
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
router.post('/forgot-password',
  authRateLimit,
  securityMiddleware.validateRequest([
    validationRules.email
  ]),
  async (req, res) => {
    try {
      const { email } = req.body;
      
      // Find user (don't reveal if user exists or not)
      const user = await User.findByEmail(email);
      
      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link will be sent.'
      });
      
      if (user) {
        // Generate reset token (in real app, store this in database with expiry)
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        
        // Add password reset email job
        await jobProcessor.addEmailJob('password-reset', {
          userId: user.id,
          email: user.email,
          resetToken,
          firstName: user.firstName
        });
        
        logger.security('Password reset requested', {
          userId: user.id,
          email: user.email.substring(0, 3) + '***',
          ip: req.ip
        });
      } else {
        logger.security('Password reset requested for non-existent email', {
          email: email.substring(0, 3) + '***',
          ip: req.ip
        });
      }
      
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset request failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password',
  authRateLimit,
  securityMiddleware.validateRequest([
    body('token').isLength({ min: 32, max: 128 }).withMessage('Invalid reset token'),
    validationRules.password
  ]),
  async (req, res) => {
    try {
      const { token, password } = req.body;
      
      // In a real implementation, validate token from database
      // For demo purposes, we'll simulate token validation
      
      // Hash new password
      const hashedPassword = await authManager.hashPassword(password);
      
      // In real implementation, find user by token and update password
      // await user.updatePassword(hashedPassword);
      
      logger.security('Password reset completed', {
        ip: req.ip,
        token: token.substring(0, 8) + '...'
      });
      
      res.json({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
      
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed'
      });
    }
  }
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me',
  authManager.authenticate(),
  async (req, res) => {
    try {
      // Get fresh user data
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get additional user statistics
      const todosCount = await user.getTodosCount();
      
      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          statistics: {
            todosCount
          }
        }
      });
      
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  }
);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile',
  authManager.authenticate(),
  securityMiddleware.validateRequest([
    body('firstName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
    body('lastName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
    body('phoneNumber').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object')
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const allowedUpdates = ['firstName', 'lastName', 'phoneNumber', 'preferences'];
      const updateData = {};
      
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      const updatedUser = await user.update(updateData);
      
      logger.auth('Profile updated successfully', {
        userId: user.id,
        updatedFields: Object.keys(updateData)
      });
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.toJSON()
        }
      });
      
    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Profile update failed'
      });
    }
  }
);

/**
 * @route PUT /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.put('/change-password',
  authManager.authenticate(),
  securityMiddleware.validateRequest([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    validationRules.password.withMessage('New password must meet security requirements')
  ]),
  async (req, res) => {
    try {
      const { currentPassword, password: newPassword } = req.body;
      
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await authManager.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        logger.security('Password change attempt with invalid current password', {
          userId: user.id,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const hashedNewPassword = await authManager.hashPassword(newPassword);
      
      // Update password
      await user.updatePassword(hashedNewPassword);
      
      logger.security('Password changed successfully', {
        userId: user.id,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      logger.error('Password change error:', error);
      res.status(500).json({
        success: false,
        message: 'Password change failed'
      });
    }
  }
);

/**
 * @route GET /api/auth/sessions
 * @desc Get user active sessions
 * @access Private
 */
router.get('/sessions',
  authManager.authenticate(),
  async (req, res) => {
    try {
      // In a real implementation, get user sessions from Redis/database
      // For demo purposes, return mock data
      
      const sessions = [
        {
          id: 'session_1',
          deviceInfo: {
            ip: req.ip,
            userAgent: req.get('User-Agent')
          },
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          current: true
        }
      ];
      
      res.json({
        success: true,
        data: { sessions }
      });
      
    } catch (error) {
      logger.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions'
      });
    }
  }
);

module.exports = router;