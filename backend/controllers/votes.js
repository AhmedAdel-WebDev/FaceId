const Vote = require('../models/Vote');
const Election = require('../models/Election');
const User = require('../models/User');
const mongoose = require('mongoose'); // Import mongoose
// Add error handling utilities later (e.g., ErrorResponse, asyncHandler)

// @desc    Check if user can vote in an election
// @route   GET /api/v1/elections/:electionId/check-vote-eligibility
// @access  Private
exports.checkVoteEligibility = async (req, res, next) => {
    try {
        const electionId = req.params.electionId;
        const voterId = req.user.id;

        // Find the election
        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ 
                success: false, 
                message: `Election not found with id ${electionId}` 
            });
        }

        // Check if election is active
        if (election.status !== 'active') {
            return res.status(200).json({
                success: true,
                canVote: false,
                reason: `Election is not currently active. Status: ${election.status}`
            });
        }

        // Check if voting period is active
        const now = new Date();
        if (now < election.startDate || now > election.endDate) {
            return res.status(200).json({
                success: true,
                canVote: false,
                reason: `Voting period is not active. Election runs from ${election.startDate} to ${election.endDate}`
            });
        }

        // Check if user has already voted
        const existingVote = await Vote.findOne({ election: electionId, voter: voterId });
        
        // If no existing vote, user can vote
        if (!existingVote) {
            return res.status(200).json({
                success: true,
                canVote: true
            });
        }

        // If this is an image-based election, check if the previously voted image still exists
        if (election.electionType === 'image-based' && existingVote.selectedImageId) {
            console.log("Checking if voted image still exists...");
            console.log("User voted for image with ID:", existingVote.selectedImageId.toString());
            console.log("Available image options:", election.candidates.map(c => ({
                _id: c._id ? c._id.toString() : null,
                imageId: c.imageId ? c.imageId.toString() : null
            })));
            
            // Check if the image the user voted for still exists
            const imageStillExists = election.candidates.some(candidate => {
                // Check various ID fields that might be used
                const optionImageId = candidate.imageId ? candidate.imageId.toString() : null;
                const optionId = candidate._id ? candidate._id.toString() : null;
                const votedImageId = existingVote.selectedImageId.toString();
                
                const matches = (
                    (optionImageId && optionImageId === votedImageId) ||
                    (optionId && optionId === votedImageId)
                );
                
                if (matches) {
                    console.log("Found matching image option:", optionId || optionImageId);
                }
                
                return matches;
            });

            console.log("Image still exists?", imageStillExists);

            if (!imageStillExists) {
                // The image the user voted for was deleted, so they can vote again
                // Delete their previous vote
                await Vote.findByIdAndDelete(existingVote._id);
                console.log(`Deleted previous vote (${existingVote._id}) for user ${voterId} because image ${existingVote.selectedImageId} no longer exists`);
                
                // Also update the user's hasVoted map
                await User.findByIdAndUpdate(voterId, { $unset: { [`hasVoted.${electionId}`]: "" } });
                
                return res.status(200).json({
                    success: true,
                    canVote: true,
                    previousVoteInvalid: true,
                    reason: "Your previous vote was for an option that no longer exists."
                });
            }
        }

        // User has already voted and can't vote again
        return res.status(200).json({
            success: true,
            canVote: false,
            reason: "You have already voted in this election."
        });

    } catch (err) {
        console.error("Error checking vote eligibility:", err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error checking vote eligibility' 
        });
    }
};

