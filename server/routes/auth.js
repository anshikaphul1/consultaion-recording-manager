const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Astrologer = require('../models/Astrologer');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-12345';

// POST /api/auth/register - Sign up a new user (admin, client/user, astrologer)
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, phone, dob, birthTime, birthPlace, specialization } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Username, password, and name are required fields.' });
    }

    const targetRole = role || 'user';

    // Validate role-specific fields
    if (targetRole === 'user') {
      if (!phone || !dob || !birthTime || !birthPlace) {
        return res.status(400).json({ message: 'Phone, DOB, birth time, and birth place are required for client registration.' });
      }
    } else if (targetRole === 'astrologer') {
      if (!specialization) {
        return res.status(400).json({ message: 'Specialization is required for astrologer registration.' });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let clientRef = null;
    let astrologerRef = null;

    // Create corresponding profiles
    if (targetRole === 'user') {
      const newClient = new Client({
        name,
        phone,
        dob: new Date(dob),
        birthTime,
        birthPlace
      });
      await newClient.save();
      clientRef = newClient._id;
    } else if (targetRole === 'astrologer') {
      const newAstrologer = new Astrologer({
        name,
        specialization
      });
      await newAstrologer.save();
      astrologerRef = newAstrologer._id;
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      role: targetRole,
      clientRef,
      astrologerRef
    });

    await newUser.save();

    // Create token
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        username: newUser.username, 
        role: newUser.role,
        clientRef: newUser.clientRef,
        astrologerRef: newUser.astrologerRef
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        clientRef: newUser.clientRef,
        astrologerRef: newUser.astrologerRef
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering new user.', error: error.message });
  }
});

// POST /api/auth/login - Log in an existing user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Create token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        clientRef: user.clientRef,
        astrologerRef: user.astrologerRef
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        name: user.name,
        role: user.role,
        clientRef: user.clientRef,
        astrologerRef: user.astrologerRef
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in.', error: error.message });
  }
});

module.exports = router;
