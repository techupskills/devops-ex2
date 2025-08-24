const database = require('../config/database');
const logger = require('../utils/logger');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.first_name || data.firstName;
    this.lastName = data.last_name || data.lastName;
    this.role = data.role || 'user';
    this.permissions = data.permissions || [];
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.emailVerified = data.email_verified || false;
    this.lastLoginAt = data.last_login_at || data.lastLoginAt;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.profilePicture = data.profile_picture || data.profilePicture;
    this.phoneNumber = data.phone_number || data.phoneNumber;
    this.twoFactorEnabled = data.two_factor_enabled || false;
    this.preferences = data.preferences || {};
  }

  // Static method to create users table
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
        permissions JSON,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        phone_number VARCHAR(20),
        profile_picture VARCHAR(500),
        two_factor_enabled BOOLEAN DEFAULT false,
        two_factor_secret VARCHAR(100),
        preferences JSON,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await database.query(createTableSQL);
      logger.database('Users table created successfully');
    } catch (error) {
      logger.error('Failed to create users table:', error);
      throw error;
    }
  }

  // Create new user with validation
  static async create(userData) {
    const { email, password, firstName, lastName, role = 'user', permissions = [] } = userData;

    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const insertSQL = `
        INSERT INTO users (email, password, first_name, last_name, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await database.query(insertSQL, [
        email.toLowerCase(),
        password, // Should be pre-hashed
        firstName,
        lastName,
        role,
        JSON.stringify(permissions)
      ]);

      const userId = result.insertId;
      logger.database('User created successfully', { userId, email });

      // Return created user
      return await User.findById(userId);
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  // Find user by ID with caching
  static async findById(id) {
    if (!id) return null;

    try {
      const selectSQL = 'SELECT * FROM users WHERE id = ? AND is_active = true';
      const results = await database.query(selectSQL, [id]);

      if (results.length === 0) {
        return null;
      }

      const userData = results[0];
      userData.permissions = userData.permissions ? JSON.parse(userData.permissions) : [];
      userData.preferences = userData.preferences ? JSON.parse(userData.preferences) : {};

      return new User(userData);
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    if (!email) return null;

    try {
      const selectSQL = 'SELECT * FROM users WHERE email = ? AND is_active = true';
      const results = await database.query(selectSQL, [email.toLowerCase()]);

      if (results.length === 0) {
        return null;
      }

      const userData = results[0];
      userData.permissions = userData.permissions ? JSON.parse(userData.permissions) : [];
      userData.preferences = userData.preferences ? JSON.parse(userData.preferences) : {};

      return new User(userData);
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw error;
    }
  }

  // Get all users with pagination
  static async findAll(options = {}) {
    const { page = 1, limit = 10, role = null, search = null } = options;
    const offset = (page - 1) * limit;

    try {
      let whereClause = 'WHERE is_active = true';
      const params = [];

      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }

      if (search) {
        whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Get total count
      const countSQL = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const countResult = await database.query(countSQL, params);
      const total = countResult[0].total;

      // Get users
      const selectSQL = `
        SELECT * FROM users ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      const results = await database.query(selectSQL, params);
      const users = results.map(userData => {
        userData.permissions = userData.permissions ? JSON.parse(userData.permissions) : [];
        userData.preferences = userData.preferences ? JSON.parse(userData.preferences) : {};
        return new User(userData);
      });

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to find all users:', error);
      throw error;
    }
  }

  // Update user
  async update(updateData) {
    try {
      const allowedFields = [
        'first_name', 'last_name', 'role', 'permissions', 'is_active',
        'email_verified', 'phone_number', 'profile_picture', 'two_factor_enabled',
        'preferences'
      ];

      const updateFields = [];
      const params = [];

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          
          // Handle JSON fields
          if (['permissions', 'preferences'].includes(dbField)) {
            params.push(JSON.stringify(updateData[key]));
          } else {
            params.push(updateData[key]);
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const updateSQL = `
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params.push(this.id);

      await database.query(updateSQL, params);
      logger.database('User updated successfully', { userId: this.id });

      // Update current instance
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  // Update password with security logging
  async updatePassword(newHashedPassword) {
    try {
      const updateSQL = `
        UPDATE users 
        SET password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await database.query(updateSQL, [newHashedPassword, this.id]);
      
      logger.security('Password updated', { 
        userId: this.id, 
        email: this.email 
      });

      return this;
    } catch (error) {
      logger.error('Failed to update password:', error);
      throw error;
    }
  }

  // Update last login timestamp
  async updateLastLogin() {
    try {
      const updateSQL = `
        UPDATE users 
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await database.query(updateSQL, [this.id]);
      this.lastLoginAt = new Date();
      
      logger.auth('Last login updated', { userId: this.id });
      return this;
    } catch (error) {
      logger.error('Failed to update last login:', error);
      throw error;
    }
  }

  // Soft delete user
  async deactivate() {
    try {
      const updateSQL = `
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await database.query(updateSQL, [this.id]);
      this.isActive = false;
      
      logger.security('User deactivated', { 
        userId: this.id, 
        email: this.email 
      });

      return this;
    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      throw error;
    }
  }

  // Reactivate user
  async activate() {
    try {
      const updateSQL = `
        UPDATE users 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await database.query(updateSQL, [this.id]);
      this.isActive = true;
      
      logger.security('User activated', { 
        userId: this.id, 
        email: this.email 
      });

      return this;
    } catch (error) {
      logger.error('Failed to activate user:', error);
      throw error;
    }
  }

  // Check if user has specific permission
  hasPermission(permission) {
    if (this.role === 'admin') return true;
    return this.permissions.includes(permission);
  }

  // Get user's todos count
  async getTodosCount() {
    try {
      const countSQL = 'SELECT COUNT(*) as total FROM todos WHERE user_id = ?';
      const result = await database.query(countSQL, [this.id]);
      return result[0].total;
    } catch (error) {
      logger.error('Failed to get todos count:', error);
      return 0;
    }
  }

  // Get user profile data (excluding sensitive information)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      permissions: this.permissions,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      phoneNumber: this.phoneNumber,
      profilePicture: this.profilePicture,
      twoFactorEnabled: this.twoFactorEnabled,
      preferences: this.preferences,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Get safe user data for JWT token
  getTokenData() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      permissions: this.permissions
    };
  }
}

module.exports = { User };