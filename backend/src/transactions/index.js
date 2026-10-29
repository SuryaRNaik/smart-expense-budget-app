const express = require('express');
const { authenticateToken } = require('../auth/jwt');
const {
  createTransaction,
  listCategories,
  createCategory,
  listTransactions,
} = require('./transactionController');

const router = express.Router();

router.use(authenticateToken);
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.get('/', listTransactions);
router.post('/', createTransaction);

module.exports = router;
