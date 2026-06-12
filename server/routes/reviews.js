const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Astrologer = require('../models/Astrologer');
const auth = require('../middleware/auth');

router.use(auth);

// POST /api/reviews - Submit a review
router.post('/', async (req, res) => {
  try {
    const { astrologer, rating, comment } = req.body;
    if (!astrologer || !rating) {
      return res.status(400).json({ message: 'Astrologer ID and rating are required.' });
    }

    const review = new Review({
      client: req.user.userId,
      astrologer,
      rating: Number(rating),
      comment,
      isApproved: true
    });
    await review.save();

    // Recalculate astrologer rating
    const reviews = await Review.find({ astrologer, isApproved: true });
    const count = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / count;

    await Astrologer.findByIdAndUpdate(astrologer, {
      rating: Number(avgRating.toFixed(1)),
      ratingCount: count
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review.', error: error.message });
  }
});

// GET /api/reviews/astrologer/:id - Fetch approved reviews for an astrologer
router.get('/astrologer/:id', async (req, res) => {
  try {
    const reviews = await Review.find({ astrologer: req.params.id, isApproved: true })
      .populate('client', 'name username')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews for astrologer.', error: error.message });
  }
});

// GET /api/reviews/admin - Fetch all reviews (Admin only)
router.get('/admin', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const reviews = await Review.find()
      .populate('client', 'name username')
      .populate('astrologer', 'name specialization')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all reviews.', error: error.message });
  }
});

// PATCH /api/reviews/:id/approve - Moderate a review (Admin only)
router.patch('/:id/approve', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const { isApproved } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Recalculate astrologer rating
    const reviews = await Review.find({ astrologer: review.astrologer, isApproved: true });
    const count = reviews.length;
    const avgRating = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 5;

    await Astrologer.findByIdAndUpdate(review.astrologer, {
      rating: Number(avgRating.toFixed(1)),
      ratingCount: count
    });

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error updating review approval.', error: error.message });
  }
});

// DELETE /api/reviews/:id - Delete a review (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Recalculate rating
    const reviews = await Review.find({ astrologer: review.astrologer, isApproved: true });
    const count = reviews.length;
    const avgRating = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 5;

    await Astrologer.findByIdAndUpdate(review.astrologer, {
      rating: Number(avgRating.toFixed(1)),
      ratingCount: count
    });

    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review.', error: error.message });
  }
});

module.exports = router;