// @desc    Cast a vote in an election
// @route   POST /api/v1/elections/:electionId/votes
// @access  Private (Verified Voters/Users)
exports.castVote = async (req, res, next) => {
    try {
        const electionId = req.params.electionId;
        const voterId = req.user.id; // From protect middleware
        const { candidateId, choice, ratingValue, selectedImageId } = req.body;

        // 1. Find Election and check status/validity
        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }
        if (election.status !== 'active') {
            return res.status(400).json({ success: false, message: `Election is not currently active. Status: ${election.status}` });
        }
        const now = new Date();
        if (now < election.startDate || now > election.endDate) {
             return res.status(400).json({ success: false, message: `Voting period is not active. Election runs from ${election.startDate} to ${election.endDate}` });
        }

        // 2. Removed verification check - any logged-in user can vote
        // if (!req.user.isVerified) {
        //     return res.status(403).json({ success: false, message: 'Voter account is not verified.' });
        // }

        // 3. Check if voter has already voted (Database index is the main guard, this is an early check)
        const existingVote = await Vote.findOne({ election: electionId, voter: voterId });
        if (existingVote) {
            // For image-based elections, check if the user's selected image still exists
            if (election.electionType === 'image-based' && existingVote.selectedImageId) {
                console.log("Vote cast - checking if voted image still exists for user:", voterId);
                console.log("User voted for image with ID:", existingVote.selectedImageId.toString());
                console.log("Available image options:", election.candidates.map(c => ({
                    _id: c._id ? c._id.toString() : null,
                    imageId: c.imageId ? c.imageId.toString() : null
                })));
                
                const imageStillExists = election.candidates.some(candidate => {
                    const candidateId = candidate._id ? candidate._id.toString() : null;
                    const imageId = candidate.imageId ? candidate.imageId.toString() : null;
                    const votedImageId = existingVote.selectedImageId.toString();
                    
                    const matches = (
                        (candidateId && candidateId === votedImageId) ||
                        (imageId && imageId === votedImageId)
                    );
                    
                    if (matches) {
                        console.log("Found matching image option:", candidateId || imageId);
                    }
                    
                    return matches;
                });
                
                console.log("Image still exists?", imageStillExists);
                
                if (!imageStillExists) {
                    // Previous voted image no longer exists, delete the old vote to allow re-voting
                    console.log(`Deleting previous vote for user ${voterId} because voted image no longer exists`);
                    await Vote.findByIdAndDelete(existingVote._id);
                    
                    // Also update the user's hasVoted map
                    await User.findByIdAndUpdate(voterId, { $unset: { [`hasVoted.${electionId}`]: "" } });
                    
                    // Continue with the voting process
                } else {
                    return res.status(400).json({ success: false, message: 'You have already voted in this election' });
                }
            } else {
                return res.status(400).json({ success: false, message: 'You have already voted in this election' });
            }
        }

        // 4. Prepare vote data based on election type
        let voteData = {
            election: electionId,
            voter: voterId
        };

        if (election.electionType === 'candidate-based') {
            if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
                return res.status(400).json({ success: false, message: 'Please provide a valid candidateId for this election type.' });
            }
            const isCandidateValid = election.candidates.some(c => c.candidateId && c.candidateId.toString() === candidateId);
            if (!isCandidateValid) {
                return res.status(400).json({ success: false, message: `Candidate with id ${candidateId} is not participating in this election.` });
            }
            voteData.candidate = candidateId;
        } else if (election.electionType === 'yes-no') {
            if (!choice || !['yes', 'no'].includes(choice)) {
                return res.status(400).json({ success: false, message: 'Please provide a valid choice (yes/no) for this election type.' });
            }
            voteData.choice = choice;
        } else if (election.electionType === 'rating') {
            if (ratingValue === undefined || typeof ratingValue !== 'number') {
                return res.status(400).json({ success: false, message: 'Please provide a numeric ratingValue for this election type.' });
            }
            if (election.ratingOptions && (ratingValue < election.ratingOptions.min || ratingValue > election.ratingOptions.max)) {
                return res.status(400).json({ success: false, message: `Rating value must be between ${election.ratingOptions.min} and ${election.ratingOptions.max}.` });
            }
            voteData.ratingValue = ratingValue;
        } else if (election.electionType === 'image-based') {
            if (!selectedImageId || !mongoose.Types.ObjectId.isValid(selectedImageId)) {
                // Assuming selectedImageId refers to the auto-generated imageId in Election.candidates
                return res.status(400).json({ success: false, message: 'Please provide a valid selectedImageId for this election type.' });
            }
            
            // More robust checking for valid image options
            const isValidImageOption = election.candidates.some(opt => {
                // Check various ID fields that might be used
                const optionImageId = opt.imageId ? opt.imageId.toString() : null;
                const optionId = opt._id ? opt._id.toString() : null;
                
                // Debug the comparison
                console.log(`Comparing: Selected=${selectedImageId}, Option imageId=${optionImageId}, Option _id=${optionId}`);
                
                return (
                    // Check against imageId field
                    (optionImageId && optionImageId === selectedImageId) ||
                    // Check against _id field
                    (optionId && optionId === selectedImageId) ||
                    // Check against imageUrl (as fallback)
                    (opt.imageUrl && opt.imageUrl === selectedImageId)
                );
            });
            
            if (!isValidImageOption) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Selected image with id ${selectedImageId} is not a valid option for this election.` 
                });
            }
            
            voteData.selectedImageId = selectedImageId;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid or unsupported election type for voting.' });
        }

        // 5. Create the vote
        const vote = await Vote.create(voteData);

        // 7. Update user's hasVoted map (Optional but recommended)
        // Note: Using $set directly on the map field
        await User.findByIdAndUpdate(voterId, { $set: { [`hasVoted.${electionId}`]: true } });


        res.status(201).json({ // 201 Created
            success: true,
            data: vote
        });

    } catch (err) {
        console.error(err);
        // Handle potential duplicate key error from the unique index (race condition)
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already voted in this election (concurrent request).' });
        }
         if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
         if (err.name === 'CastError') {
             // Could be invalid electionId or candidateId format
             return res.status(400).json({ success: false, message: `Invalid ID format provided.` });
        }
        res.status(500).json({ success: false, message: 'Server Error during vote casting' });
        // next(err);
    }
};


// @desc    Get results for a specific election
// @route   GET /api/v1/elections/:electionId/results
// @access  Public (or Private/Admin depending on requirements)
exports.getElectionResults = async (req, res, next) => {
    try {
        const electionId = req.params.electionId;

        if (!mongoose.Types.ObjectId.isValid(electionId)) {
             return res.status(400).json({ success: false, message: 'Invalid Election ID format' });
        }

        const election = await Election.findById(electionId).select('candidates electionType proposition ratingOptions');

        if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }

        let results;
        let voteCounts;

        if (election.electionType === 'candidate-based') {
            voteCounts = await Vote.aggregate([
                { $match: { election: new mongoose.Types.ObjectId(electionId), candidate: { $exists: true } } },
                { $group: { _id: '$candidate', votes: { $sum: 1 } } },
                { $project: { _id: 0, candidateId: '$_id', votes: 1 } }
            ]);
            const voteMap = new Map(voteCounts.map(item => [item.candidateId.toString(), item.votes]));
            results = election.candidates.map(candidate => ({
                candidateId: candidate.candidateId,
                name: candidate.name,
                profileImage: candidate.profileImage,
                votes: voteMap.get(candidate.candidateId.toString()) || 0
            }));
            results.sort((a, b) => b.votes - a.votes);
        } else if (election.electionType === 'yes-no') {
            voteCounts = await Vote.aggregate([
                { $match: { election: new mongoose.Types.ObjectId(electionId), choice: { $in: ['yes', 'no'] } } },
                { $group: { _id: '$choice', votes: { $sum: 1 } } },
                { $project: { _id: 0, choice: '$_id', votes: 1 } }
            ]);
            results = {
                proposition: election.proposition,
                choices: [
                    { choice: 'yes', votes: voteCounts.find(vc => vc.choice === 'yes')?.votes || 0 },
                    { choice: 'no', votes: voteCounts.find(vc => vc.choice === 'no')?.votes || 0 }
                ]
            };
        } else if (election.electionType === 'rating') {
            voteCounts = await Vote.aggregate([
                { $match: { election: new mongoose.Types.ObjectId(electionId), ratingValue: { $exists: true } } },
                { $group: { _id: '$ratingValue', votes: { $sum: 1 } } },
                { $sort: { _id: 1 } }, // Sort by rating value
                { $project: { _id: 0, rating: '$_id', votes: 1 } }
            ]);
            // Calculate average rating
            const totalVotes = voteCounts.reduce((sum, item) => sum + item.votes, 0);
            const totalScore = voteCounts.reduce((sum, item) => sum + (item.rating * item.votes), 0);
            const averageRating = totalVotes > 0 ? (totalScore / totalVotes).toFixed(2) : 0;
            results = {
                ratingOptions: election.ratingOptions,
                distribution: voteCounts,
                averageRating: parseFloat(averageRating),
                totalVotes
            };
        } else if (election.electionType === 'image-based') {
            voteCounts = await Vote.aggregate([
                { $match: { election: new mongoose.Types.ObjectId(electionId), selectedImageId: { $exists: true } } },
                { $group: { _id: '$selectedImageId', votes: { $sum: 1 } } },
                { $project: { _id: 0, imageId: '$_id', votes: 1 } }
            ]);
            const voteMap = new Map(voteCounts.map(item => [item.imageId.toString(), item.votes]));
            results = election.candidates.map(option => ({
                imageId: option.imageId,
                imageUrl: option.imageUrl,
                imageLabel: option.imageLabel,
                name: option.name, // Using name for consistency from election model
                profileImage: option.profileImage, // Using profileImage for consistency
                votes: voteMap.get(option.imageId.toString()) || 0
            }));
            results.sort((a, b) => b.votes - a.votes);
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported election type for results.' });
        }


        res.status(200).json({
            success: true,
            data: { results } // Ensure results are nested under 'data'
        });

    } catch (err) {
        console.error("Error fetching election results:", err);
        res.status(500).json({ success: false, message: 'Server Error fetching results' });
        // next(err); // Use if you have centralized error handling
    }
};


// @desc    Get all votes for an election (Admin only)
// @route   GET /api/v1/elections/:electionId/votes
// @access  Private (Admin)
exports.getVotesForElection = async (req, res, next) => {
    try {
        const electionId = req.params.electionId;

        // Check if election exists (optional but good practice)
        const election = await Election.findById(electionId);
         if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }

        const votes = await Vote.find({ election: electionId })
                                .populate('voter', 'name email') // Populate voter details
                                .populate('candidate', 'name'); // Populate candidate name

        res.status(200).json({
            success: true,
            count: votes.length,
            data: votes
        });
    } catch (err) {
        console.error(err);
         if (err.name === 'CastError') {
             return res.status(400).json({ success: false, message: `Invalid Election ID format.` });
        }
        res.status(500).json({ success: false, message: 'Server Error fetching votes' });
        // next(err);
    }
};


// @desc    Get elections the logged-in user has voted in
// @route   GET /api/v1/votes/my-votes
// @access  Private (Logged-in users)
exports.getMyVotes = async (req, res, next) => {
    try {
        const voterId = req.user.id; // Get voter ID from authenticated user

        // Find votes cast by the logged-in user
        // Populate election details and the candidate they voted for
        const votes = await Vote.find({ voter: voterId })
                                .populate({
                                    path: 'election',
                                    select: 'title description startDate endDate status electionType' // Added electionType
                                })
                                .populate({
                                    path: 'candidate',
                                    select: 'name profileImage' // Select desired candidate fields
                                })
                                .sort({ createdAt: -1 }); // Optional: Sort by most recent vote first

        if (!votes || votes.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'You have not voted in any elections yet.',
                count: 0,
                data: []
            });
        }

        // Filter out votes where the referenced election no longer exists
        // This happens when the populate fails (election is null)
        const validVotes = votes.filter(vote => vote.election !== null);
        
        // If we found votes with deleted elections, clean them up from the database
        if (validVotes.length < votes.length) {
            console.log(`Found ${votes.length - validVotes.length} votes for deleted elections. Cleaning up...`);
            
            // Get IDs of votes with null elections
            const invalidVoteIds = votes
                .filter(vote => vote.election === null)
                .map(vote => vote._id);
                
            // Delete these votes in the background (don't await)
            if (invalidVoteIds.length > 0) {
                Vote.deleteMany({ _id: { $in: invalidVoteIds } })
                    .then(result => console.log(`Cleaned up ${result.deletedCount} votes for deleted elections`))
                    .catch(err => console.error('Error cleaning up votes for deleted elections:', err));
            }
        }

        // Format the response with valid vote details only
        const formattedVotes = validVotes.map(vote => ({
            voteId: vote._id,
            votedAt: vote.createdAt,
            election: vote.election, // Contains populated election details including electionType
            votedForCandidate: vote.candidate, // For candidate-based elections
            choice: vote.choice, // For yes/no elections
            ratingValue: vote.ratingValue, // For rating elections
            selectedImageId: vote.selectedImageId // For image-based elections
        }));

        res.status(200).json({
            success: true,
            count: formattedVotes.length,
            data: formattedVotes
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error fetching voting history' });
        // next(err);
    }
};


// @desc    Check if the logged-in user has voted in a specific election
// @route   GET /api/v1/elections/:electionId/votes/status
// @access  Private
exports.checkVoteStatus = async (req, res, next) => {
    try {
        const electionId = req.params.electionId;
        const voterId = req.user.id; // Assumes protect middleware adds user to req

        if (!mongoose.Types.ObjectId.isValid(electionId)) {
             return res.status(400).json({ success: false, message: 'Invalid Election ID format' });
        }

        const existingVote = await Vote.findOne({
            election: electionId,
            voter: voterId
        });

        // If a vote exists, the user has voted
        const hasVoted = !!existingVote;

        res.status(200).json({
            success: true,
            data: { hasVoted }
        });

    } catch (err) {
        console.error("Error checking vote status:", err);
        // Use next(err) if you have centralized error handling middleware
        res.status(500).json({ success: false, message: 'Server Error checking vote status' });
    }
};