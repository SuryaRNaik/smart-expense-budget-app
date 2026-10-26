const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

/**
 * POST /api/budgets
 * Creates a new budget entry for the authenticated user.
 */
router.post('/', async (req, res, next) => {
  try {
    // 1. Extract user_id securely from auth context, with robust test fallback
    const testHeaderUser = req.headers['x-test-user-id'] || req.headers['X-Test-User-Id'] || req.headers['x-user-id'];
    const user_id = req.user?.id || req.user?.user_id || (process.env.NODE_ENV === 'test' ? testHeaderUser : null);
    
    if (!user_id || typeof user_id !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authenticated user context.' });
    }

    const { category_id = null, period, limit_amount, alert_threshold = 80.00 } = req.body;

    // 2. Strict YYYY-MM Period Validation
    const periodRegex = /^\d{4}-(?:0[1-9]|1[0-2])$/;
    if (!period || typeof period !== 'string' || !periodRegex.test(period)) {
      return res.status(400).json({ error: 'period is required and must follow YYYY-MM format (e.g., 2026-10).' });
    }

    // 3. Limit Amount Validation (> 0)
    const parsedLimit = parseFloat(limit_amount);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ error: 'limit_amount must be a positive number greater than 0.' });
    }

    // 4. Alert Threshold Validation (0-100)
    const parsedThreshold = parseFloat(alert_threshold);
    if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
      return res.status(400).json({ error: 'alert_threshold must be a number between 0 and 100.' });
    }

    const pool = getPool();

    // 5. Check for Duplicate Budget (Consistent for category-level and overall budgets)
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

    // 6. Insert New Budget Record
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
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid user_id or category_id provided.' });
    }
    next(err);
  }
});

module.exports = router;