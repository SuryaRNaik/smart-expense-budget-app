const express = require('express');
const bcrypt = require('bcryptjs');
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

const hashPassword = async (plainTextPassword) => {
  if (typeof plainTextPassword !== 'string' || plainTextPassword.length === 0) {
    throw new TypeError('Password must be a non-empty string.');
  }

  return bcrypt.hash(plainTextPassword, 10);
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
      [String(req.body.name).trim(), validation.normalizedEmail, passwordHash, 'User']
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

module.exports = router;
module.exports.normalizeEmail = normalizeEmail;
module.exports.validateRegistrationInput = validateRegistrationInput;
module.exports.hashPassword = hashPassword;
