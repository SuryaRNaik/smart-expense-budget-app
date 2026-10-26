const request = require('supertest');
const app = require('../../src/app');
const { getPool, closePool } = require('../../src/db');

describe('POST /api/budgets - Comprehensive S1-05 Tests', () => {
  let testUserId;
  let testCategoryId;

  beforeAll(async () => {
    const pool = getPool();
    
    // Create a dedicated test user for our integration tests
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ('Budget Integration User', 'budget.integration@example.com', 'hashed_pass_123') 
       RETURNING user_id;`
    );
    testUserId = userRes.rows[0].user_id;

    // Fetch an already seeded category from the migration seed data to avoid check constraint mismatches
    const catRes = await pool.query(`SELECT category_id FROM categories LIMIT 1;`);
    if (catRes.rows.length > 0) {
      testCategoryId = catRes.rows[0].category_id;
    } else {
      // Fallback if no category seeded
      const newCat = await pool.query(
        `INSERT INTO categories (user_id, name, type) 
         VALUES ($1, 'Test Groceries', 'expense') 
         RETURNING category_id;`,
        [testUserId]
      );
      testCategoryId = newCat.rows[0].category_id;
    }
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query('DELETE FROM budgets WHERE user_id = $1;', [testUserId]);
    await pool.query('DELETE FROM users WHERE user_id = $1;', [testUserId]);
    await closePool();
  });

  test('should successfully create a category-wise budget with valid inputs', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
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

  test('should successfully create an overall budget when category_id is null', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
        category_id: null,
        period: '2026-12',
        limit_amount: 2000.00,
        alert_threshold: 80.00
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.budget.category_id).toBeNull();
    expect(res.body.budget.period).toBe('2026-12');
  });

  test('should return 409 conflict when duplicate overall budget is created for same period', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
        category_id: null,
        period: '2026-12',
        limit_amount: 1500.00
      });

    expect(res.statusCode).toEqual(409);
    expect(res.body).toHaveProperty('error');
  });

  test('should return 400 for invalid period format (not YYYY-MM)', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
        period: '2026/11',
        limit_amount: 500.00
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/YYYY-MM/i);
  });

  test('should return 400 for invalid alert_threshold (< 0 or > 100)', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
        period: '2027-01',
        limit_amount: 500.00,
        alert_threshold: 150.00
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/alert_threshold/i);
  });

  test('should return 400 for non-positive limit_amount (<= 0)', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
        period: '2027-01',
        limit_amount: 0.00
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/limit_amount/i);
  });

  test('should return 400 for invalid foreign key category_id', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', testUserId)
      .send({
        category_id: '00000000-0000-0000-0000-000000000000',
        period: '2027-02',
        limit_amount: 500.00
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/invalid/i);
  });
});