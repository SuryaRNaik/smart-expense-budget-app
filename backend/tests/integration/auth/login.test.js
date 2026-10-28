jest.mock('../../../src/db', () => ({
  query: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../../src/app');
const config = require('../../../src/config');
const db = require('../../../src/db');
const { authenticateToken } = require('../../../src/auth/jwt');

const TEST_SECRET = 'test-secret-for-login-integration-tests-only';
const originalJwtSecret = config.jwtSecret;
const TEST_PASSWORD = 'Password123';
const TEST_USER = {
  user_id: 'login-user-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'User',
};
const protectedApp = express();

protectedApp.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

beforeAll(() => {
  config.jwtSecret = TEST_SECRET;
});

afterAll(() => {
  config.jwtSecret = originalJwtSecret;
});

describe('TC-Auth-01: login and JWT session (SEBM-F-002)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates valid credentials and returns a usable bearer token', async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
    db.query.mockResolvedValueOnce({ rows: [{ ...TEST_USER, password_hash: passwordHash }] });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  JANE@EXAMPLE.COM ', password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful.');
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.expiresIn).toBe(900);
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.refreshExpiresIn).toBe(7 * 24 * 60 * 60);
    expect(response.body.user).toEqual({
      userId: TEST_USER.user_id,
      name: TEST_USER.name,
      email: TEST_USER.email,
      role: TEST_USER.role,
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      ['jane@example.com']
    );

    const claims = jwt.verify(response.body.token, TEST_SECRET, { algorithms: ['HS256'] });
    expect(claims).toMatchObject({
      userId: TEST_USER.user_id,
      role: TEST_USER.role,
      tokenType: 'access',
    });
    expect(claims.exp - claims.iat).toBe(900);
    const refreshClaims = jwt.verify(response.body.refreshToken, TEST_SECRET, { algorithms: ['HS256'] });
    expect(refreshClaims).toMatchObject({
      userId: TEST_USER.user_id,
      role: TEST_USER.role,
      tokenType: 'refresh',
    });
    expect(refreshClaims.exp - refreshClaims.iat).toBe(7 * 24 * 60 * 60);

    const protectedResponse = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${response.body.token}`);
    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.body.user).toEqual({ userId: TEST_USER.user_id, role: TEST_USER.role });

    const refreshAsAccessResponse = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${response.body.refreshToken}`);
    expect(refreshAsAccessResponse.status).toBe(401);
  });

  it('refreshes an expired access session using a valid refresh token', async () => {
    const refreshToken = jwt.sign(
      { userId: TEST_USER.user_id, role: TEST_USER.role, tokenType: 'refresh' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.expiresIn).toBe(900);
    expect(jwt.verify(response.body.token, TEST_SECRET, { algorithms: ['HS256'] })).toMatchObject({
      userId: TEST_USER.user_id,
      role: TEST_USER.role,
      tokenType: 'access',
    });
  });

  it('rejects invalid refresh tokens with a generic unauthorized response', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it.each([
    ['unknown email', { rows: [] }],
    ['incorrect password', { rows: [{ ...TEST_USER, password_hash: '$2b$04$invalid-hash' }] }],
  ])('rejects %s with the same generic credentials error', async (description, result) => {
    db.query.mockResolvedValueOnce(result);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      },
    });
  });

  it('rejects missing credentials before querying the database', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: TEST_USER.email });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(db.query).not.toHaveBeenCalled();
  });
});
