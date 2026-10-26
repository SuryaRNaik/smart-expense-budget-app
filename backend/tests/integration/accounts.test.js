jest.mock('../../src/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const db = require('../../src/db');
const { signTestToken } = require('../../src/auth/jwt');

const TEST_SECRET = 'account-integration-test-secret';
const originalJwtSecret = config.jwtSecret;
const authorization = () => `Bearer ${signTestToken('user-123', 'User')}`;

describe('Accounts API (SEBM-F-030, TC-Acc-01)', () => {
  beforeAll(() => {
    config.jwtSecret = TEST_SECRET;
  });

  afterAll(() => {
    config.jwtSecret = originalJwtSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an account for the authenticated user with a zero opening balance by default', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        account_id: 'account-123',
        user_id: 'user-123',
        account_type: 'checking',
        account_name: 'Daily account',
        balance: '0.00',
        created_at: new Date('2026-10-20T10:00:00.000Z'),
      }],
    });

    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', authorization())
      .send({
        accountType: 'checking',
        accountName: 'Daily account',
        userId: 'another-user',
      })
      .expect(201);

    expect(response.body.account).toMatchObject({
      accountId: 'account-123',
      userId: 'user-123',
      accountType: 'checking',
      accountName: 'Daily account',
      balance: 0,
    });
    expect(db.query.mock.calls[0][0]).toContain('INSERT INTO accounts');
    expect(db.query.mock.calls[0][1]).toEqual(['user-123', 'checking', 'Daily account', 0]);
  });

  it('lists only the authenticated user accounts', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        account_id: 'account-123',
        user_id: 'user-123',
        account_type: 'savings',
        account_name: 'Rainy day',
        balance: '125.50',
        created_at: new Date('2026-10-20T10:00:00.000Z'),
      }],
    });

    const response = await request(app)
      .get('/api/accounts?userId=another-user')
      .set('Authorization', authorization())
      .expect(200);

    expect(response.body.accounts).toHaveLength(1);
    expect(response.body.accounts[0].balance).toBe(125.5);
    expect(db.query.mock.calls[0][0]).toContain('WHERE user_id = $1');
    expect(db.query.mock.calls[0][1]).toEqual(['user-123']);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/accounts').expect(401);

    expect(response.body.error.code).toBe('MISSING_AUTHORIZATION');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects invalid account input without writing to the database', async () => {
    const response = await request(app)
      .post('/api/accounts')
      .set('Authorization', authorization())
      .send({ accountType: 'checking', accountName: '' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(db.query).not.toHaveBeenCalled();
  });
});
