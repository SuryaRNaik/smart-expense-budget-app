const express = require('express');
const request = require('supertest');
const config = require('../../../src/config');
const { authenticateToken, signTestToken } = require('../../../src/auth/jwt');

const TEST_SECRET = 'test-secret-for-auth-integration-tests-only';
const originalJwtSecret = config.jwtSecret;
const app = express();

app.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

describe('TC-Auth-01: JWT middleware integration (SEBM-F-002)', () => {
  // AC-SEBM-F-002: Valid credentials grant access to the dashboard; invalid credentials are rejected with an error message.
  beforeAll(() => {
    config.jwtSecret = TEST_SECRET;
  });

  afterAll(() => {
    config.jwtSecret = originalJwtSecret;
  });

  it('allows a valid test token and exposes the authenticated user', async () => {
    const token = signTestToken('user-integration', 'User');
    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { userId: 'user-integration', role: 'User' } });
  });

  it.each([
    ['missing authorization', undefined, 'MISSING_AUTHORIZATION'],
    ['wrong authorization scheme', 'Basic abc123', 'INVALID_AUTHORIZATION'],
    ['malformed token', 'Bearer malformed', 'INVALID_TOKEN'],
  ])('returns a standard error envelope for %s', async (description, authorization, code) => {
    const testRequest = request(app).get('/protected');
    if (authorization) testRequest.set('Authorization', authorization);
    const response = await testRequest;

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(code);
    expect(response.body.error.message).toBeDefined();
  });
});