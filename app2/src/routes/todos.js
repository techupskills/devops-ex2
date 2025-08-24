const express = require('express');
const { body, query } = require('express-validator');
const authManager = require('../middleware/auth');
const securityMiddleware = require('../middleware/security');
const logger = require('../utils/logger');
const { Todo } = require('../models/Todo');
const jobProcessor = require('../services/jobProcessor');

const router = express.Router();

// All todo routes require authentication
router.use(authManager.authenticate());

// Validation rules
const validationRules = securityMiddleware.getValidationRules();

// Rate limiting for todo operations
const todoRateLimit = securityMiddleware.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    message: 'Too many todo requests, please try again later'
  }
});

/**
 * @route GET /api/todos
 * @desc Get user todos with filtering and pagination
 * @access Private
 */
router.get('/',
  todoRateLimit,
  securityMiddleware.validateRequest([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('completed').optional().isBoolean().withMessage('Completed must be true or false'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    query('search').optional().isLength({ max: 200 }).withMessage('Search term too long'),
    query('sortBy').optional().isIn(['title', 'priority', 'due_date', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
    query('categoryId').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    query('dueBefore').optional().isISO8601().withMessage('Invalid date format for dueBefore'),
    query('dueAfter').optional().isISO8601().withMessage('Invalid date format for dueAfter')
  ]),
  async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        completed: req.query.completed !== undefined ? req.query.completed === 'true' : null,
        priority: req.query.priority,
        search: req.query.search,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC',
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : null,
        dueBefore: req.query.dueBefore,
        dueAfter: req.query.dueAfter,
        tags: req.query.tags ? req.query.tags.split(',') : []
      };

      const result = await Todo.findByUserId(req.user.id, options);

      // Add analytics job for todo list view
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'todos_viewed',
        metadata: {
          filters: options,
          resultCount: result.todos.length,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });

      logger.api('Todos retrieved successfully', {
        userId: req.user.id,
        count: result.todos.length,
        page: options.page
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Get todos error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve todos'
      });
    }
  }
);

/**
 * @route GET /api/todos/statistics
 * @desc Get todo statistics for the user
 * @access Private
 */
router.get('/statistics',
  todoRateLimit,
  async (req, res) => {
    try {
      const statistics = await Todo.getStatistics(req.user.id);
      const overdueTodos = await Todo.getOverdueTodos(req.user.id);

      const response = {
        ...statistics,
        overdueTodos: overdueTodos.map(todo => ({
          id: todo.id,
          title: todo.title,
          dueDate: todo.dueDate,
          priority: todo.priority
        }))
      };

      logger.api('Todo statistics retrieved', {
        userId: req.user.id,
        totalTodos: statistics.total
      });

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      logger.error('Get todo statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve todo statistics'
      });
    }
  }
);

/**
 * @route GET /api/todos/search
 * @desc Search todos using full-text search
 * @access Private
 */
router.get('/search',
  todoRateLimit,
  securityMiddleware.validateRequest([
    query('q').notEmpty().isLength({ min: 1, max: 200 }).withMessage('Search query is required and must be 1-200 characters'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer')
  ]),
  async (req, res) => {
    try {
      const searchTerm = req.query.q;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        page: parseInt(req.query.page) || 1
      };

      const todos = await Todo.search(req.user.id, searchTerm, options);

      // Add analytics job for search
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'todos_searched',
        metadata: {
          searchTerm,
          resultCount: todos.length,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });

      logger.api('Todo search completed', {
        userId: req.user.id,
        searchTerm,
        resultCount: todos.length
      });

      res.json({
        success: true,
        data: {
          todos,
          searchTerm,
          resultCount: todos.length
        }
      });

    } catch (error) {
      logger.error('Todo search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }
);

/**
 * @route GET /api/todos/:id
 * @desc Get specific todo by ID
 * @access Private
 */
router.get('/:id',
  todoRateLimit,
  securityMiddleware.validateRequest([
    body('id').isInt({ min: 1 }).withMessage('Invalid todo ID')
  ]),
  async (req, res) => {
    try {
      const todoId = parseInt(req.params.id);
      const todo = await Todo.findById(todoId, req.user.id);

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      logger.api('Todo retrieved by ID', {
        userId: req.user.id,
        todoId
      });

      res.json({
        success: true,
        data: { todo }
      });

    } catch (error) {
      logger.error('Get todo by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve todo'
      });
    }
  }
);

/**
 * @route POST /api/todos
 * @desc Create new todo
 * @access Private
 */
router.post('/',
  todoRateLimit,
  securityMiddleware.validateRequest([
    validationRules.title,
    validationRules.description.optional(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
    body('categoryId').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Each tag must be 1-50 characters')
  ]),
  async (req, res) => {
    try {
      const todoData = {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority || 'medium',
        dueDate: req.body.dueDate,
        categoryId: req.body.categoryId,
        tags: req.body.tags || [],
        attachments: req.body.attachments || []
      };

      const todo = await Todo.create(todoData, req.user.id);

      // Schedule reminder if due date is set
      if (todo.dueDate) {
        const dueTime = new Date(todo.dueDate).getTime();
        const reminderTime = dueTime - (60 * 60 * 1000); // 1 hour before due
        const delay = Math.max(0, reminderTime - Date.now());

        if (delay > 0) {
          await jobProcessor.addNotificationJob('todo-due-soon', {
            userId: req.user.id,
            todoId: todo.id,
            todoTitle: todo.title,
            dueDate: todo.dueDate
          }, { delay });
        }
      }

      // Add analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'todo_created',
        metadata: {
          todoId: todo.id,
          priority: todo.priority,
          hasDueDate: !!todo.dueDate,
          tagCount: todo.tags.length,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });

      logger.api('Todo created successfully', {
        userId: req.user.id,
        todoId: todo.id,
        title: todo.title
      });

      res.status(201).json({
        success: true,
        message: 'Todo created successfully',
        data: { todo }
      });

    } catch (error) {
      logger.error('Create todo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create todo'
      });
    }
  }
);

