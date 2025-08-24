const redis = require('redis');
const logger = require('../utils/logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
    
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Redis connection...');
      
      // Create main client
      this.client = redis.createClient(this.config);
      
      // Setup event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });
      
      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });
      
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });
      
      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });
      
      this.client.on('reconnecting', (delay, attempt) => {
        logger.info(`Redis reconnecting... Attempt ${attempt}, delay: ${delay}ms`);
      });
      
      // Connect to Redis
      await this.client.connect();
      
      // Create pub/sub clients for async operations
      this.subscriber = this.client.duplicate();
      this.publisher = this.client.duplicate();
      
      await this.subscriber.connect();
      await this.publisher.connect();
      
      logger.info('Redis connection established successfully');
      return this.client;
      
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw new Error(`Redis initialization failed: ${error.message}`);
    }
  }

  // Cache operations with error handling
  async set(key, value, expireInSeconds = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }
      
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, expireInSeconds, serializedValue);
      logger.debug(`Cache set: ${key} (expires in ${expireInSeconds}s)`);
      return true;
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, cache miss');
        return null;
      }
      
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) return false;
      return await this.client.exists(key) === 1;
    } catch (error) {
      logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  // Session management
  async setSession(sessionId, data, expireInSeconds = 86400) {
    return this.set(`session:${sessionId}`, data, expireInSeconds);
  }

  async getSession(sessionId) {
    return this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return this.del(`session:${sessionId}`);
  }

  // Rate limiting support
  async incrementRateLimit(key, windowInSeconds = 900) {
    try {
      if (!this.isConnected) return 0;
      
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, windowInSeconds);
      const results = await multi.exec();
      
      return results[0];
    } catch (error) {
      logger.error(`Rate limit increment failed for ${key}:`, error);
      return 0;
    }
  }

  // Pub/Sub for job notifications
  async publish(channel, message) {
    try {
      if (!this.isConnected) return false;
      
      await this.publisher.publish(channel, JSON.stringify(message));
      logger.debug(`Published message to channel ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Failed to publish to channel ${channel}:`, error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.isConnected) return false;
      
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error(`Failed to parse message from channel ${channel}:`, error);
        }
      });
      
      logger.info(`Subscribed to channel: ${channel}`);
      return true;
    } catch (error) {
      logger.error(`Failed to subscribe to channel ${channel}:`, error);
      return false;
    }
  }

  async getConnectionInfo() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }
      
      const info = await this.client.info();
      return {
        status: 'connected',
        info: info,
        config: this.config
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('Redis client disconnected');
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }
}

module.exports = new RedisManager();