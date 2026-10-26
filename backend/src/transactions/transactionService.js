const TransactionRepository = require('./transactionRepository');

const createError = (code, message, statusCode) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parseAmount = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  return Number(value);
};

const hasAtMostTwoDecimalPlaces = (value) =>
  /^\d+(?:\.\d{1,2})?$/.test(String(value).trim());

class TransactionService {
  constructor(repository = new TransactionRepository()) {
    this.repository = repository;
  }

  async listTransactions(userId) {
    return this.repository.findByUserId(userId);
  }

  async createTransaction(userId, data = {}) {
    const { accountId, categoryId, date } = data;
    const amount = parseAmount(data.amount);
    const type = data.type;

    if (typeof accountId !== 'string' || accountId.trim() === '') {
      throw createError('VALIDATION_ERROR', 'accountId is required.', 400);
    }
    if (typeof categoryId !== 'string' || categoryId.trim() === '') {
      throw createError('VALIDATION_ERROR', 'categoryId is required.', 400);
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
      throw createError('VALIDATION_ERROR', 'amount must be a valid positive amount.', 400);
    }
    if (!hasAtMostTwoDecimalPlaces(data.amount)) {
      throw createError('VALIDATION_ERROR', 'amount must have no more than two decimal places.', 400);
    }
    if (type !== 'Expense' && type !== 'Income') {
      throw createError('VALIDATION_ERROR', 'type must be either Expense or Income.', 400);
    }
    if (!isValidDate(date)) {
      throw createError('VALIDATION_ERROR', 'date must be a valid date in YYYY-MM-DD format.', 400);
    }
    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      throw createError('VALIDATION_ERROR', 'notes must be a string.', 400);
    }

    const notes = data.notes?.trim() || null;
    const { transaction, newBalance } = await this.repository.createAndUpdateBalance({
      userId,
      accountId: accountId.trim(),
      categoryId: categoryId.trim(),
      amount,
      type,
      date,
      notes,
    });

    return {
      transactionId: transaction.transactionId,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
      notes: transaction.notes,
      newBalance,
      createdAt: transaction.createdAt,
    };
  }
}

module.exports = TransactionService;
module.exports.createError = createError;
module.exports.hasAtMostTwoDecimalPlaces = hasAtMostTwoDecimalPlaces;
module.exports.isValidDate = isValidDate;
module.exports.parseAmount = parseAmount;