/**
 * @route PUT /api/todos/:id
 * @desc Update todo
 * @access Private
 */
router.put('/:id',
  todoRateLimit,
  securityMiddleware.validateRequest([
    validationRules.title.optional(),
    validationRules.description.optional(),
    body('completed').optional().isBoolean().withMessage('Completed must be true or false'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
    body('categoryId').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Each tag must be 1-50 characters')
  ]),
  async (req, res) => {
    try {
      const todoId = parseInt(req.params.id);
      const todo = await Todo.findById(todoId, req.user.id);

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      const updateData = {};
      const allowedFields = ['title', 'description', 'completed', 'priority', 'dueDate', 'categoryId', 'tags', 'attachments'];
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      const updatedTodo = await todo.update(updateData, req.user.id);

      // Track completion analytics
      if (updateData.completed === true && !todo.completed) {
        const completionTime = Date.now() - new Date(todo.createdAt).getTime();
        
        await jobProcessor.addAnalyticsJob('todo-completion-stats', {
          userId: req.user.id,
          todoId: todo.id,
          completionTime
        });
      }

      // Add general analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'todo_updated',
        metadata: {
          todoId: todo.id,
          updatedFields: Object.keys(updateData),
          wasCompleted: updateData.completed === true && !todo.completed,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });

      logger.api('Todo updated successfully', {
        userId: req.user.id,
        todoId,
        updatedFields: Object.keys(updateData)
      });

      res.json({
        success: true,
        message: 'Todo updated successfully',
        data: { todo: updatedTodo }
      });

    } catch (error) {
      logger.error('Update todo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update todo'
      });
    }
  }
);

/**
 * @route DELETE /api/todos/:id
 * @desc Delete todo
 * @access Private
 */
router.delete('/:id',
  todoRateLimit,
  async (req, res) => {
    try {
      const todoId = parseInt(req.params.id);
      
      // Verify todo exists and belongs to user
      const todo = await Todo.findById(todoId, req.user.id);
      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      const deleted = await Todo.delete(todoId, req.user.id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete todo'
        });
      }

      // Add analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'todo_deleted',
        metadata: {
          todoId,
          wasCompleted: todo.completed,
          priority: todo.priority,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });

      logger.api('Todo deleted successfully', {
        userId: req.user.id,
        todoId
      });

      res.json({
        success: true,
        message: 'Todo deleted successfully'
      });

    } catch (error) {
      logger.error('Delete todo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete todo'
      });
    }
  }
);

/**
 * @route PUT /api/todos/bulk/status
 * @desc Bulk update todo completion status
 * @access Private
 */
router.put('/bulk/status',
  todoRateLimit,
  authManager.authorize(['write:todos']),
  securityMiddleware.validateRequest([
    body('todoIds').isArray({ min: 1, max: 50 }).withMessage('Todo IDs must be an array of 1-50 items'),
    body('todoIds.*').isInt({ min: 1 }).withMessage('Each todo ID must be a positive integer'),
    body('completed').isBoolean().withMessage('Completed status is required')
  ]),
  async (req, res) => {
    try {
      const { todoIds, completed } = req.body;
      
      const affectedRows = await Todo.bulkUpdateStatus(todoIds, completed, req.user.id);

      // Add analytics job
      await jobProcessor.addAnalyticsJob('user-activity', {
        userId: req.user.id,
        action: 'todos_bulk_updated',
        metadata: {
          todoIds,
          completed,
          affectedCount: affectedRows,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });

      logger.api('Bulk todo status update completed', {
        userId: req.user.id,
        todoCount: todoIds.length,
        affectedRows,
        completed
      });

      res.json({
        success: true,
        message: `${affectedRows} todos updated successfully`,
        data: {
          affectedRows,
          requestedCount: todoIds.length
        }
      });

    } catch (error) {
      logger.error('Bulk update todo status error:', error);
      res.status(500).json({
        success: false,
        message: 'Bulk update failed'
      });
    }
  }
);

/**
 * @route GET /api/todos/overdue
 * @desc Get overdue todos
 * @access Private
 */
router.get('/overdue',
  todoRateLimit,
  async (req, res) => {
    try {
      const overdueTodos = await Todo.getOverdueTodos(req.user.id);

      logger.api('Overdue todos retrieved', {
        userId: req.user.id,
        count: overdueTodos.length
      });

      res.json({
        success: true,
        data: {
          todos: overdueTodos,
          count: overdueTodos.length
        }
      });

    } catch (error) {
      logger.error('Get overdue todos error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve overdue todos'
      });
    }
  }
);

module.exports = router;