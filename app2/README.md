# Advanced Todo API

A sophisticated Node.js REST API featuring JWT authentication, database connection pooling, Redis caching, background job processing, and comprehensive security middleware. Perfect for demonstrating complex codebase patterns in RAG (Retrieval-Augmented Generation) searches.

## 🚀 Features

### Authentication & Security
- **JWT Authentication** with access and refresh tokens
- **Password hashing** with bcrypt and configurable rounds
- **Session management** with Redis storage
- **Role-based authorization** with permissions system
- **Rate limiting** on authentication endpoints
- **Input validation** and sanitization
- **SQL injection prevention**
- **Security headers** with Helmet.js
- **CORS protection** with configurable origins

### Database & Caching
- **MySQL connection pooling** with automatic reconnection
- **Redis caching** for sessions and rate limiting
- **Database transactions** for atomic operations
- **Query optimization** with proper indexing
- **Full-text search** capabilities

### Background Processing
- **Bull queue system** for async job processing
- **Email notifications** (welcome, reminders, password reset)
- **Push notifications** for due todos
- **Analytics tracking** for user activity
- **Scheduled maintenance** tasks
- **Retry mechanisms** with exponential backoff

### API Features
- **RESTful endpoints** with proper HTTP methods
- **Pagination** and filtering
- **Bulk operations** for efficiency
- **Advanced search** with full-text capabilities
- **Statistics and analytics** endpoints
- **Comprehensive error handling**

### Development & Operations
- **Structured logging** with Winston
- **Health check endpoints** with service status
- **Graceful shutdown** handling
- **Docker ready** with environment variables
- **Comprehensive test suite** with Jest
- **Request/response logging** with performance tracking

## 📁 Project Structure

```
app2/
├── src/
│   ├── auth/                 # Authentication logic
│   ├── middleware/           # Security & validation middleware
│   ├── models/              # Database models
│   ├── routes/              # API route handlers
│   ├── services/            # Background job processing
│   ├── utils/               # Utilities (logger, helpers)
│   ├── config/              # Database & Redis configuration
│   └── server.js            # Main application entry point
├── tests/                   # Comprehensive test suite
├── logs/                    # Application logs
├── package.json             # Dependencies and scripts
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🛠 Installation & Setup

### Prerequisites
- Node.js 16+ 
- MySQL 5.7+ (or 8.0+)
- Redis 6+ (optional but recommended)

### Environment Setup
1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables:
   ```env
   NODE_ENV=development
   PORT=5000
   
   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=advanced_todo
   DB_USER=root
   DB_PASSWORD=your-password
   
   # JWT Secrets
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-token-secret
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create database:
   ```sql
   CREATE DATABASE advanced_todo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. Start the server:
   ```bash
   npm start           # Production
   npm run dev         # Development with nodemon
   ```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and blacklist token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/sessions` - Get active sessions

### Todos
- `GET /api/todos` - Get todos with filtering/pagination
- `POST /api/todos` - Create new todo
- `GET /api/todos/:id` - Get specific todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `GET /api/todos/statistics` - Get user todo statistics
- `GET /api/todos/search?q=term` - Full-text search todos
- `GET /api/todos/overdue` - Get overdue todos
- `PUT /api/todos/bulk/status` - Bulk update todo status

### System
- `GET /health` - Health check with service status
- `GET /api` - API information and features

## 🔐 Authentication Flow

### Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Authenticated Requests
```bash
curl -X GET http://localhost:5000/api/todos \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📝 Todo Operations

### Create Todo
```bash
curl -X POST http://localhost:5000/api/todos \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive README and API docs",
    "priority": "high",
    "dueDate": "2024-12-31T23:59:59Z",
    "tags": ["documentation", "project"]
  }'
```

### Search Todos
```bash
curl -X GET "http://localhost:5000/api/todos/search?q=documentation&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Filter Todos
```bash
curl -X GET "http://localhost:5000/api/todos?completed=false&priority=high&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm test -- --coverage
```

### Test Categories
- **Authentication Tests**: Registration, login, token refresh, logout
- **Todo CRUD Tests**: Create, read, update, delete operations
- **Security Tests**: Rate limiting, input validation, SQL injection prevention
- **Integration Tests**: Full API workflow testing

## 📈 Background Jobs

The application uses Bull queues for background processing:

### Email Queue
- Welcome emails for new users
- Password reset emails
- Todo reminder notifications

### Notification Queue
- Push notifications for due todos
- Daily summary notifications

### Analytics Queue
- User activity tracking
- Todo completion statistics

### Maintenance Queue
- Log cleanup tasks
- Database optimization
- Scheduled reminder sending

## 🔍 RAG Search Examples

This codebase is perfect for demonstrating RAG searches. Here are some example queries that would show meaningful results:

### Authentication Patterns
- "JWT token generation and validation"
- "Password hashing with bcrypt"
- "Session management with Redis"
- "Rate limiting implementation"

### Database Operations
- "MySQL connection pooling setup"
- "Database transaction handling"
- "SQL injection prevention"
- "Full-text search implementation"

### Security Middleware
- "Input validation and sanitization"
- "CORS configuration"
- "Security headers implementation"
- "Error handling patterns"

### Background Processing
- "Async job queue setup"
- "Email notification system"
- "Retry mechanisms for failed jobs"
- "Scheduled task implementation"

## 📊 Monitoring & Logging

### Health Checks
The `/health` endpoint provides comprehensive system status:
- Database connection status
- Redis connection status
- Job processor status
- Queue statistics
- System uptime and performance metrics

### Logging
Structured logging with different log levels:
- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Database logs**: `logs/database.log`
- **Security logs**: `logs/security.log`

### Performance Tracking
- Request/response timing
- Slow query detection
- Rate limit monitoring
- Job processing metrics

## 🚀 Deployment

### Docker Support
The application is Docker-ready with proper environment variable handling.

### Production Considerations
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper CORS origins
- Set up log rotation
- Monitor memory usage and connection pools
- Configure Redis for persistence

### Security Best Practices
- Regular security audits with `npm audit`
- Keep dependencies updated
- Monitor failed authentication attempts
- Set up alerting for security events
- Use HTTPS in production
- Regular backup of user data

## 📚 Learning Resources

This codebase demonstrates advanced Node.js patterns including:

### Architecture Patterns
- **Layered Architecture**: Routes → Services → Models
- **Dependency Injection**: Configuration management
- **Factory Pattern**: Database and Redis managers
- **Observer Pattern**: Event-driven job processing

### Security Patterns
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Input Validation**: Multi-layered validation
- **Rate Limiting**: Sliding window algorithm

### Performance Patterns
- **Connection Pooling**: Database connections
- **Caching Strategy**: Redis for sessions and rate limits
- **Async Processing**: Background job queues
- **Pagination**: Efficient data retrieval

### Error Handling Patterns
- **Graceful Degradation**: Continue without Redis/jobs if needed
- **Circuit Breaker**: Database reconnection logic
- **Structured Logging**: Comprehensive error tracking
- **Graceful Shutdown**: Clean resource cleanup

## 🤝 Contributing

This is a demonstration project for RAG searches. The code showcases complex patterns that are perfect for testing RAG retrieval and LLM analysis capabilities.

---

**Perfect for RAG Demonstrations**: This codebase contains sophisticated patterns in authentication, database operations, security, background processing, and error handling that showcase the power of Enhanced RAG systems in understanding and explaining complex code relationships.