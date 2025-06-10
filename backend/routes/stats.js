const express = require('express');
const { getAdminStats, getVoterStats, getCandidateStats } = require('../controllers/stats');
const { protect, authorize } = require('../middleware/auth'); // Assuming you have this middleware

const router = express.Router();

// Protect all routes below
router.use(protect);

// Define routes and authorize specific roles
router.get('/admin', authorize('admin'), getAdminStats);
router.get('/voter', authorize('voter'), getVoterStats); // Only voters can get their stats
router.get('/candidate', authorize('candidate'), getCandidateStats); // Only candidates can get their stats

module.exports = router;