const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

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

module.exports = router;
module.exports.normalizeEmail = normalizeEmail;
module.exports.validateRegistrationInput = validateRegistrationInput;
module.exports.hashPassword = hashPassword;
