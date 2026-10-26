const AccountRepository = require('./accountRepository');

const createError = (code, message, statusCode) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const parseOpeningBalance = (value) => {
  if (value === undefined) return 0;
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  return Number(value);
};

const hasAtMostTwoDecimalPlaces = (value) =>
  /^-?\d+(?:\.\d{1,2})?$/.test(String(value).trim());

class AccountService {
  constructor(repository = new AccountRepository()) {
    this.repository = repository;
  }

  async listAccounts(userId) {
    return this.repository.findByUserId(userId);
  }

  async createAccount(userId, data = {}) {
    const accountType = typeof data.accountType === 'string' ? data.accountType.trim() : '';
    const accountName = typeof data.accountName === 'string' ? data.accountName.trim() : '';
    const openingBalance = parseOpeningBalance(data.openingBalance);

    if (!accountType || accountType.length > 50) {
      throw createError('VALIDATION_ERROR', 'accountType is required and must not exceed 50 characters.', 400);
    }
    if (!accountName || accountName.length > 100) {
      throw createError('VALIDATION_ERROR', 'accountName is required and must not exceed 100 characters.', 400);
    }
    if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) > 9999999999.99) {
      throw createError('VALIDATION_ERROR', 'openingBalance must be a valid amount.', 400);
    }
    if (!hasAtMostTwoDecimalPlaces(data.openingBalance ?? 0)) {
      throw createError('VALIDATION_ERROR', 'openingBalance must have no more than two decimal places.', 400);
    }

    return this.repository.create({ userId, accountType, accountName, openingBalance });
  }
}

module.exports = AccountService;
module.exports.createError = createError;
module.exports.hasAtMostTwoDecimalPlaces = hasAtMostTwoDecimalPlaces;
module.exports.parseOpeningBalance = parseOpeningBalance;
