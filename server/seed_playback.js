const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const Consultation = require('./models/Consultation');
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/consultation-recording-manager";

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Seeding playback demo data...');
    
    // Find a completed consultation session
    const session = await Consultation.findOne({ status: 'Completed' });
    if (!session) {
      console.log('No completed session found. Please run "node seed.js" first to populate basic database listings.');
      process.exit(1);
    }
    
    // Create dummy audio file
    const recordingsDir = path.join(__dirname, 'uploads/recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    
    const mockFileName = 'recording-mock.webm';
    const mockFilePath = path.join(recordingsDir, mockFileName);
    fs.writeFileSync(mockFilePath, 'Dummy WebM audio content for testing playback');
    
    // Update session
    session.recordingUrl = `/uploads/recordings/${mockFileName}`;
    session.chatTranscriptAvailable = true;
    await session.save();
    console.log(`Updated consultation session ${session._id} with mock audio url and transcript availability.`);

    // Find the client and astrologer user IDs
    const clientUser = await User.findOne({ clientRef: session.client });
    const astroUser = await User.findOne({ astrologerRef: session.astrologer });

    if (!clientUser || !astroUser) {
      console.log('Associated Client or Astrologer User account not found.');
      process.exit(1);
    }

    // Clean old messages for this session
    await ChatMessage.deleteMany({ sessionId: session._id });

    // Seed mock chat messages
    const mockMessages = [
      {
        sessionId: session._id,
        senderId: clientUser._id,
        senderRole: 'client',
        message: 'Hello Pandit ji, namaskar. I wanted to ask about my career prospects in 2026.',
        timestamp: new Date(session.date.getTime() + 1000 * 10)
      },
      {
        sessionId: session._id,
        senderId: astroUser._id,
        senderRole: 'astrologer',
        message: 'Namaskar. Looking at your chart, Jupiter is entering your 10th house in mid-2026. This indicates a major positive shift.',
        timestamp: new Date(session.date.getTime() + 1000 * 60)
      },
      {
        sessionId: session._id,
        senderId: clientUser._id,
        senderRole: 'client',
        message: 'That sounds promising! Are there any remedies I should perform?',
        timestamp: new Date(session.date.getTime() + 1000 * 120)
      },
      {
        sessionId: session._id,
        senderId: astroUser._id,
        senderRole: 'astrologer',
        message: 'Yes, feeding birds daily and wearing a yellow sapphire will strengthen your Jupiter.',
        timestamp: new Date(session.date.getTime() + 1000 * 180)
      }
    ];

    await ChatMessage.insertMany(mockMessages);
    console.log('Seeded demo conversation chat messages successfully.');
    console.log('Demo data preparation complete! Playback features are now ready for testing.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error seeding playback:', err);
    process.exit(1);
  });
