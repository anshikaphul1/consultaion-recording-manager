const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/wallet - Get current user's wallet balance
router.get('/', async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) {
      wallet = new Wallet({ userId: req.user.userId, balance: 0 });
      await wallet.save();
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet balance.', error: error.message });
  }
});

// POST /api/wallet/recharge - Perform a mock payment, create Success transaction, and add to balance
router.post('/recharge', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid recharge amount.' });
    }

    let wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) {
      wallet = new Wallet({ userId: req.user.userId, balance: 0 });
    }

    wallet.balance += Number(amount);
    await wallet.save();

    const transaction = new Transaction({
      userId: req.user.userId,
      amount: Number(amount),
      type: 'recharge',
      status: 'Success',
      description: `Mock payment recharge of ₹${amount}`
    });
    await transaction.save();

    res.json({ message: 'Recharge successful.', wallet, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error processing wallet recharge.', error: error.message });
  }
});

// GET /api/wallet/transactions - Fetch transaction history
router.get('/transactions', async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.userId = req.user.userId;
    }
    const transactions = await Transaction.find(query)
      .populate('userId', 'name username role')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions.', error: error.message });
  }
});

module.exports = router;
