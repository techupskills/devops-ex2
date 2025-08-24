const database = require('../config/database');
const logger = require('../utils/logger');

class Todo {
  constructor(data = {}) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.completed = data.completed || false;
    this.priority = data.priority || 'medium';
    this.dueDate = data.due_date || data.dueDate;
    this.userId = data.user_id || data.userId;
    this.categoryId = data.category_id || data.categoryId;
    this.tags = data.tags || [];
    this.attachments = data.attachments || [];
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.completedAt = data.completed_at || data.completedAt;
  }

  // Create todos table with advanced features
  static async createTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS todos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT false,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        due_date DATETIME,
        user_id INT NOT NULL,
        category_id INT,
        tags JSON,
        attachments JSON,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        
        INDEX idx_user_id (user_id),
        INDEX idx_completed (completed),
        INDEX idx_priority (priority),
        INDEX idx_due_date (due_date),
        INDEX idx_created_at (created_at),
        INDEX idx_user_completed (user_id, completed),
        
        FULLTEXT INDEX ft_title_description (title, description)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await database.query(createTableSQL);
      logger.database('Todos table created successfully');
    } catch (error) {
      logger.error('Failed to create todos table:', error);
      throw error;
    }
  }

  // Create new todo with validation
  static async create(todoData, userId) {
    const {
      title,
      description = null,
      priority = 'medium',
      dueDate = null,
      categoryId = null,
      tags = [],
      attachments = []
    } = todoData;

    try {
      const insertSQL = `
        INSERT INTO todos (title, description, priority, due_date, user_id, category_id, tags, attachments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await database.query(insertSQL, [
        title.trim(),
        description ? description.trim() : null,
        priority,
        dueDate,
        userId,
        categoryId,
        JSON.stringify(tags),
        JSON.stringify(attachments)
      ]);

      const todoId = result.insertId;
      logger.database('Todo created successfully', { todoId, userId, title });

      return await Todo.findById(todoId, userId);
    } catch (error) {
      logger.error('Failed to create todo:', error);
      throw error;
    }
  }

  // Find todo by ID with user ownership validation
  static async findById(id, userId = null) {
    try {
      let selectSQL = 'SELECT * FROM todos WHERE id = ?';
      const params = [id];

      if (userId) {
        selectSQL += ' AND user_id = ?';
        params.push(userId);
      }

      const results = await database.query(selectSQL, params);

      if (results.length === 0) {
        return null;
      }

      const todoData = results[0];
      todoData.tags = todoData.tags ? JSON.parse(todoData.tags) : [];
      todoData.attachments = todoData.attachments ? JSON.parse(todoData.attachments) : [];

      return new Todo(todoData);
    } catch (error) {
      logger.error('Failed to find todo by ID:', error);
      throw error;
    }
  }

  // Get todos for user with advanced filtering and pagination
  static async findByUserId(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      completed = null,
      priority = null,
      search = null,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      categoryId = null,
      dueBefore = null,
      dueAfter = null,
      tags = []
    } = options;

    const offset = (page - 1) * limit;

    try {
      let whereClause = 'WHERE user_id = ?';
      const params = [userId];

      // Build dynamic WHERE clause
      if (completed !== null) {
        whereClause += ' AND completed = ?';
        params.push(completed);
      }

      if (priority) {
        whereClause += ' AND priority = ?';
        params.push(priority);
      }

      if (categoryId) {
        whereClause += ' AND category_id = ?';
        params.push(categoryId);
      }

      if (dueBefore) {
        whereClause += ' AND due_date <= ?';
        params.push(dueBefore);
      }

      if (dueAfter) {
        whereClause += ' AND due_date >= ?';
        params.push(dueAfter);
      }

      if (search) {
        whereClause += ' AND (title LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (tags.length > 0) {
        // JSON search for tags (MySQL 5.7+)
        const tagConditions = tags.map(() => 'JSON_CONTAINS(tags, ?)').join(' AND ');
        whereClause += ` AND ${tagConditions}`;
        tags.forEach(tag => params.push(JSON.stringify(tag)));
      }

      // Get total count
      const countSQL = `SELECT COUNT(*) as total FROM todos ${whereClause}`;
      const countResult = await database.query(countSQL, params);
      const total = countResult[0].total;

      // Validate sort parameters
      const allowedSortFields = ['title', 'priority', 'due_date', 'created_at', 'updated_at'];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder : 'DESC';

      // Get todos
      const selectSQL = `
        SELECT * FROM todos ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      const results = await database.query(selectSQL, params);
      const todos = results.map(todoData => {
        todoData.tags = todoData.tags ? JSON.parse(todoData.tags) : [];
        todoData.attachments = todoData.attachments ? JSON.parse(todoData.attachments) : [];
        return new Todo(todoData);
      });

      return {
        todos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to find todos by user ID:', error);
      throw error;
    }
  }

  // Get overdue todos
  static async getOverdueTodos(userId = null) {
    try {
      let selectSQL = `
        SELECT * FROM todos 
        WHERE completed = false 
        AND due_date IS NOT NULL 
        AND due_date < NOW()
      `;
      const params = [];

      if (userId) {
        selectSQL += ' AND user_id = ?';
        params.push(userId);
      }

      selectSQL += ' ORDER BY due_date ASC';

      const results = await database.query(selectSQL, params);
      return results.map(todoData => {
        todoData.tags = todoData.tags ? JSON.parse(todoData.tags) : [];
        todoData.attachments = todoData.attachments ? JSON.parse(todoData.attachments) : [];
        return new Todo(todoData);
      });
    } catch (error) {
      logger.error('Failed to get overdue todos:', error);
      throw error;
    }
  }

  // Get todo statistics for user
  static async getStatistics(userId) {
    try {
      const statsSQL = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN completed = false THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN completed = false AND due_date IS NOT NULL AND due_date < NOW() THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN priority = 'high' OR priority = 'urgent' THEN 1 ELSE 0 END) as high_priority,
          AVG(CASE WHEN completed = true AND completed_at IS NOT NULL 
              THEN TIMESTAMPDIFF(HOUR, created_at, completed_at) 
              ELSE NULL END) as avg_completion_hours
        FROM todos 
        WHERE user_id = ?
      `;

      const results = await database.query(statsSQL, [userId]);
      const stats = results[0];

      // Get completion rate by month (last 12 months)
      const monthlySQL = `
        SELECT 
          DATE_FORMAT(completed_at, '%Y-%m') as month,
          COUNT(*) as completed_count
        FROM todos 
        WHERE user_id = ? 
        AND completed = true 
        AND completed_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(completed_at, '%Y-%m')
        ORDER BY month DESC
      `;

      const monthlyResults = await database.query(monthlySQL, [userId]);

      return {
        total: parseInt(stats.total) || 0,
        completed: parseInt(stats.completed) || 0,
        pending: parseInt(stats.pending) || 0,
        overdue: parseInt(stats.overdue) || 0,
        highPriority: parseInt(stats.high_priority) || 0,
        completionRate: stats.total ? ((stats.completed / stats.total) * 100).toFixed(2) : 0,
        avgCompletionHours: parseFloat(stats.avg_completion_hours) || 0,
        monthlyCompletion: monthlyResults
      };
    } catch (error) {
      logger.error('Failed to get todo statistics:', error);
      throw error;
    }
  }

  // Update todo
  async update(updateData, userId) {
    try {
      const allowedFields = [
        'title', 'description', 'completed', 'priority', 'due_date', 
        'category_id', 'tags', 'attachments'
      ];

      const updateFields = [];
      const params = [];

      Object.keys(updateData).forEach(key => {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          
          // Handle JSON fields
          if (['tags', 'attachments'].includes(dbField)) {
            params.push(JSON.stringify(updateData[key]));
          } else {
            params.push(updateData[key]);
          }
        }
      });

      // Handle completion timestamp
      if ('completed' in updateData) {
        if (updateData.completed && !this.completed) {
          updateFields.push('completed_at = NOW()');
        } else if (!updateData.completed && this.completed) {
          updateFields.push('completed_at = NULL');
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const updateSQL = `
        UPDATE todos 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;
      params.push(this.id, userId);

      const result = await database.query(updateSQL, params);
      
      if (result.affectedRows === 0) {
        throw new Error('Todo not found or access denied');
      }

      logger.database('Todo updated successfully', { 
        todoId: this.id, 
        userId,
        updatedFields: Object.keys(updateData)
      });

      // Update current instance
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      logger.error('Failed to update todo:', error);
      throw error;
    }
  }

  // Delete todo (with user validation)
  static async delete(id, userId) {
    try {
      const deleteSQL = 'DELETE FROM todos WHERE id = ? AND user_id = ?';
      const result = await database.query(deleteSQL, [id, userId]);

      if (result.affectedRows === 0) {
        throw new Error('Todo not found or access denied');
      }

      logger.database('Todo deleted successfully', { todoId: id, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete todo:', error);
      throw error;
    }
  }

  // Bulk operations for better performance
  static async bulkUpdateStatus(todoIds, completed, userId) {
    try {
      if (!Array.isArray(todoIds) || todoIds.length === 0) {
        throw new Error('Invalid todo IDs array');
      }

      const placeholders = todoIds.map(() => '?').join(',');
      const completedAtUpdate = completed ? 'completed_at = NOW()' : 'completed_at = NULL';
      
      const updateSQL = `
        UPDATE todos 
        SET completed = ?, ${completedAtUpdate}, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders}) AND user_id = ?
      `;

      const params = [completed, ...todoIds, userId];
      const result = await database.query(updateSQL, params);

      logger.database('Bulk status update completed', {
        userId,
        todoIds,
        completed,
        affectedRows: result.affectedRows
      });

      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to bulk update todo status:', error);
      throw error;
    }
  }

  // Search todos with full-text search
  static async search(userId, searchTerm, options = {}) {
    const { limit = 20, page = 1 } = options;
    const offset = (page - 1) * limit;

    try {
      // Use full-text search if available, otherwise fall back to LIKE
      const searchSQL = `
        SELECT *, MATCH(title, description) AGAINST(? IN BOOLEAN MODE) as relevance
        FROM todos 
        WHERE user_id = ? 
        AND MATCH(title, description) AGAINST(? IN BOOLEAN MODE)
        ORDER BY relevance DESC, created_at DESC
        LIMIT ? OFFSET ?
      `;

      const fallbackSQL = `
        SELECT * FROM todos 
        WHERE user_id = ? 
        AND (title LIKE ? OR description LIKE ?)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      let results;
      try {
        // Try full-text search first
        results = await database.query(searchSQL, [
          searchTerm, userId, searchTerm, limit, offset
        ]);
      } catch (error) {
        // Fall back to LIKE search
        const likeTerm = `%${searchTerm}%`;
        results = await database.query(fallbackSQL, [
          userId, likeTerm, likeTerm, limit, offset
        ]);
      }

      const todos = results.map(todoData => {
        todoData.tags = todoData.tags ? JSON.parse(todoData.tags) : [];
        todoData.attachments = todoData.attachments ? JSON.parse(todoData.attachments) : [];
        return new Todo(todoData);
      });

      return todos;
    } catch (error) {
      logger.error('Failed to search todos:', error);
      throw error;
    }
  }

  // Get JSON representation
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      completed: this.completed,
      priority: this.priority,
      dueDate: this.dueDate,
      userId: this.userId,
      categoryId: this.categoryId,
      tags: this.tags,
      attachments: this.attachments,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }
}

module.exports = { Todo };