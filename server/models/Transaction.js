const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['recharge', 'payment', 'payout'],
    required: true
  },
  status: {
    type: String,
    enum: ['Success', 'Pending', 'Failed'],
    default: 'Success'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
