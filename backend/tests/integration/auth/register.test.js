jest.mock('../../../src/db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/db');

describe('S1-01: registration API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user with a hashed password and returns a user payload', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 'user-123', name: 'Jane Doe', email: 'jane@example.com', role: 'user' }],
      });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'JANE@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully.');
    expect(response.body.user).toMatchObject({
      userId: 'user-123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'user',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[0][0]).toContain('SELECT');
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO users');
    expect(db.query.mock.calls[1][1][2]).toMatch(/^\$2[aby]\$/);
    expect(db.query.mock.calls[1][1][3]).toBe('user');
  });

  it('rejects invalid email format with a 400 response', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'not-an-email',
        password: 'Password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('valid email');
  });

  it('rejects an already-registered email with a 409 response', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ user_id: 'existing-user', email: 'jane@example.com' }],
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(response.body.error.message).toBe('An account with this email already exists.');
  });
});
