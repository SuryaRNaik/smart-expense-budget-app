jest.mock('../../../src/db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../src/app');
const config = require('../../../src/config');
const db = require('../../../src/db');
const { signPasswordResetToken, verifyPasswordResetToken } = require('../../../src/auth');

const TEST_SECRET = 'test-secret-for-password-reset-tests-only';
const originalJwtSecret = config.jwtSecret;

describe('TC-Auth-02: password reset flow (SEBM-F-003)', () => {
  beforeAll(() => {
    config.jwtSecret = TEST_SECRET;
  });

  afterAll(() => {
    config.jwtSecret = originalJwtSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a signed reset token for an existing user email', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 'user-123', email: 'jane@example.com' }],
    });

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'JANE@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('password reset');
    expect(response.body.resetToken).toBeDefined();
    expect(verifyPasswordResetToken(response.body.resetToken)).toMatchObject({
      userId: 'user-123',
      email: 'jane@example.com',
    });
  });

  it('resets a password using a valid reset token', async () => {
    const resetToken = signPasswordResetToken('user-123', 'jane@example.com');
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'NewPassword123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password reset successful.');
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[1][0]).toContain('UPDATE users');
    expect(db.query.mock.calls[1][1][0]).toMatch(/^\$2[aby]\$/);
  });

  it('rejects an invalid or expired reset token', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid-token', password: 'NewPassword123' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('rejects weak passwords before verifying the token', async () => {
    const resetToken = signPasswordResetToken('user-123', 'jane@example.com');

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('at least 8 characters');
  });
});
