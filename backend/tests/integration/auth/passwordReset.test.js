jest.mock('../../../src/db', () => ({
  query: jest.fn(),
}));

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../../src/app');
const config = require('../../../src/config');
const db = require('../../../src/db');
const NotificationService = require('../../../src/notifications/notificationService');
const { signPasswordResetToken, verifyPasswordResetToken } = require('../../../src/auth');

const TEST_SECRET = 'test-secret-for-password-reset-tests-only';
const originalJwtSecret = config.jwtSecret;
const originalPasswordResetLifetime = config.passwordResetTokenLifetimeSeconds;

describe('TC-Auth-02: password reset flow (SEBM-F-003)', () => {
  beforeAll(() => {
    config.jwtSecret = TEST_SECRET;
  });

  afterAll(() => {
    config.jwtSecret = originalJwtSecret;
    config.passwordResetTokenLifetimeSeconds = originalPasswordResetLifetime;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    config.passwordResetTokenLifetimeSeconds = 30 * 60;
  });

  it('sends the reset link through the notification service without returning the token to the caller', async () => {
    const notifySpy = jest.spyOn(NotificationService, 'send').mockResolvedValue({
      notificationId: 'notification-123',
      userId: 'user-123',
      type: 'PASSWORD_RESET',
      message: 'password reset link',
      sentAt: new Date().toISOString(),
      delivered: true,
    });

    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, email FROM users WHERE email = $1 LIMIT 1;')) {
        return Promise.resolve({ rows: [{ user_id: 'user-123', email: 'jane@example.com' }] });
      }
      if (sql.includes('UPDATE users SET password_reset_token_hash')) {
        return Promise.resolve({ rows: [{ user_id: 'user-123' }] });
      }
      if (sql.includes('INSERT INTO notifications')) {
        return Promise.resolve({ rows: [{ notification_id: 'notification-123' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'JANE@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('password reset');
    expect(response.body.resetToken).toBeUndefined();
    expect(response.body.resetUrl).toBeUndefined();
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        type: 'PASSWORD_RESET',
        message: expect.stringContaining('/reset-password?token='),
      })
    );

    const notificationPayload = notifySpy.mock.calls[0][0];
    const resetTokenFromMessage = decodeURIComponent(
      notificationPayload.message.match(/token=([^\s]+)/)?.[1] || ''
    );
    expect(verifyPasswordResetToken(resetTokenFromMessage)).toMatchObject({
      userId: 'user-123',
      email: 'jane@example.com',
    });

    notifySpy.mockRestore();
  });

  it('returns an identical success response for registered and unregistered emails', async () => {
    const notifySpy = jest.spyOn(NotificationService, 'send').mockResolvedValue({
      notificationId: 'notification-456',
      userId: 'user-456',
      type: 'PASSWORD_RESET',
      message: 'password reset link',
      sentAt: new Date().toISOString(),
      delivered: true,
    });

    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, email FROM users WHERE email = $1 LIMIT 1;')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const missingEmailResponse = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing@example.com' });

    expect(missingEmailResponse.status).toBe(200);
    expect(missingEmailResponse.body).toEqual({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, email FROM users WHERE email = $1 LIMIT 1;')) {
        return Promise.resolve({ rows: [{ user_id: 'user-456', email: 'jane@example.com' }] });
      }
      if (sql.includes('UPDATE users SET password_reset_token_hash')) {
        return Promise.resolve({ rows: [{ user_id: 'user-456' }] });
      }
      if (sql.includes('INSERT INTO notifications')) {
        return Promise.resolve({ rows: [{ notification_id: 'notification-456' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const registeredEmailResponse = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'jane@example.com' });

    expect(registeredEmailResponse.status).toBe(200);
    expect(registeredEmailResponse.body).toEqual(missingEmailResponse.body);

    notifySpy.mockRestore();
  });

  it('resets a password using a valid reset token and invalidates it after first use', async () => {
    const resetToken = signPasswordResetToken('user-123', 'jane@example.com');
    const payload = verifyPasswordResetToken(resetToken);
    const tokenHash = crypto.createHash('sha256').update(payload.jti).digest('hex');

    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, password_reset_token_hash FROM users WHERE user_id = $1 LIMIT 1;')) {
        return Promise.resolve({
          rows: [{ user_id: 'user-123', password_reset_token_hash: tokenHash }],
        });
      }
      if (sql.includes('UPDATE users SET password_hash = $1, password_reset_token_hash = NULL WHERE user_id = $2;')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const firstResponse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'NewPassword123' });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.message).toBe('Password reset successful.');

    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT user_id, password_reset_token_hash FROM users WHERE user_id = $1 LIMIT 1;')) {
        return Promise.resolve({
          rows: [{ user_id: 'user-123', password_reset_token_hash: null }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const secondResponse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'AnotherPassword123' });

    expect(secondResponse.status).toBe(401);
    expect(secondResponse.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('honors a configurable reset-token lifetime', () => {
    config.passwordResetTokenLifetimeSeconds = 900;
    const resetToken = signPasswordResetToken('user-123', 'jane@example.com');
    const decoded = jwt.decode(resetToken);

    expect(decoded).toMatchObject({ userId: 'user-123', email: 'jane@example.com', tokenType: 'password-reset' });
    expect(decoded.exp - decoded.iat).toBe(900);
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
