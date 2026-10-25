const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

/**
 * POST /api/budgets
 * Creates a new budget entry for the authenticated user.
 * 
 * Required Body Fields:
 * - user_id (string)
 * - period (string)
 * - limit_amount (number > 0)
 * 
 * Optional Body Fields:
 * - category_id (string or null)
 * - alert_threshold (number, 0-100, defaults to 80.00)
 */
router.post('/', async (req, res, next) => {
  try {
    const { user_id, category_id = null, period, limit_amount, alert_threshold = 80.00 } = req.body;

    // 1. Input Validation
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id is required and must be a string.' });
    }

    if (!period || typeof period !== 'string') {
      return res.status(400).json({ error: 'period is required and must be a string.' });
    }

    const parsedLimit = parseFloat(limit_amount);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ error: 'limit_amount must be a positive number greater than 0.' });
    }

    const parsedThreshold = parseFloat(alert_threshold);
    if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
      return res.status(400).json({ error: 'alert_threshold must be a number between 0 and 100.' });
    }

    const pool = getPool();

    // 2. Check for Duplicate Budget
    const existingCheck = await pool.query(
      `SELECT budget_id FROM budgets 
       WHERE user_id = $1 
         AND (category_id = $2 OR (category_id IS NULL AND $2 IS NULL)) 
         AND period = $3`,
      [user_id, category_id, period]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'A budget already exists for this category and period.' });
    }

    // 3. Insert New Budget Record
    const insertQuery = `
      INSERT INTO budgets (user_id, category_id, period, limit_amount, alert_threshold)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING budget_id, user_id, category_id, period, limit_amount, alert_threshold;
    `;

    const result = await pool.query(insertQuery, [
      user_id,
      category_id,
      period,
      parsedLimit,
      parsedThreshold
    ]);

    return res.status(201).json({
      message: 'Budget created successfully',
      budget: result.rows[0]
    });
  } catch (err) {
    // Handle Postgres Foreign Key Violation (e.g. invalid user_id or category_id)
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid user_id or category_id provided.' });
    }
    next(err);
  }
});

module.exports = router;