const request = require('supertest');
const app = require('../../src/app');

describe('Health Endpoint (Integration)', () => {
  it('GET /health returns 200 with service info', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok', true);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'smart-expense-budget-app-backend');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /api/health returns 200 with service info', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ok', true);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'smart-expense-budget-app-backend');
  });
});
