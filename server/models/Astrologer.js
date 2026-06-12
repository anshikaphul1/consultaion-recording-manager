const mongoose = require('mongoose');

const astrologerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  specialties: {
    type: [String],
    default: []
  },
  languages: {
    type: [String],
    default: ['Hindi', 'English']
  },
  ratePerMin: {
    type: Number,
    required: true,
    default: 10
  },
  experience: {
    type: Number,
    default: 0
  },
  bio: {
    type: String,
    default: ''
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  photoUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Astrologer', astrologerSchema);
