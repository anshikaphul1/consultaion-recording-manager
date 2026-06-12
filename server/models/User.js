const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'astrologer'],
    default: 'user'
  },
  clientRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  astrologerRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Astrologer',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
