const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Consultation = require('../models/Consultation');
const ChatMessage = require('../models/ChatMessage');
const auth = require('../middleware/auth');

// Ensure uploads/recordings directory exists
const recordingsDir = path.join(__dirname, '../uploads/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Multer Config with 50MB file size limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, recordingsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
});

router.use(auth);

// Helper function to check role-based access to a session
const hasSessionAccess = (user, session) => {
  if (user.role === 'admin') return true;
  
  const isClient = user.clientRef && session.client && user.clientRef.toString() === session.client.toString();
  const isAstrologer = user.astrologerRef && session.astrologer && user.astrologerRef.toString() === session.astrologer.toString();
  
  return isClient || isAstrologer;
};

/**
 * POST /api/sessions/:sessionId/recording
 * Upload and save call audio recording, update session recordingUrl
 */
router.post('/:sessionId/recording', upload.single('audio'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded.' });
    }

    const session = await Consultation.findById(sessionId);
    if (!session) {
      // Clean up uploaded file if session not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Save relative URL path to DB
    const relativeUrl = `/uploads/recordings/${req.file.filename}`;
    session.recordingUrl = relativeUrl;
    await session.save();

    res.json({
      message: 'Recording uploaded successfully.',
      recordingUrl: relativeUrl,
      session
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error uploading call recording.', error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/chat
 * Fetch chat transcript for a session (role-checked)
 */
router.get('/:sessionId/chat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Consultation.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Role check
    if (!hasSessionAccess(req.user, session)) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to view this transcript.' });
    }

    const chatHistory = await ChatMessage.find({ sessionId })
      .populate('senderId', 'name username')
      .sort({ timestamp: 1 }); // Sort by time ascending

    res.json(chatHistory);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving chat transcript.', error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/recording
 * Stream/download the audio recording (role-checked)
 */
router.get('/:sessionId/recording', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Consultation.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (!session.recordingUrl) {
      return res.status(404).json({ message: 'No audio recording available for this session.' });
    }

    // Role check
    if (!hasSessionAccess(req.user, session)) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to stream this recording.' });
    }

    // Get absolute file path
    const filePath = path.join(__dirname, '..', session.recordingUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Recording file not found on disk.' });
    }

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching call recording.', error: error.message });
  }
});

/*
 * NOTE ON STORAGE CLEANUP CRON JOB:
 * To automate database/filesystem storage cleanup, you can schedule a cron job 
 * (e.g., using `node-cron` package) that runs daily and executes:
 * 
 * const cron = require('node-cron');
 * cron.schedule('0 0 * * *', async () => {
 *   const retentionDays = 30; // Customize retention period
 *   const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
 *   
 *   const expiredSessions = await Consultation.find({ 
 *     createdAt: { $lt: cutoffDate }, 
 *     recordingUrl: { $ne: null } 
 *   });
 *   
 *   for (const session of expiredSessions) {
 *     const filePath = path.join(__dirname, '..', session.recordingUrl);
 *     if (fs.existsSync(filePath)) {
 *       fs.unlinkSync(filePath);
 *       console.log(`Deleted file: ${filePath}`);
 *     }
 *     session.recordingUrl = null;
 *     await session.save();
 *   }
 *   console.log('Expired recordings cleaned successfully.');
 * });
 */

module.exports = router;
