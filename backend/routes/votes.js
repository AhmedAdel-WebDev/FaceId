const express = require('express');
const {
    castVote,
    getElectionResults,
    getVotesForElection,
    getMyVotes,
    checkVoteStatus, // Import the existing controller function
    checkVoteEligibility // Import our new controller function
} = require('../controllers/votes');

const { protect, authorize } = require('../middleware/auth');

// --- Router for NESTED routes (used by elections.js) ---
// Needs mergeParams: true to access :electionId from the parent router (elections.js)
const nestedVoteRouter = express.Router({ mergeParams: true });

// Define routes that depend on :electionId from the parent router
nestedVoteRouter.route('/')
    .post(protect, castVote) // POST /api/v1/elections/:electionId/votes
    .get(protect, authorize('admin'), getVotesForElection); // GET /api/v1/elections/:electionId/votes (Admin only)

nestedVoteRouter.route('/results')
    .get(getElectionResults); // GET /api/v1/elections/:electionId/votes/results (Public or Protected based on controller)

// Add the new route for checking vote status
nestedVoteRouter.route('/status')
    .get(protect, checkVoteStatus); // GET /api/v1/elections/:electionId/votes/status (Protected)

// Add the new route for checking vote eligibility
nestedVoteRouter.route('/eligibility')
    .get(protect, checkVoteEligibility); // GET /api/v1/elections/:electionId/votes/eligibility (Protected)


// --- Router for TOP-LEVEL vote routes (used by server.js) ---
const topLevelVoteRouter = express.Router();

// Define routes mounted directly under /api/v1/votes
topLevelVoteRouter.route('/my-votes')
    .get(protect, getMyVotes); // GET /api/v1/votes/my-votes


// --- Exports ---
// Export the nested router for elections.js to use
// Export the top-level router for server.js to use
// It's common to export them in an object or rename the default export
module.exports = {
    nestedVoteRouter, // This will be imported by elections.js
    topLevelVoteRouter // This will be imported by server.js as 'voteRoutes'
};