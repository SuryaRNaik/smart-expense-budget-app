jest.mock('../../../src/db', () => ({
  getPool: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../src/app');
const config = require('../../../src/config');
const { getPool } = require('../../../src/db');
const { signTestToken } = require('../../../src/auth/jwt');

const TEST_SECRET = 'budget-auth-unit-test-secret';
const originalJwtSecret = config.jwtSecret;
const userId = 'budget-user-123';
const authorization = () => `Bearer ${signTestToken(userId, 'user')}`;

describe('Budget API authentication contract', () => {
  beforeAll(() => {
    config.jwtSecret = TEST_SECRET;
  });

  afterAll(() => {
    config.jwtSecret = originalJwtSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates budgets using the authenticated JWT userId', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            budget_id: 'budget-1',
            user_id: userId,
            category_id: null,
            period: '2026-10',
            limit_amount: '500.00',
            alert_threshold: '80.00',
          }],
        }),
    };
    getPool.mockReturnValue(pool);

    const response = await request(app)
      .post('/api/budgets')
      .set('Authorization', authorization())
      .send({ period: '2026-10', limit_amount: 500 })
      .expect(201);

    expect(response.body.budget.user_id).toBe(userId);
    expect(pool.query.mock.calls[0][1]).toEqual([userId, null, '2026-10']);
    expect(pool.query.mock.calls[1][1]).toEqual([userId, null, '2026-10', 500, 80]);
  });

  it('uses the authenticated JWT userId to fetch budget progress', async () => {
    const pool = { query: jest.fn().mockResolvedValueOnce({ rows: [] }) };
    getPool.mockReturnValue(pool);

    await request(app)
      .get('/api/budgets/progress?period=2026-10')
      .set('Authorization', authorization())
      .expect(200);

    expect(pool.query.mock.calls[0][1]).toEqual([userId, '2026-10']);
  });

  it('rejects test identity headers without a bearer token', async () => {
    await request(app)
      .post('/api/budgets')
      .set('x-test-user-id', userId)
      .send({ period: '2026-10', limit_amount: 500 })
      .expect(401);

    expect(getPool).not.toHaveBeenCalled();
  });
});
