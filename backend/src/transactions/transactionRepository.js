const db = require('../db');

const mapTransaction = (row) => ({
  transactionId: row.transaction_id,
  accountId: row.account_id,
  categoryId: row.category_id,
  amount: Number(row.amount),
  date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
  type: row.type,
  notes: row.notes,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

const mapCategory = (row) => ({
  categoryId: row.category_id,
  name: row.name,
  type: row.type,
});

class TransactionRepository {
  constructor(database = db) {
    this.db = database;
  }

  async findByUserId(userId) {
    const result = await this.db.query(
      `SELECT transactions.transaction_id, transactions.account_id, transactions.category_id,
              transactions.amount, transactions.date, transactions.type, transactions.notes,
              transactions.created_at
       FROM transactions
       INNER JOIN accounts ON accounts.account_id = transactions.account_id
       WHERE accounts.user_id = $1
       ORDER BY transactions.date DESC, transactions.created_at DESC`,
      [userId],
    );

    return result.rows.map(mapTransaction);
  }

  async findCategoriesByUserId(userId) {
    const result = await this.db.query(
      `SELECT category_id, name, type
       FROM categories
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY type ASC, name ASC, category_id ASC`,
      [userId],
    );

    return result.rows.map(mapCategory);
  }

  async createCustomCategory({ userId, name, type }) {
    const client = await this.db.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      // The unique constraint is case-sensitive, so serialise creates for the same
      // user, type and case-insensitive name to keep names unique ignoring case.
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`custom-category:${userId}:${type}:${name.toLowerCase()}`],
      );

      const duplicate = await client.query(
        `SELECT category_id
         FROM categories
         WHERE type = $1
           AND LOWER(name) = LOWER($2)
           AND (user_id IS NULL OR user_id = $3)
         LIMIT 1`,
        [type, name, userId],
      );

      if (duplicate.rows.length > 0) {
        const error = new Error('A category with this name and type already exists.');
        error.code = 'CATEGORY_EXISTS';
        error.statusCode = 409;
        throw error;
      }

      const result = await client.query(
        `INSERT INTO categories (user_id, name, type, is_custom)
         VALUES ($1, $2, $3, TRUE)
         RETURNING category_id, name, type`,
        [userId, name, type],
      );

      await client.query('COMMIT');
      return mapCategory(result.rows[0]);
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Failed to roll back custom category creation.', rollbackError);
        }
      }
      if (error.code === '23505') {
        const conflict = new Error('A category with this name and type already exists.');
        conflict.code = 'CATEGORY_EXISTS';
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async createAndUpdateBalance({ userId, accountId, categoryId, amount, type, date, notes }) {
    const client = await this.db.getClient();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const accountResult = await client.query(
        `SELECT account_id, balance
         FROM accounts
         WHERE account_id = $1 AND user_id = $2
         FOR UPDATE`,
        [accountId, userId],
      );

      if (accountResult.rows.length === 0) {
        const error = new Error('Account not found.');
        error.code = 'ACCOUNT_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }

      const categoryResult = await client.query(
        `SELECT category_id
         FROM categories
         WHERE category_id = $1
           AND type = $2
           AND (user_id IS NULL OR user_id = $3)`,
        [categoryId, type, userId],
      );

      if (categoryResult.rows.length === 0) {
        const error = new Error('Category not found or does not match the transaction type.');
        error.code = 'INVALID_CATEGORY';
        error.statusCode = 400;
        throw error;
      }

      const transactionResult = await client.query(
        `INSERT INTO transactions (account_id, category_id, amount, date, type, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING transaction_id, account_id, category_id, amount, date, type, notes, created_at`,
        [accountId, categoryId, amount, date, type, notes],
      );

      const balanceChange = type === 'expense' ? -amount : amount;
      const accountUpdate = await client.query(
        `UPDATE accounts
         SET balance = balance + $1
         WHERE account_id = $2 AND user_id = $3
         RETURNING balance`,
        [balanceChange, accountId, userId],
      );

      if (accountUpdate.rows.length === 0) {
        const error = new Error('Account not found.');
        error.code = 'ACCOUNT_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }

      await client.query('COMMIT');

      return {
        transaction: mapTransaction(transactionResult.rows[0]),
        newBalance: Number(accountUpdate.rows[0].balance),
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Failed to roll back transaction creation.', rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = TransactionRepository;
module.exports.mapTransaction = mapTransaction;
module.exports.mapCategory = mapCategory;
