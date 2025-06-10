const Election = require('../models/Election');
const User = require('../models/User');
const Vote = require('../models/Vote');
const mongoose = require('mongoose');

// @desc    Get statistics for Admin Dashboard
// @route   GET /api/v1/stats/admin
// @access  Private (Admin)
exports.getAdminStats = async (req, res, next) => {
    try {
        const totalElections = await Election.countDocuments();
        const pendingElections = await Election.countDocuments({ status: 'pending' });
        const activeElections = await Election.countDocuments({ status: 'active' });
        const completedElections = await Election.countDocuments({ status: 'completed' });

        // Count pending applications across all 'pending' elections
        const pendingAppsAggregate = await Election.aggregate([
            { $match: { status: 'pending' } }, // Only consider pending elections
            { $project: { numApplications: { $size: '$applications' } } }, // Get size of applications array
            { $group: { _id: null, totalPendingApplications: { $sum: '$numApplications' } } } // Sum the sizes
        ]);
        const totalPendingApplications = pendingAppsAggregate.length > 0 ? pendingAppsAggregate[0].totalPendingApplications : 0;

        const totalUsers = await User.countDocuments();
        const totalVoters = await User.countDocuments({ role: 'voter' });
        const totalCandidates = await User.countDocuments({ role: 'candidate' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        res.status(200).json({
            success: true,
            data: {
                totalElections,
                pendingElections,
                activeElections,
                completedElections,
                totalPendingApplications,
                totalUsers,
                totalVoters,
                totalCandidates,
                totalAdmins
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error fetching admin stats' });
    }
};

// @desc    Get statistics for Voter Dashboard
// @route   GET /api/v1/stats/voter
// @access  Private (Voter)
exports.getVoterStats = async (req, res, next) => {
    try {
        const voterId = req.user.id;
        const user = await User.findById(voterId).select('hasVoted');

        if (!user) {
            return res.status(404).json({ success: false, message: 'Voter not found' });
        }

        // Count the number of elections the user has voted in
        const electionsVotedIn = user.hasVoted ? Object.keys(user.hasVoted).length : 0;

        // Optional: Could also count total elections available to vote in (status = 'active')
        const activeElectionsCount = await Election.countDocuments({ status: 'active' });

        res.status(200).json({
            success: true,
            data: {
                electionsVotedIn,
                activeElectionsCount // Example of another potential stat
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error fetching voter stats' });
    }
};

// @desc    Get statistics for Candidate Dashboard
// @route   GET /api/v1/stats/candidate
// @access  Private (Candidate)
exports.getCandidateStats = async (req, res, next) => {
    try {
        const candidateId = new mongoose.Types.ObjectId(req.user.id); // Ensure it's an ObjectId

        // Count elections applied to
        const electionsAppliedTo = await Election.countDocuments({ 'applications.candidateId': candidateId });

        // Count elections approved for
        const electionsApprovedFor = await Election.countDocuments({ 'candidates.candidateId': candidateId });

        // Count active elections the candidate is in
        const activeCampaigns = await Election.countDocuments({
            'candidates.candidateId': candidateId,
            status: 'active'
        });

        // Aggregate total votes received across all elections
        const totalVotesResult = await Vote.aggregate([
            { $match: { candidate: candidateId } }, // Match votes for this candidate
            { $count: 'totalVotesReceived' }      // Count the matched documents
        ]);
        const totalVotesReceived = totalVotesResult.length > 0 ? totalVotesResult[0].totalVotesReceived : 0;


        res.status(200).json({
            success: true,
            data: {
                electionsAppliedTo,
                electionsApprovedFor,
                activeCampaigns,
                totalVotesReceived
            }
        });
    } catch (err) {
        console.error(err);
         if (err.name === 'CastError') {
             return res.status(400).json({ success: false, message: `Invalid ID format provided.` });
        }
        res.status(500).json({ success: false, message: 'Server Error fetching candidate stats' });
    }
};