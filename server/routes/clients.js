const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Consultation = require('../models/Consultation');
const auth = require('../middleware/auth');

// All client routes require admin authentication
router.use(auth);

// GET /api/clients/admin-list - List all clients with wallet balances and session counts (Admin only)
const User = require('../models/User');
const Wallet = require('../models/Wallet');

router.get('/admin-list', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const clientUsers = await User.find({ role: 'user' }).populate('clientRef');
    const enrichedClients = [];

    for (const u of clientUsers) {
      const wallet = await Wallet.findOne({ userId: u._id });
      const sessionCount = await Consultation.countDocuments({ client: u.clientRef });
      
      enrichedClients.push({
        _id: u.clientRef ? u.clientRef._id : u._id,
        userId: u._id,
        name: u.name,
        username: u.username,
        phone: u.clientRef ? u.clientRef.phone : 'N/A',
        dob: u.clientRef ? u.clientRef.dob : null,
        walletBalance: wallet ? wallet.balance : 0,
        sessionCount: sessionCount
      });
    }

    res.json(enrichedClients);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving admin clients list.', error: error.message });
  }
});

// GET /api/clients - List all clients or filter by search query
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    const clients = await Client.find(query).sort({ name: 1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving clients.', error: error.message });
  }
});

// GET /api/clients/:id - Get specific client
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving client details.', error: error.message });
  }
});

// POST /api/clients - Create client
router.post('/', async (req, res) => {
  try {
    const { name, phone, dob, birthTime, birthPlace } = req.body;
    if (!name || !phone || !dob || !birthTime || !birthPlace) {
      return res.status(400).json({ message: 'All fields (name, phone, dob, birthTime, birthPlace) are required.' });
    }

    const newClient = new Client({ name, phone, dob, birthTime, birthPlace });
    await newClient.save();
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ message: 'Error creating client.', error: error.message });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, dob, birthTime, birthPlace } = req.body;
    if (!name || !phone || !dob || !birthTime || !birthPlace) {
      return res.status(400).json({ message: 'All fields (name, phone, dob, birthTime, birthPlace) are required.' });
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { name, phone, dob, birthTime, birthPlace },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error updating client.', error: error.message });
  }
});

// DELETE /api/clients/:id - Delete client and cascade delete consultations
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }
    
    // Cascade delete associated consultations
    await Consultation.deleteMany({ client: req.params.id });

    res.json({ message: 'Client and associated consultations deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting client.', error: error.message });
  }
});

module.exports = router;
