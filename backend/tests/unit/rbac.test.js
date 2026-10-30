const requireRoleModule = require('../../src/middleware/rbac');
const { requireRole, normalizeRole } = require('../../src/middleware/rbac');
const middlewareIndex = require('../../src/middleware');

describe('TC-Sec-06: requireRole middleware (SEBM-SR-005)', () => {
  const createMockRes = () => ({
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
  });

  it('is exported as a callable middleware and from the middleware index', () => {
    expect(typeof requireRoleModule).toBe('function');
    expect(middlewareIndex.requireRole).toBeDefined();
    expect(typeof middlewareIndex.requireRole).toBe('function');
    expect(middlewareIndex.requireRole).toBe(requireRole);
  });

  it('normalizes role names case-insensitively', () => {
    expect(normalizeRole(' Admin ')).toBe('admin');
    expect(normalizeRole('USER')).toBe('user');
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole('')).toBeNull();
  });

  it('allows access when the user role matches the required role', () => {
    const middleware = requireRole('Admin');
    const req = { user: { userId: 'admin-1', role: 'admin' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('accepts a list of allowed roles', () => {
    const middleware = requireRole(['Admin', 'Support']);
    const req = { user: { userId: 'support-1', role: 'support' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('allows access when the user role matches any listed permission', () => {
    const middleware = requireRole(['Auditor', 'Admin']);
    const req = { user: { userId: 'audit-1', role: 'AUDITOR' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('denies access with a standard FORBIDDEN error for a non-matching role', () => {
    const middleware = requireRole('Admin');
    const req = { user: { userId: 'user-1', role: 'user' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: insufficient permissions.',
      },
    });
  });

  it('rejects unauthenticated requests with MISSING_AUTHORIZATION', () => {
    const middleware = requireRole('Admin');
    const req = {};
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'MISSING_AUTHORIZATION',
        message: 'Authentication required.',
      },
    });
  });

  it('rejects requests when req.user exists but has no string role', () => {
    const middleware = requireRole('Admin');
    const req = { user: { userId: 'admin-1', role: null } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('MISSING_AUTHORIZATION');
  });

  it('fails closed when the required role configuration is invalid', () => {
    const middleware = requireRole('');
    const req = { user: { userId: 'admin-1', role: 'admin' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('fails closed when all configured roles are blank', () => {
    const middleware = requireRole(['', '   ']);
    const req = { user: { userId: 'admin-1', role: 'admin' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('treats a role array with mixed casing as valid when it matches', () => {
    const middleware = requireRole(['Support', 'Admin']);
    const req = { user: { userId: 'admin-2', role: 'ADMIN' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects access when the user role is not a string even if req.user exists', () => {
    const middleware = requireRole('Admin');
    const req = { user: { userId: 'admin-3', role: 42 } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('MISSING_AUTHORIZATION');
  });
});
