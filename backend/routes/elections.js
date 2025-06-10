const express = require('express');
const {
    getElections,
    getElection,
    createElection,
    updateElection,
    deleteElection,
    applyToElection,
    getElectionApplications,
    approveApplication,
    rejectApplication,
    getMyApplications,
    removeCandidate,
    // Add new bookmark functions
    bookmarkElection,
    removeBookmark,
    getBookmarkedElections,
    // Add new status update function
    updateElectionStatus
} = require('../controllers/elections');

// Import ONLY the nested vote router from votes.js
const { nestedVoteRouter } = require('./votes'); // <--- CHANGE HERE

const { protect, authorize } = require('../middleware/auth');
// --- Import the upload middleware ---
const { uploadCV } = require('../middleware/uploads'); // Assuming uploads.js is in middleware folder
const { uploadElectionImages } = require('../middleware/uploads'); // Import the new middleware
// --- End Import ---

const router = express.Router();

// Re-route requests going to /:electionId/votes to the NESTED voteRouter
router.use('/:electionId/votes', nestedVoteRouter); // <--- Use the correct router instance


// --- Bookmark Routes ---

// Route to get all bookmarked elections for the current user
router.route('/bookmarks')
    .get(protect, getBookmarkedElections);

// Routes to bookmark/unbookmark an election
router.route('/:id/bookmark')
    .post(protect, bookmarkElection)
    .delete(protect, removeBookmark);


// --- Candidate Specific Routes ---

// Route for a candidate to apply to an election
// Protect ensures user is logged in, authorize ensures user has 'candidate' role
// uploadCV handles the 'cv' file upload BEFORE applyToElection controller runs
router.route('/:id/apply')
    .post(protect, authorize('candidate'), uploadCV, applyToElection); // <-- ADD uploadCV HERE

// Route for a candidate to view their own applications across all elections
router.route('/my-applications')
    .get(protect, authorize('candidate'), getMyApplications);


// --- Admin Specific Routes ---

// Routes for managing applications (approve/reject) - requires admin role
router.route('/:id/applications/:candidateId/approve')
    .put(protect, authorize('admin'), approveApplication);

router.route('/:id/applications/:candidateId/reject')
    .put(protect, authorize('admin'), rejectApplication); // Currently PUT. Ensure frontend matches.

// Route for admin to view all applications for a specific election
router.route('/:id/applications')
    .get(protect, authorize('admin'), getElectionApplications);

// Route for admin to remove an approved candidate
router.route('/:id/candidates/:candidateId')
    .delete(protect, authorize('admin'), removeCandidate);

// Route for admin to update election status
router.route('/:id/status')
    .patch(protect, authorize('admin'), updateElectionStatus);


// --- General Election Routes ---

// Routes for getting elections (public) and creating elections (admin)
router.route('/')
    .get(getElections)
    .post(protect, authorize('admin'), uploadElectionImages, createElection); // Add uploadElectionImages for create

// Routes for getting, updating, deleting a specific election
router.route('/:id')
    .get(getElection) // Public access
    .put(protect, authorize('admin'), uploadElectionImages, updateElection) // Add uploadElectionImages for update
    .delete(protect, authorize('admin'), deleteElection); // Only admins can delete


module.exports = router;