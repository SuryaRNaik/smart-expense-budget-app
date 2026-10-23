const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_ALGORITHM = 'HS256';
const TOKEN_LIFETIME = '15m';
const VALID_ROLES = new Set(['User', 'Admin']);
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';

const sendUnauthorized = (res, code, message) =>
  res.status(401).json({
    error: {
      code,
      message,
    },
  });

const getJwtSecret = () => {
  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length === 0) {
    throw new Error('JWT_SECRET is not configured');
  }

  return config.jwtSecret;
};

const signTestToken = (userId, role) => {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new TypeError('userId must be a non-empty string');
  }

  if (!VALID_ROLES.has(role)) {
    throw new TypeError('role must be User or Admin');
  }

  return jwt.sign(
    { userId, role },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, expiresIn: TOKEN_LIFETIME }
  );
};

const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return sendUnauthorized(res, 'MISSING_AUTHORIZATION', 'Authorization header required');
  }

  const bearerMatch = authorization.match(/^Bearer\s+(\S+)$/);
  if (!bearerMatch) {
    return sendUnauthorized(res, 'INVALID_AUTHORIZATION', 'Authorization header must use Bearer scheme');
  }

  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length === 0) {
    return res.status(500).json({
      error: {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'Authentication is not configured',
      },
    });
  }

  let payload;
  try {
    payload = jwt.verify(bearerMatch[1], getJwtSecret(), { algorithms: [JWT_ALGORITHM] });
  } catch (error) {
    return sendUnauthorized(res, 'INVALID_TOKEN', INVALID_TOKEN_MESSAGE);
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.userId !== 'string' ||
    payload.userId.trim().length === 0 ||
    !VALID_ROLES.has(payload.role) ||
    typeof payload.exp !== 'number'
  ) {
    return sendUnauthorized(res, 'INVALID_TOKEN', INVALID_TOKEN_MESSAGE);
  }

  req.user = { userId: payload.userId, role: payload.role };
  return next();
};

module.exports = { authenticateToken, signTestToken };