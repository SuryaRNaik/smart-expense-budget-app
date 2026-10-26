const db = require('../db');

const mapAccount = (row) => ({
  accountId: row.account_id,
  userId: row.user_id,
  accountType: row.account_type,
  accountName: row.account_name,
  balance: Number(row.balance),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

class AccountRepository {
  constructor(database = db) {
    this.db = database;
  }

  async findByUserId(userId) {
    const result = await this.db.query(
      `SELECT account_id, user_id, account_type, account_name, balance, created_at
       FROM accounts
       WHERE user_id = $1
       ORDER BY created_at DESC, account_id ASC`,
      [userId],
    );

    return result.rows.map(mapAccount);
  }

  async create({ userId, accountType, accountName, openingBalance }) {
    const result = await this.db.query(
      `INSERT INTO accounts (user_id, account_type, account_name, balance)
       VALUES ($1, $2, $3, $4)
       RETURNING account_id, user_id, account_type, account_name, balance, created_at`,
      [userId, accountType, accountName, openingBalance],
    );

    return mapAccount(result.rows[0]);
  }
}

module.exports = AccountRepository;
module.exports.mapAccount = mapAccount;
