const TransactionService = require('./transactionService');

const transactionService = new TransactionService();

const listTransactions = async (req, res, next) => {
  try {
    const transactions = await transactionService.listTransactions(req.user.userId);
    return res.json({ transactions });
  } catch (error) {
    return next(error);
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.createTransaction(req.user.userId, req.body);
    return res.status(201).json(transaction);
  } catch (error) {
    return next(error);
  }
};

module.exports = { listTransactions, createTransaction };
