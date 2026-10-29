const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const {
  signAuthToken,
  signRefreshToken,
  verifyRefreshToken,
  TOKEN_LIFETIME_SECONDS,
  REFRESH_TOKEN_LIFETIME_SECONDS,
} = require('./jwt');

const router = express.Router();
const PASSWORD_RESET_TOKEN_LIFETIME_SECONDS = 30 * 60;

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const validateRegistrationInput = ({ name, email, password }) => {
  const errors = [];
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = normalizeEmail(email);

  if (!trimmedName) {
    errors.push('Name is required.');
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    errors.push('Please provide a valid email address.');
  }

  if (typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedEmail,
  };
};

const validatePasswordResetRequestInput = ({ email }) => {
  const errors = [];
  const normalizedEmail = normalizeEmail(email);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    errors.push('Please provide a valid email address.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedEmail,
  };
};

const validatePasswordResetSubmission = ({ password, newPassword, token, resetToken }) => {
  const normalizedPassword = typeof newPassword === 'string' ? newPassword : typeof password === 'string' ? password : '';
  const resetTokenValue = typeof resetToken === 'string' ? resetToken : typeof token === 'string' ? token : '';
  const errors = [];

  if (typeof normalizedPassword !== 'string' || normalizedPassword.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (!resetTokenValue) {
    errors.push('A reset token is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedPassword,
    resetTokenValue,
  };
};

const hashPassword = async (plainTextPassword) => {
  if (typeof plainTextPassword !== 'string' || plainTextPassword.length === 0) {
    throw new TypeError('Password must be a non-empty string.');
  }

  return bcrypt.hash(plainTextPassword, 10);
};

const signPasswordResetToken = (userId, email) => {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new TypeError('userId must be a non-empty string.');
  }

  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new TypeError('A valid email address is required for a password reset token.');
  }

  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length === 0) {
    throw new Error('Authentication is not configured');
  }

  return jwt.sign(
    {
      userId,
      email: normalizedEmail,
      tokenType: 'password-reset',
    },
    config.jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: PASSWORD_RESET_TOKEN_LIFETIME_SECONDS,
    }
  );
};

const verifyPasswordResetToken = (token) => {
  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length === 0) {
    throw new Error('Authentication is not configured');
  }

  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new TypeError('A reset token is required.');
  }

  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.userId !== 'string' ||
    payload.userId.trim().length === 0 ||
    !payload.email ||
    typeof payload.email !== 'string' ||
    payload.tokenType !== 'password-reset'
  ) {
    throw new TypeError('Invalid or expired password reset token.');
  }

  return {
    userId: payload.userId,
    email: normalizeEmail(payload.email),
  };
};

router.post('/register', async (req, res, next) => {
  try {
    const validation = validateRegistrationInput(req.body || {});

    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(' '),
        },
      });
    }

    const existingUser = await db.query('SELECT user_id, email FROM users WHERE email = $1 LIMIT 1;', [
      validation.normalizedEmail,
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'An account with this email already exists.',
        },
      });
    }

    const passwordHash = await hashPassword(req.body.password);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, role;`,
      [String(req.body.name).trim(), validation.normalizedEmail, passwordHash, 'user']
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid email and password are required.',
        },
      });
    }

    if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length === 0) {
      return res.status(500).json({
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'Authentication is not configured',
        },
      });
    }

    const result = await db.query(
      `SELECT user_id, name, email, password_hash, role
       FROM users
       WHERE email = $1
       LIMIT 1;`,
      [normalizedEmail]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: signAuthToken(user.user_id, user.role),
      refreshToken: signRefreshToken(user.user_id, user.role),
      tokenType: 'Bearer',
      expiresIn: TOKEN_LIFETIME_SECONDS,
      refreshExpiresIn: REFRESH_TOKEN_LIFETIME_SECONDS,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};

  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length === 0) {
    return res.status(500).json({
      error: {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'Authentication is not configured',
      },
    });
  }

  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A refresh token is required.',
      },
    });
  }

  try {
    const user = verifyRefreshToken(refreshToken);
    return res.status(200).json({
      token: signAuthToken(user.userId, user.role),
      tokenType: 'Bearer',
      expiresIn: TOKEN_LIFETIME_SECONDS,
    });
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token.',
      },
    });
  }
});

router.post(['/forgot-password', '/request-reset', '/request-password-reset'], async (req, res, next) => {
  try {
    const validation = validatePasswordResetRequestInput(req.body || {});

    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(' '),
        },
      });
    }

    const result = await db.query(
      'SELECT user_id, email FROM users WHERE email = $1 LIMIT 1;',
      [validation.normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const user = result.rows[0];
    const resetToken = signPasswordResetToken(user.user_id, user.email);

    return res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      resetToken,
      resetUrl: `/reset-password?token=${encodeURIComponent(resetToken)}`,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { password, newPassword, token, resetToken } = req.body || {};
    const validation = validatePasswordResetSubmission({
      password,
      newPassword,
      token,
      resetToken,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(' '),
        },
      });
    }

    const payload = verifyPasswordResetToken(validation.resetTokenValue);
    const existingUser = await db.query('SELECT user_id FROM users WHERE user_id = $1 LIMIT 1;', [payload.userId]);

    if (existingUser.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired password reset token.',
        },
      });
    }

    const passwordHash = await hashPassword(validation.normalizedPassword);
    await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2;', [
      passwordHash,
      payload.userId,
    ]);

    return res.status(200).json({
      message: 'Password reset successful.',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired password reset token.',
        },
      });
    }

    return next(error);
  }
});

router.post('/verify-reset-token', async (req, res) => {
  try {
    const payload = verifyPasswordResetToken(req.body?.token || req.body?.resetToken);
    return res.status(200).json({
      valid: true,
      userId: payload.userId,
      email: payload.email,
    });
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired password reset token.',
      },
    });
  }
});

module.exports = router;
module.exports.normalizeEmail = normalizeEmail;
module.exports.validateRegistrationInput = validateRegistrationInput;
module.exports.validatePasswordResetRequestInput = validatePasswordResetRequestInput;
module.exports.validatePasswordResetSubmission = validatePasswordResetSubmission;
module.exports.signPasswordResetToken = signPasswordResetToken;
module.exports.verifyPasswordResetToken = verifyPasswordResetToken;
module.exports.hashPassword = hashPassword;
