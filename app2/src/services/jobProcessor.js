const Queue = require('bull');
const logger = require('../utils/logger');
const redisManager = require('../config/redis');
const { User } = require('../models/User');
const { Todo } = require('../models/Todo');

class JobProcessor {
  constructor() {
    this.queues = {};
    this.isInitialized = false;
    this.retryOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    };
  }

  async initialize() {
    try {
      if (!redisManager.isConnected) {
        throw new Error('Redis connection required for job processing');
      }

      logger.info('Initializing job processor...');

      // Create different queues for different job types
      this.queues.email = new Queue('email notifications', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined
        },
        defaultJobOptions: {
          removeOnComplete: 50, // Keep last 50 completed jobs
          removeOnFail: 100,    // Keep last 100 failed jobs
          ...this.retryOptions
        }
      });

      this.queues.notifications = new Queue('push notifications', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined
        },
        defaultJobOptions: {
          removeOnComplete: 30,
          removeOnFail: 50,
          ...this.retryOptions
        }
      });

      this.queues.analytics = new Queue('analytics processing', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined
        },
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 30,
          delay: 30000, // 30 second delay for analytics
          ...this.retryOptions
        }
      });

      this.queues.maintenance = new Queue('maintenance tasks', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
          ...this.retryOptions
        }
      });

      // Setup job processors
      this.setupEmailProcessor();
      this.setupNotificationProcessor();
      this.setupAnalyticsProcessor();
      this.setupMaintenanceProcessor();

      // Setup queue event handlers
      this.setupQueueEventHandlers();

      this.isInitialized = true;
      logger.info('Job processor initialized successfully');
      
      return this;
    } catch (error) {
      logger.error('Failed to initialize job processor:', error);
      throw error;
    }
  }

  // Email notification processor
  setupEmailProcessor() {
    this.queues.email.process('welcome-email', async (job) => {
      const { userId, email, firstName } = job.data;
      
      try {
        logger.job('Processing welcome email', { userId, email });
        
        // Simulate email sending (replace with actual email service)
        await this.simulateEmailSending({
          to: email,
          subject: 'Welcome to Advanced Todo App!',
          template: 'welcome',
          data: { firstName }
        });

        // Update job progress
        job.progress(100);
        
        logger.job('Welcome email sent successfully', { userId, email });
        return { success: true, emailType: 'welcome' };
      } catch (error) {
        logger.error('Failed to send welcome email:', error);
        throw error;
      }
    });

    this.queues.email.process('todo-reminder', async (job) => {
      const { userId, todoId, email, todoTitle, dueDate } = job.data;
      
      try {
        logger.job('Processing todo reminder email', { userId, todoId });
        
        await this.simulateEmailSending({
          to: email,
          subject: `Reminder: ${todoTitle} is due soon`,
          template: 'todo-reminder',
          data: { todoTitle, dueDate }
        });

        job.progress(100);
        
        logger.job('Todo reminder email sent successfully', { userId, todoId });
        return { success: true, emailType: 'todo-reminder' };
      } catch (error) {
        logger.error('Failed to send todo reminder email:', error);
        throw error;
      }
    });

    this.queues.email.process('password-reset', async (job) => {
      const { userId, email, resetToken, firstName } = job.data;
      
      try {
        logger.job('Processing password reset email', { userId, email });
        
        await this.simulateEmailSending({
          to: email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          data: { firstName, resetToken, resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}` }
        });

        job.progress(100);
        
        logger.job('Password reset email sent successfully', { userId, email });
        return { success: true, emailType: 'password-reset' };
      } catch (error) {
        logger.error('Failed to send password reset email:', error);
        throw error;
      }
    });
  }

  // Push notification processor
  setupNotificationProcessor() {
    this.queues.notifications.process('todo-due-soon', async (job) => {
      const { userId, todoId, todoTitle, dueDate } = job.data;
      
      try {
        logger.job('Processing due soon notification', { userId, todoId });
        
        // Simulate push notification (replace with actual service like FCM)
        await this.simulatePushNotification({
          userId,
          title: 'Todo Due Soon',
          body: `"${todoTitle}" is due at ${new Date(dueDate).toLocaleString()}`,
          data: { todoId, type: 'due-soon' }
        });

        job.progress(100);
        
        logger.job('Due soon notification sent successfully', { userId, todoId });
        return { success: true, notificationType: 'due-soon' };
      } catch (error) {
        logger.error('Failed to send due soon notification:', error);
        throw error;
      }
    });

    this.queues.notifications.process('daily-summary', async (job) => {
      const { userId } = job.data;
      
      try {
        logger.job('Processing daily summary notification', { userId });
        
        // Get user's todo statistics
        const stats = await Todo.getStatistics(userId);
        const overdueTodos = await Todo.getOverdueTodos(userId);
        
        await this.simulatePushNotification({
          userId,
          title: 'Daily Todo Summary',
          body: `You have ${stats.pending} pending todos${overdueTodos.length > 0 ? ` and ${overdueTodos.length} overdue` : ''}`,
          data: { type: 'daily-summary', stats }
        });

        job.progress(100);
        
        logger.job('Daily summary notification sent successfully', { userId });
        return { success: true, notificationType: 'daily-summary' };
      } catch (error) {
        logger.error('Failed to send daily summary notification:', error);
        throw error;
      }
    });
  }

  // Analytics processor for usage tracking
  setupAnalyticsProcessor() {
    this.queues.analytics.process('user-activity', async (job) => {
      const { userId, action, metadata } = job.data;
      
      try {
        logger.job('Processing user activity analytics', { userId, action });
        
        // Store activity data (could be to database, analytics service, etc.)
        const analyticsData = {
          userId,
          action,
          metadata,
          timestamp: new Date().toISOString(),
          ip: metadata.ip,
          userAgent: metadata.userAgent
        };
        
        // Simulate analytics storage
        await this.storeAnalyticsData(analyticsData);
        
        job.progress(100);
        
        logger.job('User activity analytics processed', { userId, action });
        return { success: true, analyticsType: 'user-activity' };
      } catch (error) {
        logger.error('Failed to process user activity analytics:', error);
        throw error;
      }
    });

    this.queues.analytics.process('todo-completion-stats', async (job) => {
      const { userId, todoId, completionTime } = job.data;
      
      try {
        logger.job('Processing todo completion stats', { userId, todoId });
        
        const statsData = {
          userId,
          todoId,
          completionTime,
          timestamp: new Date().toISOString()
        };
        
        await this.storeAnalyticsData(statsData, 'todo-completion');
        
        job.progress(100);
        
        logger.job('Todo completion stats processed', { userId, todoId });
        return { success: true, analyticsType: 'todo-completion' };
      } catch (error) {
        logger.error('Failed to process todo completion stats:', error);
        throw error;
      }
    });
  }

  // Maintenance tasks processor
  setupMaintenanceProcessor() {
    this.queues.maintenance.process('cleanup-old-logs', async (job) => {
      try {
        logger.job('Processing log cleanup task');
        
        // Simulate log cleanup (would delete old log files)
        const daysToKeep = job.data.daysToKeep || 30;
        const deletedLogs = await this.simulateLogCleanup(daysToKeep);
        
        job.progress(100);
        
        logger.job('Log cleanup completed', { deletedLogs, daysToKeep });
        return { success: true, deletedLogs };
      } catch (error) {
        logger.error('Failed to cleanup logs:', error);
        throw error;
      }
    });

    this.queues.maintenance.process('database-optimization', async (job) => {
      try {
        logger.job('Processing database optimization task');
        
        // Simulate database optimization
        await this.simulateDatabaseOptimization();
        
        job.progress(100);
        
        logger.job('Database optimization completed');
        return { success: true };
      } catch (error) {
        logger.error('Failed to optimize database:', error);
        throw error;
      }
    });

    this.queues.maintenance.process('send-overdue-reminders', async (job) => {
      try {
        logger.job('Processing overdue reminders task');
        
        const overdueTodos = await Todo.getOverdueTodos();
        let remindersSent = 0;
        
        for (const todo of overdueTodos) {
          const user = await User.findById(todo.userId);
          if (user) {
            await this.addEmailJob('todo-reminder', {
              userId: user.id,
              todoId: todo.id,
              email: user.email,
              todoTitle: todo.title,
              dueDate: todo.dueDate
            });
            remindersSent++;
          }
        }
        
        job.progress(100);
        
        logger.job('Overdue reminders task completed', { remindersSent });
        return { success: true, remindersSent };
      } catch (error) {
        logger.error('Failed to send overdue reminders:', error);
        throw error;
      }
    });
  }

  // Setup event handlers for all queues
  setupQueueEventHandlers() {
    Object.entries(this.queues).forEach(([queueName, queue]) => {
      queue.on('completed', (job, result) => {
        logger.job(`Job completed in ${queueName} queue`, {
          jobId: job.id,
          jobType: job.name,
          processingTime: Date.now() - job.timestamp,
          result
        });
      });

      queue.on('failed', (job, error) => {
        logger.error(`Job failed in ${queueName} queue`, {
          jobId: job.id,
          jobType: job.name,
          error: error.message,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled in ${queueName} queue`, {
          jobId: job.id,
          jobType: job.name
        });
      });

      queue.on('progress', (job, progress) => {
        logger.debug(`Job progress in ${queueName} queue`, {
          jobId: job.id,
          jobType: job.name,
          progress: `${progress}%`
        });
      });
    });
  }

  // Public methods to add jobs to queues
  async addEmailJob(jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job processor not initialized');
    }

    try {
      const job = await this.queues.email.add(jobType, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.job('Email job added to queue', {
        jobId: job.id,
        jobType,
        data: { ...data, email: data.email ? `${data.email.substring(0, 3)}***` : 'N/A' }
      });

      return job;
    } catch (error) {
      logger.error('Failed to add email job to queue:', error);
      throw error;
    }
  }

  async addNotificationJob(jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job processor not initialized');
    }

    try {
      const job = await this.queues.notifications.add(jobType, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.job('Notification job added to queue', {
        jobId: job.id,
        jobType,
        userId: data.userId
      });

      return job;
    } catch (error) {
      logger.error('Failed to add notification job to queue:', error);
      throw error;
    }
  }

  async addAnalyticsJob(jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job processor not initialized');
    }

    try {
      const job = await this.queues.analytics.add(jobType, data, {
        priority: options.priority || -1, // Lower priority for analytics
        delay: options.delay || 5000, // 5 second delay
        ...options
      });

      logger.job('Analytics job added to queue', {
        jobId: job.id,
        jobType,
        userId: data.userId
      });

      return job;
    } catch (error) {
      logger.error('Failed to add analytics job to queue:', error);
      throw error;
    }
  }

  async addMaintenanceJob(jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job processor not initialized');
    }

    try {
      const job = await this.queues.maintenance.add(jobType, data, {
        priority: options.priority || 10, // High priority for maintenance
        delay: options.delay || 0,
        ...options
      });

      logger.job('Maintenance job added to queue', {
        jobId: job.id,
        jobType
      });

      return job;
    } catch (error) {
      logger.error('Failed to add maintenance job to queue:', error);
      throw error;
    }
  }

  // Schedule recurring jobs
  async scheduleRecurringJobs() {
    try {
      // Daily summary notifications at 9 AM
      await this.queues.notifications.add('daily-summary-scheduler', {}, {
        repeat: { cron: '0 9 * * *' },
        removeOnComplete: 1,
        removeOnFail: 1
      });

      // Weekly maintenance on Sundays at 2 AM
      await this.queues.maintenance.add('weekly-maintenance', {}, {
        repeat: { cron: '0 2 * * 0' },
        removeOnComplete: 1,
        removeOnFail: 1
      });

      logger.job('Recurring jobs scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule recurring jobs:', error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    const stats = {};
    
    for (const [queueName, queue] of Object.entries(this.queues)) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed()
        ]);

        stats[queueName] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        };
      } catch (error) {
        logger.error(`Failed to get stats for queue ${queueName}:`, error);
        stats[queueName] = { error: error.message };
      }
    }

    return stats;
  }

  // Simulation methods (replace with actual implementations)
  async simulateEmailSending(emailData) {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    logger.info('Email sent (simulated)', {
      to: emailData.to,
      subject: emailData.subject
    });
    
    return { messageId: `sim_${Date.now()}`, status: 'sent' };
  }

  async simulatePushNotification(notificationData) {
    // Simulate push notification delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    logger.info('Push notification sent (simulated)', {
      userId: notificationData.userId,
      title: notificationData.title
    });
    
    return { notificationId: `push_${Date.now()}`, status: 'sent' };
  }

  async storeAnalyticsData(data, type = 'general') {
    // Simulate analytics storage delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
    
    // In a real implementation, this would store to a database or analytics service
    logger.debug('Analytics data stored (simulated)', {
      type,
      userId: data.userId,
      action: data.action
    });
    
    return { stored: true, timestamp: new Date().toISOString() };
  }

  async simulateLogCleanup(daysToKeep) {
    // Simulate log cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const deletedCount = Math.floor(Math.random() * 10) + 1;
    logger.info('Log cleanup completed (simulated)', { deletedCount, daysToKeep });
    
    return deletedCount;
  }

  async simulateDatabaseOptimization() {
    // Simulate database optimization
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    logger.info('Database optimization completed (simulated)');
    return { optimized: true };
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Shutting down job processor...');
    
    const closePromises = Object.entries(this.queues).map(async ([queueName, queue]) => {
      try {
        await queue.close();
        logger.info(`Queue ${queueName} closed successfully`);
      } catch (error) {
        logger.error(`Failed to close queue ${queueName}:`, error);
      }
    });

    await Promise.allSettled(closePromises);
    logger.info('Job processor shutdown completed');
  }
}

module.exports = new JobProcessor();