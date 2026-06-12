const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Consultation = require('../models/Consultation');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common audio formats
  const allowedExts = /mp3|wav|ogg|m4a|mpeg|webm|mp4/;
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const isAudioMime = file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream' || allowedExts.test(file.mimetype);

  if (extname || isAudioMime) {
    return cb(null, true);
  }
  cb(new Error('Only audio files are allowed!'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.use(auth);

// GET /api/consultations - List with advanced filters (search client, date range, tag)
router.get('/', async (req, res) => {
  try {
    const { clientSearch, startDate, endDate, tag, astrologerId } = req.query;
    let query = {};

    // Filter by Client Name (search in Client collection first)
    if (clientSearch) {
      const matchingClients = await Client.find({
        name: { $regex: clientSearch, $options: 'i' }
      });
      const clientIds = matchingClients.map(c => c._id);
      query.client = { $in: clientIds };
    }

    // Filter by Date Range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Filter by Tag
    if (tag) {
      query.tags = tag; // Mongoose queries arrays directly
    }

    // Filter by Astrologer
    if (astrologerId) {
      query.astrologer = astrologerId;
    }

    const consultations = await Consultation.find(query)
      .populate('client')
      .populate('astrologer')
      .sort({ date: -1 });

    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving consultations.', error: error.message });
  }
});

// GET /api/consultations/client/:clientId - Get consultations for a specific client
router.get('/client/:clientId', async (req, res) => {
  try {
    const consultations = await Consultation.find({ client: req.params.clientId })
      .populate('astrologer')
      .sort({ date: -1 });
    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving client consultations.', error: error.message });
  }
});

// GET /api/consultations/:id - Get single consultation detail
router.get('/:id', async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('client')
      .populate('astrologer');
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }
    res.json(consultation);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving consultation.', error: error.message });
  }
});

// POST /api/consultations - Create consultation with optional audio upload
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    const { client, astrologer, date, notes, duration, status } = req.body;
    let { tags } = req.body;

    if (!client || !astrologer || !date) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Client, Astrologer, and Date are required fields.' });
    }

    // Parse tags (could be a JSON string or comma separated)
    let tagsArray = [];
    if (tags) {
      try {
        tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    let audioUrl = '';
    if (req.file) {
      // Save relative upload URL
      audioUrl = `/uploads/${req.file.filename}`;
    }

    const consultation = new Consultation({
      client,
      astrologer,
      date: new Date(date),
      audioUrl,
      notes: notes || '',
      duration: duration ? parseInt(duration, 10) : 0,
      tags: tagsArray,
      status: status || 'Completed'
    });

    await consultation.save();
    const populated = await consultation.populate(['client', 'astrologer']);
    res.status(201).json(populated);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error creating consultation.', error: error.message });
  }
});

// PUT /api/consultations/:id - Update consultation details
router.put('/:id', upload.single('audio'), async (req, res) => {
  try {
    const { client, astrologer, date, notes, duration, status } = req.body;
    let { tags } = req.body;

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    // Parse tags
    let tagsArray = consultation.tags;
    if (tags !== undefined) {
      try {
        tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    if (client) consultation.client = client;
    if (astrologer) consultation.astrologer = astrologer;
    if (date) consultation.date = new Date(date);
    if (notes !== undefined) consultation.notes = notes;
    if (duration !== undefined) consultation.duration = parseInt(duration, 10);
    if (status) consultation.status = status;
    if (tags !== undefined) consultation.tags = tagsArray;

    // Handle audio file replacement
    if (req.file) {
      // Delete old file if it exists
      if (consultation.audioUrl) {
        const oldFilePath = path.join(__dirname, '..', consultation.audioUrl);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.error('Failed to delete old audio file:', e);
          }
        }
      }
      consultation.audioUrl = `/uploads/${req.file.filename}`;
    }

    await consultation.save();
    const populated = await consultation.populate(['client', 'astrologer']);
    res.json(populated);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error updating consultation.', error: error.message });
  }
});

