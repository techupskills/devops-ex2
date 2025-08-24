const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'advanced_todo',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      multipleStatements: false
    };
  }

  async initialize() {
    try {
      logger.info('Initializing database connection pool...');
      
      // Create connection pool with retry logic
      this.pool = mysql.createPool(this.config);
      
      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      logger.info(`Database pool initialized successfully. Max connections: ${this.config.connectionLimit}`);
      
      // Setup connection event handlers
      this.pool.on('connection', (connection) => {
        logger.debug(`New connection established as id ${connection.threadId}`);
      });
      
      this.pool.on('error', (err) => {
        logger.error('Database pool error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          this.handleDisconnect();
        }
      });
      
      return this.pool;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  async handleDisconnect() {
    logger.warn('Database connection lost. Attempting to reconnect...');
    try {
      await this.initialize();
      logger.info('Database reconnection successful');
    } catch (error) {
      logger.error('Database reconnection failed:', error);
      setTimeout(() => this.handleDisconnect(), 5000);
    }
  }

  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const startTime = Date.now();
    let connection;
    
    try {
      connection = await this.pool.getConnection();
      const [results] = await connection.execute(sql, params);
      
      const duration = Date.now() - startTime;
      logger.debug(`Query executed in ${duration}ms: ${sql.substring(0, 100)}...`);
      
      return results;
    } catch (error) {
      logger.error('Database query error:', {
        sql: sql.substring(0, 200),
        params,
        error: error.message
      });
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async transaction(callback) {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('Transaction rolled back:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getConnectionStatus() {
    if (!this.pool) {
      return { status: 'disconnected', activeConnections: 0, totalConnections: 0 };
    }

    try {
      const connection = await this.pool.getConnection();
      const [result] = await connection.execute('SELECT CONNECTION_ID() as id');
      connection.release();
      
      return {
        status: 'connected',
        activeConnections: this.pool._allConnections.length,
        totalConnections: this.config.connectionLimit,
        lastConnectionId: result[0].id
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async close() {
    if (this.pool) {
      logger.info('Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
    }
  }
}

module.exports = new DatabaseManager();