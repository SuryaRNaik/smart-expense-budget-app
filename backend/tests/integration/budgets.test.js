const request = require('supertest');
const app = require('../../src/app');
const { getPool, closePool } = require('../../src/db');

describe('Budget API Integration Tests (S1-05 & S1-06)', () => {
  let testUserId;
  let testAccountId;
  let testCategoryId;

  beforeAll(async () => {
    const pool = getPool();
    
    // 1. Create a dedicated test user with a timestamp-unique email
    const uniqueEmail = `budget.user.${Date.now()}_${Math.random()}@example.com`;
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ('Budget Integration User', $1, 'hashed_pass_123') 
       RETURNING user_id;`,
      [uniqueEmail]
    );
    testUserId = userRes.rows[0].user_id;

    // 2. Create a test account matching migration schema including account_type
    const accRes = await pool.query(
      `INSERT INTO accounts (user_id, account_name, account_type, balance) 
       VALUES ($1, 'Test Checking', 'checking', 1000.00) 
       RETURNING account_id;`,
      [testUserId]
    );
    testAccountId = accRes.rows[0].account_id;

    // 3. Fetch an existing category or seed one
    const catRes = await pool.query(`SELECT category_id FROM categories LIMIT 1;`);
    if (catRes.rows.length > 0) {
      testCategoryId = catRes.rows[0].category_id;
    } else {
      const newCat = await pool.query(
        `INSERT INTO categories (name, type) 
         VALUES ('Test Groceries', 'expense') 
         RETURNING category_id;`
      );
      testCategoryId = newCat.rows[0].category_id;
    }

    // 4. Insert sample transactions using 'expense'
    // 4. Insert sample transactions using valid transaction type
    await pool.query(
      `INSERT INTO transactions (account_id, category_id, amount, type, date)
      VALUES ($1, $2, 150.00, 'Expense', '2026-11-10');`,
      [testAccountId, testCategoryId]
    );

    await pool.query(
      `INSERT INTO transactions (account_id, category_id, amount, type, date)
      VALUES ($1, $2, 300.00, 'Expense', '2026-11-15');`,
      [testAccountId, testCategoryId]
    );
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query('DELETE FROM transactions WHERE account_id = $1;', [testAccountId]);
    await pool.query('DELETE FROM budgets WHERE user_id = $1;', [testUserId]);
    await pool.query('DELETE FROM accounts WHERE user_id = $1;', [testUserId]);
    await pool.query('DELETE FROM users WHERE user_id = $1;', [testUserId]);
    await closePool();
  });

  describe('POST /api/budgets - S1-05 Tests', () => {
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

  describe('GET /api/budgets/progress - S1-06 Tests', () => {
    test('should calculate spent vs limit dynamically for target period', async () => {
      const res = await request(app)
        .get('/api/budgets/progress?period=2026-11')
        .set('x-test-user-id', testUserId);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('period', '2026-11');
      expect(Array.isArray(res.body.budgets)).toBe(true);

      const catBudget = res.body.budgets.find(b => b.category_id === testCategoryId);
      if (catBudget) {
        expect(catBudget.spent).toEqual('450.00'); // 150 + 300
        expect(catBudget.remaining).toEqual('50.00'); // 500 - 450
        expect(catBudget.percentage_used).toEqual(90.00);
        expect(catBudget.is_alert_triggered).toBe(true); // 90% >= 85% alert threshold
        expect(catBudget.is_exceeded).toBe(false);
      }
    });

    test('should return 400 for invalid period query parameter', async () => {
      const res = await request(app)
        .get('/api/budgets/progress?period=invalid-period')
        .set('x-test-user-id', testUserId);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/YYYY-MM format/i);
    });

    test('should return 401 when unauthorized request is made', async () => {
      const res = await request(app)
        .get('/api/budgets/progress?period=2026-11');

      expect(res.statusCode).toEqual(401);
    });
  });
});