const request = require('supertest');
const Server = require('../src/server');
const database = require('../src/config/database');
const redisManager = require('../src/config/redis');
const { User } = require('../src/models/User');

describe('Authentication Endpoints', () => {
  let server;
  let app;
  let testUser;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    
    // Initialize server
    server = new Server();
    app = await server.start();
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await database.query('DELETE FROM users WHERE id = ?', [testUser.id]);
    }
    
    await server.gracefulShutdown('TEST_CLEANUP');
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await database.query('DELETE FROM users WHERE email LIKE "test%@example.com"');
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'testuser@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('sessionId');

      // Store for cleanup
      testUser = response.body.data.user;
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUserData, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Valid email is required'
          })
        ])
      );
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUserData, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password'
          })
        ])
      );
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    const loginData = {
      email: 'logintest@example.com',
      password: 'TestPass123!'
    };

    beforeEach(async () => {
      // Create test user for login tests
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...loginData,
          firstName: 'Login',
          lastName: 'Test'
        });
      
      testUser = response.body.data.user;
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: loginData.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginData.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: loginData.password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Create user and get refresh token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'refreshtest@example.com',
          password: 'TestPass123!',
          firstName: 'Refresh',
          lastName: 'Test'
        });
      
      testUser = registerResponse.body.data.user;
      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      // Create user and get access token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'profiletest@example.com',
          password: 'TestPass123!',
          firstName: 'Profile',
          lastName: 'Test'
        });
      
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('profiletest@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.statistics).toHaveProperty('todosCount');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken;
    let sessionId;

    beforeEach(async () => {
      // Create user and get tokens
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logouttest@example.com',
          password: 'TestPass123!',
          firstName: 'Logout',
          lastName: 'Test'
        });
      
      testUser = registerResponse.body.data.user;
      accessToken = registerResponse.body.data.tokens.accessToken;
      sessionId = registerResponse.body.data.sessionId;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sessionId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');

      // Verify token is blacklisted by trying to use it
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(profileResponse.body.success).toBe(false);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create user for password reset test
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'resettest@example.com',
          password: 'TestPass123!',
          firstName: 'Reset',
          lastName: 'Test'
        });
      
      testUser = registerResponse.body.data.user;
    });

    it('should accept password reset request for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'resettest@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link will be sent');
    });

    it('should accept password reset request for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link will be sent');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Rate Limiting', () => {
    const rateLimitTestData = {
      email: 'ratelimit@example.com',
      password: 'TestPass123!',
      firstName: 'Rate',
      lastName: 'Limit'
    };

    it('should apply rate limiting to registration attempts', async () => {
      // Make multiple registration attempts quickly
      const promises = Array(7).fill().map(() =>
        request(app)
          .post('/api/auth/register')
          .send(rateLimitTestData)
      );

      const responses = await Promise.all(promises);
      
      // At least some should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});