// DELETE /api/consultations/:id - Delete consultation and clean up local audio file
router.delete('/:id', async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    // Delete associated audio file from filesystem
    if (consultation.audioUrl) {
      const filePath = path.join(__dirname, '..', consultation.audioUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Failed to delete audio file on deletion:', e);
        }
      }
    }

    await Consultation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Consultation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting consultation.', error: error.message });
  }
});

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Astrologer = require('../models/Astrologer');

// POST /api/consultations/call/end - End session, deduct wallet, create transactions
router.post('/call/end', async (req, res) => {
  try {
    const { clientId, astrologerId, durationSeconds, sessionId } = req.body;
    if (!clientId || !astrologerId || durationSeconds === undefined) {
      return res.status(400).json({ message: 'clientId, astrologerId, and durationSeconds are required.' });
    }

    const durationMins = Math.max(1, Math.ceil(durationSeconds / 60)); // minimum 1 min billing

    // Fetch astrologer
    const astrologer = await Astrologer.findById(astrologerId);
    if (!astrologer) {
      return res.status(404).json({ message: 'Astrologer not found.' });
    }

    // Fetch client user
    const clientUser = await User.findById(clientId);
    if (!clientUser) {
      return res.status(404).json({ message: 'Client user not found.' });
    }

    const totalCost = durationMins * astrologer.ratePerMin;

    // Fetch client wallet and deduct
    let clientWallet = await Wallet.findOne({ userId: clientId });
    if (!clientWallet) {
      clientWallet = new Wallet({ userId: clientId, balance: 0 });
    }
    clientWallet.balance = Math.max(0, clientWallet.balance - totalCost);
    await clientWallet.save();

    // Create deduction transaction for client
    const clientTx = new Transaction({
      userId: clientId,
      amount: -totalCost,
      type: 'payment',
      status: 'Success',
      description: `Consultation with ${astrologer.name} for ${durationMins} mins`
    });
    await clientTx.save();

    // Fetch astrologer user (we can look up user who has astrologerRef === astrologerId)
    const astrologerUser = await User.findOne({ astrologerRef: astrologerId });
    if (astrologerUser) {
      let astroWallet = await Wallet.findOne({ userId: astrologerUser._id });
      if (!astroWallet) {
        astroWallet = new Wallet({ userId: astrologerUser._id, balance: 0 });
      }
      astroWallet.balance += totalCost;
      await astroWallet.save();

      // Create earnings transaction for astrologer
      const astroTx = new Transaction({
        userId: astrologerUser._id,
        amount: totalCost,
        type: 'payout',
        status: 'Success',
        description: `Earnings from consultation with ${clientUser.name} for ${durationMins} mins`
      });
      const astroTxDoc = await astroTx.save();
    }

    // Save or update consultation record
    let consultation = null;
    if (sessionId) {
      consultation = await Consultation.findById(sessionId);
      if (consultation) {
        consultation.duration = durationSeconds;
        consultation.amount = totalCost;
        consultation.status = 'Completed';
        consultation.notes = `Call consultation. Duration: ${durationMins} mins. Charged: ₹${totalCost}`;
        await consultation.save();
      }
    }

    if (!consultation) {
      consultation = new Consultation({
        client: clientUser.clientRef || clientId, // Use clientRef if exists, else fallback
        astrologer: astrologerId,
        date: new Date(),
        duration: durationSeconds,
        amount: totalCost,
        notes: `Call consultation. Duration: ${durationMins} mins. Charged: ₹${totalCost}`,
        status: 'Completed',
        tags: ['Live Call']
      });
      await consultation.save();
    }

    res.status(201).json({
      message: 'Call ended and transaction processed.',
      consultation,
      deducted: totalCost,
      clientBalance: clientWallet.balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing end call session.', error: error.message });
  }
});

module.exports = router;
