jest.mock('../../src/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const db = require('../../src/db');
const { signTestToken } = require('../../src/auth/jwt');

const TEST_SECRET = 'transaction-integration-test-secret';
const originalJwtSecret = config.jwtSecret;
const authorization = () => `Bearer ${signTestToken('user-123', 'User')}`;

const createClient = (responses) => {
  const query = jest.fn();
  for (const response of responses) {
    query.mockResolvedValueOnce(response);
  }
  const release = jest.fn();
  const client = { query, release };
  db.getClient.mockResolvedValueOnce(client);
  return client;
};

const transactionPayload = (overrides = {}) => ({
  accountId: 'account-123',
  categoryId: 'category-expense',
  amount: 150.25,
  type: 'Expense',
  date: '2026-10-20',
  notes: 'Groceries',
  ...overrides,
});

describe('Transactions API (SEBM-F-010, TC-Exp-01)', () => {
  beforeAll(() => {
    config.jwtSecret = TEST_SECRET;
  });

  afterAll(() => {
    config.jwtSecret = originalJwtSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the transaction and updates its account balance atomically', async () => {
    const createdAt = new Date('2026-10-20T10:00:00.000Z');
    const client = createClient([
      { rows: [] },
      { rows: [{ account_id: 'account-123', balance: '500.00' }] },
      { rows: [{ category_id: 'category-expense' }] },
      {
        rows: [{
          transaction_id: 'transaction-123',
          account_id: 'account-123',
          category_id: 'category-expense',
          amount: '150.25',
          date: '2026-10-20',
          type: 'Expense',
          notes: 'Groceries',
          created_at: createdAt,
        }],
      },
      { rows: [{ balance: '349.75' }] },
      { rows: [] },
    ]);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', authorization())
      .send(transactionPayload())
      .expect(201);

    expect(response.body).toMatchObject({
      transactionId: 'transaction-123',
      accountId: 'account-123',
      categoryId: 'category-expense',
      amount: 150.25,
      type: 'Expense',
      date: '2026-10-20',
      newBalance: 349.75,
    });
    expect(client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'SELECT',
      'INSERT',
      'UPDATE',
      'COMMIT',
    ]);
    expect(client.query.mock.calls[1][1]).toEqual(['account-123', 'user-123']);
    expect(client.query.mock.calls[4][1]).toEqual([-150.25, 'account-123', 'user-123']);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('lists transactions only for the authenticated user', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        transaction_id: 'transaction-123',
        account_id: 'account-123',
        category_id: 'category-expense',
        amount: '15.00',
        date: '2026-10-20',
        type: 'Expense',
        notes: 'Coffee',
        created_at: new Date('2026-10-20T10:00:00.000Z'),
      }],
    });

    const response = await request(app)
      .get('/api/transactions?userId=another-user')
      .set('Authorization', authorization())
      .expect(200);

    expect(response.body.transactions).toHaveLength(1);
    expect(response.body.transactions[0]).toMatchObject({
      transactionId: 'transaction-123',
      accountId: 'account-123',
      amount: 15,
      type: 'Expense',
    });
    expect(db.query.mock.calls[0][0]).toContain('INNER JOIN accounts');
    expect(db.query.mock.calls[0][0]).toContain('WHERE accounts.user_id = $1');
    expect(db.query.mock.calls[0][1]).toEqual(['user-123']);
  });

  it('rolls back when the account is not owned by the authenticated user', async () => {
    const client = createClient([
      { rows: [] },
      { rows: [] },
      { rows: [] },
    ]);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', authorization())
      .send(transactionPayload())
      .expect(404);

    expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    expect(client.query.mock.calls.map(([sql]) => sql.trim())).toEqual([
      'BEGIN',
      expect.stringContaining('SELECT'),
      'ROLLBACK',
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid input before opening a database transaction', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', authorization())
      .send(transactionPayload({ amount: 0 }))
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(db.getClient).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send(transactionPayload())
      .expect(401);

    expect(response.body.error.code).toBe('MISSING_AUTHORIZATION');
    expect(db.getClient).not.toHaveBeenCalled();
  });
});
