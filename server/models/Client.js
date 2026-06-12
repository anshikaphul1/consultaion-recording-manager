const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  dob: {
    type: Date
  },
  birthTime: {
    type: String, // format e.g., "14:30"
    trim: true
  },
  birthPlace: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);

