const express = require('express');
const router = express.Router();
const Astrologer = require('../models/Astrologer');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/astrologers - List all astrologers with optional filters
router.get('/', async (req, res) => {
  try {
    const { specialty, language, priceMin, priceMax, isOnline, experienceMin } = req.query;
    let query = {};

    if (specialty) {
      query.$or = [
        { specialization: new RegExp(specialty, 'i') },
        { specialties: { $in: [new RegExp(specialty, 'i')] } }
      ];
    }

    if (language) {
      query.languages = { $in: [new RegExp(language, 'i')] };
    }

    if (priceMin || priceMax) {
      query.ratePerMin = {};
      if (priceMin) query.ratePerMin.$gte = Number(priceMin);
      if (priceMax) query.ratePerMin.$lte = Number(priceMax);
    }

    if (isOnline !== undefined) {
      query.isOnline = isOnline === 'true';
    }

    if (experienceMin) {
      query.experience = { $gte: Number(experienceMin) };
    }

    // Sort by online status (online first) then by name
    const astrologers = await Astrologer.find(query)
      .sort({ isOnline: -1, name: 1 });
    
    res.json(astrologers);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving astrologers.', error: error.message });
  }
});

// GET /api/astrologers/:id - Retrieve single astrologer profile details
router.get('/:id', async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.id);
    if (!astrologer) {
      return res.status(404).json({ message: 'Astrologer not found.' });
    }
    res.json(astrologer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching astrologer.', error: error.message });
  }
});

// POST /api/astrologers - Add a new astrologer (Admin only)
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const { name, specialization, specialties, languages, ratePerMin, experience, bio, photoUrl } = req.body;
    
    if (!name || !specialization) {
      return res.status(400).json({ message: 'Name and specialization are required fields.' });
    }

    const astrologer = new Astrologer({
      name,
      specialization,
      specialties: specialties || [],
      languages: languages || ['Hindi', 'English'],
      ratePerMin: Number(ratePerMin) || 10,
      experience: Number(experience) || 0,
      bio: bio || '',
      photoUrl: photoUrl || null,
      isOnline: false
    });

    await astrologer.save();
    res.status(201).json(astrologer);
  } catch (error) {
    res.status(500).json({ message: 'Error creating astrologer.', error: error.message });
  }
});

// PUT /api/astrologers/:id - Update astrologer profile (Admin or the Astrologer themselves)
router.put('/:id', async (req, res) => {
  try {
    // Check permission (Admin can update anyone, Astrologer can update their own profile linked in user.astrologerRef)
    const isSelf = req.user.role === 'astrologer' && req.user.astrologerRef === req.params.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Access denied. You cannot edit this profile.' });
    }

    const { name, specialization, specialties, languages, ratePerMin, experience, bio, photoUrl, isOnline } = req.body;
    
    let updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (specialization !== undefined) updateFields.specialization = specialization;
    if (specialties !== undefined) updateFields.specialties = specialties;
    if (languages !== undefined) updateFields.languages = languages;
    if (ratePerMin !== undefined) updateFields.ratePerMin = Number(ratePerMin);
    if (experience !== undefined) updateFields.experience = Number(experience);
    if (bio !== undefined) updateFields.bio = bio;
    if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
    if (isOnline !== undefined) updateFields.isOnline = isOnline;

    const astrologer = await Astrologer.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!astrologer) {
      return res.status(404).json({ message: 'Astrologer not found.' });
    }

    res.json(astrologer);
  } catch (error) {
    res.status(500).json({ message: 'Error updating astrologer profile.', error: error.message });
  }
});

// DELETE /api/astrologers/:id - Delete an astrologer (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const astrologer = await Astrologer.findByIdAndDelete(req.params.id);
    if (!astrologer) {
      return res.status(404).json({ message: 'Astrologer not found.' });
    }
    
    res.json({ message: 'Astrologer profile deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting astrologer profile.', error: error.message });
  }
});

module.exports = router;
