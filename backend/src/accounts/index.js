const express = require('express');
const { authenticateToken } = require('../auth/jwt');
const { createAccount, listAccounts } = require('./accountController');

const router = express.Router();

router.use(authenticateToken);
router.get('/', listAccounts);
router.post('/', createAccount);

module.exports = router;
