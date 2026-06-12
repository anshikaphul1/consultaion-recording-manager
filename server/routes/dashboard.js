const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Astrologer = require('../models/Astrologer');
const Consultation = require('../models/Consultation');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { role, clientRef, astrologerRef } = req.user;

    // 1. ADMIN DASHBOARD
    if (role === 'admin') {
      const clientsCount = await Client.countDocuments();
      const consultationsCount = await Consultation.countDocuments();
      const astrologersCount = await Astrologer.countDocuments();

      // Consultations by timeframe
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const consultationsToday = await Consultation.countDocuments({ date: { $gte: todayStart } });
      const consultationsWeek = await Consultation.countDocuments({ date: { $gte: weekStart } });
      const consultationsMonth = await Consultation.countDocuments({ date: { $gte: monthStart } });

      const stats = await Consultation.aggregate([
        { 
          $group: { 
            _id: null, 
            totalSeconds: { $sum: '$duration' },
            totalRev: { $sum: '$amount' }
          } 
        }
      ]);
      const totalDuration = stats.length > 0 ? stats[0].totalSeconds : 0;
      const totalRevenue = stats.length > 0 ? stats[0].totalRev : 0;

      const recentConsultations = await Consultation.find()
        .populate('client')
        .populate('astrologer')
        .sort({ date: -1 })
        .limit(5);

      const recentClients = await Client.find()
        .sort({ createdAt: -1 })
        .limit(5);

      const allConsultations = await Consultation.find({}, 'tags');
      const tagCounts = {};
      allConsultations.forEach(c => {
        if (c.tags && Array.isArray(c.tags)) {
          c.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const popularTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return res.json({
        role,
        counts: {
          clients: clientsCount,
          consultations: consultationsCount,
          astrologers: astrologersCount,
          consultationsToday,
          consultationsWeek,
          consultationsMonth,
          totalDurationSeconds: totalDuration,
          totalRevenue
        },
        recentConsultations,
        recentClients,
        popularTags
      });
    }

    // 2. ASTROLOGER DASHBOARD
    if (role === 'astrologer') {
      if (!astrologerRef) {
        return res.status(400).json({ message: 'No astrologer profile associated with this account.' });
      }

      const astroId = new mongoose.Types.ObjectId(astrologerRef);

      const consultationsCount = await Consultation.countDocuments({ astrologer: astroId });

      // Unique clients served
      const uniqueClients = await Consultation.distinct('client', { astrologer: astroId });
      const clientsCount = uniqueClients.length;

      // Sum duration
      const durationStats = await Consultation.aggregate([
        { $match: { astrologer: astroId } },
        { $group: { _id: null, totalSeconds: { $sum: '$duration' } } }
      ]);
      const totalDuration = durationStats.length > 0 ? durationStats[0].totalSeconds : 0;

      // Recent consultations conducted by this astrologer
      const recentConsultations = await Consultation.find({ astrologer: astroId })
        .populate('client')
        .sort({ date: -1 })
        .limit(5);

      return res.json({
        role,
        astrologerId: astrologerRef,
        counts: {
          clients: clientsCount,
          consultations: consultationsCount,
          totalDurationSeconds: totalDuration
        },
        recentConsultations
      });
    }

    // 3. CLIENT (USER) DASHBOARD
    if (role === 'user') {
      if (!clientRef) {
        return res.status(400).json({ message: 'No client profile associated with this account.' });
      }

      const client = await Client.findById(clientRef);
      if (!client) {
        return res.status(404).json({ message: 'Client profile not found.' });
      }

      // History of consultations conducted for this client
      const consultationsHistory = await Consultation.find({ client: clientRef })
        .populate('astrologer')
        .sort({ date: -1 });

      return res.json({
        role,
        client,
        consultations: consultationsHistory
      });
    }

    return res.status(400).json({ message: 'Invalid user role.' });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving dashboard analytics.', error: error.message });
  }
});

module.exports = router;
