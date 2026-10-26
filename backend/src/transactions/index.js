const express = require('express');
const { authenticateToken } = require('../auth/jwt');
const { createTransaction, listTransactions } = require('./transactionController');

const router = express.Router();

router.use(authenticateToken);
router.get('/', listTransactions);
router.post('/', createTransaction);

module.exports = router;
