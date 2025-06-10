const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    election: {
        type: mongoose.Schema.ObjectId,
        ref: 'Election',
        required: [true, 'Vote must belong to an election']
    },
    candidate: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // The candidate being voted for (for candidate-based elections)
        // Not strictly required at schema level for all vote types
        // required: [true, 'Vote must be for a candidate'] 
        required: function() { 
            // Required only if the election type (fetched separately or passed) is candidate-based
            // This logic might be better handled in the controller or pre-save hook after fetching election details
            return !this.choice && !this.ratingValue && !this.selectedImageId; // Heuristic, refine as needed
        }
    },
    // For 'yes-no' elections
    choice: {
        type: String, // e.g., 'yes', 'no'
        enum: ['yes', 'no', null], // Allow null if not this type of vote
        default: null
    },
    // For 'rating' elections
    ratingValue: {
        type: Number,
        default: null
    },
    // For 'image-based' elections
    selectedImageId: { // Could be the imageId from Election.candidates or a direct identifier
        type: mongoose.Schema.ObjectId,
        default: null
    },
    voter: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // The user who cast the vote
        required: [true, 'Vote must belong to a voter']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent voter from voting multiple times in the same election
// Create a compound index on election and voter, ensuring the combination is unique
// This ensures a voter can only submit one vote document per election, regardless of type.
VoteSchema.index({ election: 1, voter: 1 }, { unique: true });

// Pre-save hook to validate vote based on election type
VoteSchema.pre('save', async function(next) {
    const election = await mongoose.model('Election').findById(this.election).select('electionType candidates ratingOptions proposition');
    if (!election) {
        return next(new Error('Election not found for this vote.'));
    }

    // Clear irrelevant fields based on election type
    if (election.electionType === 'candidate-based') {
        this.choice = undefined;
        this.ratingValue = undefined;
        this.selectedImageId = undefined;
        if (!this.candidate) {
            return next(new Error('Candidate ID is required for a candidate-based election.'));
        }
        const isCandidateValid = election.candidates.some(c => c.candidateId.equals(this.candidate));
        if (!isCandidateValid) {
            return next(new Error('Selected candidate is not participating in this election.'));
        }
    } else if (election.electionType === 'yes-no') {
        this.candidate = undefined;
        this.ratingValue = undefined;
        this.selectedImageId = undefined;
        if (!this.choice || !['yes', 'no'].includes(this.choice)) {
            return next(new Error('A valid choice (yes/no) is required for a yes/no election.'));
        }
        if (!election.proposition) {
             return next(new Error('Proposition is not defined for this yes/no election.'));
        }
    } else if (election.electionType === 'rating') {
        this.candidate = undefined;
        this.choice = undefined;
        this.selectedImageId = undefined;
        if (this.ratingValue == null || typeof this.ratingValue !== 'number') {
            return next(new Error('A numeric rating value is required for a rating election.'));
        }
        if (election.ratingOptions && (this.ratingValue < election.ratingOptions.min || this.ratingValue > election.ratingOptions.max)) {
            return next(new Error(`Rating value must be between ${election.ratingOptions.min} and ${election.ratingOptions.max}.`));
        }
    } else if (election.electionType === 'image-based') {
        this.candidate = undefined;
        this.choice = undefined;
        this.ratingValue = undefined;
        if (!this.selectedImageId) {
            return next(new Error('A selected image ID is required for an image-based election.'));
        }
        const isImageOptionValid = election.candidates.some(opt => opt.imageId && opt.imageId.equals(this.selectedImageId));
        if (!isImageOptionValid) {
            // Also check if imageUrl was used as an identifier if imageId is not present
            const isImageUrlValid = election.candidates.some(opt => opt.imageUrl === this.selectedImageId.toString()); // Assuming selectedImageId might temporarily hold imageUrl string
            if(!isImageUrlValid){
                 return next(new Error('Selected image is not a valid option for this election.'));
            }
        }
    } else {
        return next(new Error('Invalid election type for voting.'));
    }

    next();
});


// Optional: You could add pre-save hooks here for validation, e.g.,
// - Check if the election is active.
// - Check if the voter is allowed to vote in this election.
// - Check if the candidate is actually part of the specified election.
// - Check if the voter has already voted (though the index handles the DB constraint).

/* Example pre-save hook (requires fetching related documents)
VoteSchema.pre('save', async function(next) {
    try {
        // Fetch the election
        const election = await this.model('Election').findById(this.election);
        if (!election) {
            return next(new Error('Election not found'));
        }
        // Check if election is active
        if (election.status !== 'active') {
            return next(new Error('Election is not active'));
        }
        // Check if candidate is valid for this election
        const isCandidateValid = election.candidates.some(c => c.candidateId.equals(this.candidate));
        if (!isCandidateValid) {
            return next(new Error('Selected candidate is not participating in this election'));
        }

        // Check if voter has already voted (redundant with index, but good for early feedback)
        // const existingVote = await this.constructor.findOne({ election: this.election, voter: this.voter });
        // if (existingVote) {
        //     return next(new Error('Voter has already cast a vote in this election'));
        // }

        // You might also want to update the User's hasVoted map here or in the route handler after saving
        next();
    } catch (error) {
        next(error);
    }
});
*/

module.exports = mongoose.model('Vote', VoteSchema);