const request = require('supertest');
const app = require('../../src/app');
const { getPool, closePool } = require('../../src/db');

describe('POST /api/budgets', () => {
  let testUserId;
  let testCategoryId;

  beforeAll(async () => {
    const pool = getPool();
    // Insert a dummy user and category for foreign key constraints
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ('Budget Test User', 'budget.test@example.com', 'hashed_pass_123') 
       RETURNING user_id;`
    );
    testUserId = userRes.rows[0].user_id;

    const catRes = await pool.query(
      `INSERT INTO categories (user_id, name, type) 
       VALUES ($1, 'Test Groceries', 'Expense') 
       RETURNING category_id;`,
      [testUserId]
    );
    testCategoryId = catRes.rows[0].category_id;
  });

  afterAll(async () => {
    const pool = getPool();
    // Cleanup test data
    await pool.query('DELETE FROM users WHERE user_id = $1;', [testUserId]);
    await closePool();
  });

  test('should successfully create a budget with valid inputs', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .send({
        user_id: testUserId,
        category_id: testCategoryId,
        period: '2026-11',
        limit_amount: 500.00,
        alert_threshold: 85.00
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'Budget created successfully');
    expect(res.body.budget).toHaveProperty('budget_id');
    expect(res.body.budget.limit_amount).toEqual('500.00');
  });

  test('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .send({
        user_id: testUserId,
        limit_amount: 200.00
        // missing period
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('should return 409 conflict when duplicate budget is created for same category and period', async () => {
    // Attempt to create the exact same budget as test 1
    const res = await request(app)
      .post('/api/budgets')
      .send({
        user_id: testUserId,
        category_id: testCategoryId,
        period: '2026-11',
        limit_amount: 300.00
      });

    expect(res.statusCode).toEqual(409);
    expect(res.body).toHaveProperty('error', 'A budget already exists for this category and period.');
  });
});