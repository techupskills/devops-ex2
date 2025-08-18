const request = require('supertest');
const app = require('./server');

describe('TODO API', () => {
  test('GET /api/todos should return todos', async () => {
    const response = await request(app)
      .get('/api/todos')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('POST /api/todos should create a new todo', async () => {
    const newTodo = { text: 'Test todo' };
    
    const response = await request(app)
      .post('/api/todos')
      .send(newTodo)
      .expect(201);
    
    expect(response.body.text).toBe(newTodo.text);
    expect(response.body.completed).toBe(false);
    expect(response.body.id).toBeDefined();
  });

  test('POST /api/todos should return 400 for missing text', async () => {
    await request(app)
      .post('/api/todos')
      .send({})
      .expect(400);
  });

  test('GET /health should return ok status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });
});