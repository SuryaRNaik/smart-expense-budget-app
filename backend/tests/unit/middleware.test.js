const { errorHandler, notFoundHandler } = require('../../src/middleware');

describe('Middleware (Unit)', () => {
  describe('notFoundHandler', () => {
    it('returns a 404 status with standardized JSON error envelope', () => {
      const req = { originalUrl: '/api/unknown-endpoint' };
      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };

      notFoundHandler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found: /api/unknown-endpoint',
        },
      });
    });
  });

  describe('errorHandler', () => {
    it('formats errors into standardized JSON error envelope', () => {
      const err = new Error('Database query failed');
      err.statusCode = 500;
      err.code = 'DB_ERROR';

      const req = {};
      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: 'DB_ERROR',
          message: 'Database query failed',
        },
      });
    });

    it('falls back to default statusCode and INTERNAL_ERROR code', () => {
      const err = new Error('Something broke');
      const req = {};
      const res = {
        statusCode: null,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something broke',
        },
      });
    });
  });
});
