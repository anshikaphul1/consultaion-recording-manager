const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  astrologer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Astrologer',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  audioUrl: {
    type: String, // Path or URL to the uploaded audio file
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0
  },
  tags: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Live', 'Completed', 'Cancelled'],
    default: 'Completed'
  },
  amount: {
    type: Number,
    default: 0
  },
  recordingUrl: {
    type: String,
    default: null
  },
  chatTranscriptAvailable: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Consultation', consultationSchema);
