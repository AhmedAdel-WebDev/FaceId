const mongoose = require('mongoose');
// Import Schema.Types for Mixed type
const Schema = mongoose.Schema;

const ElectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add an election title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    electionType: {
        type: String,
        enum: ['candidate-based', 'yes-no', 'rating', 'image-based'],
        default: 'candidate-based',
        required: [true, 'Please specify the election type']
    },
    // Fields for 'yes-no' election type
    proposition: {
        type: String,
        // Required only if electionType is 'yes-no'
        required: function() { return this.electionType === 'yes-no'; },
        maxlength: [500, 'Proposition cannot be more than 500 characters']
    },
    // Fields for 'rating' election type
    ratingOptions: {
        min: {
            type: Number,
            default: 1,
            required: function() { return this.electionType === 'rating'; }
        },
        max: {
            type: Number,
            default: 5,
            required: function() { return this.electionType === 'rating'; }
        },
        labelMin: {
            type: String,
            default: 'Poor',
            maxlength: [50, 'Min rating label cannot be more than 50 characters']
        },
        labelMax: {
            type: String,
            default: 'Excellent',
            maxlength: [50, 'Max rating label cannot be more than 50 characters']
        }
    },
    // For 'image-based' elections, the 'candidates' array will store image options.
    // Each item in 'candidates' for 'image-based' could have an imageURL and a label/name.
    // We might need to adjust the 'candidates' sub-schema or add a new one for image options.
    // Add thumbnail field
    thumbnail: {
        type: String, // Store URL or path to the image
        default: 'no-thumbnail.jpg' // Optional: provide a default image path/name
    },
    startDate: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    endDate: {
        type: Date,
        required: [true, 'Please add an end date'],
        // Remove the custom validator that might cause issues on update
        // validate: [dateValidator, 'End date must be after start date']
    },
    candidates: [{ // Array of candidates (for 'candidate-based') or image options (for 'image-based')
        candidateId: { // Used for 'candidate-based' elections
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            // Make it not strictly required at schema level, validation will be in controller based on type
            // required: true
            required: function() { return this.electionType === 'candidate-based'; }
        },
        // Fields for 'image-based' election options
        imageId: { // A unique identifier for the image option if not using candidateId
            type: mongoose.Schema.ObjectId,
            auto: true // Can be auto-generated if not linking to another collection
        },
        imageUrl: {
            type: String,
            // required: function() { return this.electionType === 'image-based'; }
        },
        imageLabel: { // Optional label for the image
            type: String,
            maxlength: [100, 'Image label cannot be more than 100 characters']
        },
        name: String,
        profileImage: String,
        // --- EDIT: Add fields to store copied application data ---
        applicationDescription: {
            type: String,
            default: '' // Default to empty string if not provided
        },
        cvPath: {
            type: String,
            default: '' // Default to empty string if not provided
        },
        // Add fields for extended candidate details
        idNumber: {
            type: String,
            default: ''
        },
        planPoints: {
            type: [String],
            default: []
        },
        socialMedia: {
            facebook: String,
            twitter: String,
            instagram: String,
            linkedin: String
        }
        // --- END EDIT ---
    }],

    applications: [{ // Array of applications for this election
        candidateId: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true
        },
        description: { // Field in the original application
            type: Schema.Types.Mixed, // Change from String to Mixed type to support both strings and objects
            required: [true, 'Application must include a description']
        },
        cvPath: { // Field in the original application
            type: String,
            required: [true, 'Application must include a CV path']
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    // Flag to indicate status was manually set and should not be auto-updated
    manualStatus: {
        type: Boolean,
        default: true // Default to true to prevent auto-updates for all elections
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
    // Add any virtuals or methods if needed
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Validator function to ensure end date is after start date
// The dateValidator function is no longer needed for endDate validation
// function dateValidator(value) {
//     // `this` refers to the document being validated
//     return this.startDate <= value;
// }

// Optional: Middleware to update status based on dates automatically
ElectionSchema.pre('save', function(next) {
    // IMPORTANT: If this isn't a new document, don't modify the status
    // This ensures that manual status changes are always respected
    if (!this.isNew) {
        return next();
    }
    
    // For new elections only, set initial status based on dates
    // Skip if status is already 'cancelled' (manual override)
    if (this.status === 'cancelled') {
        return next();
    }
    
    // If status is explicitly set by admin, respect it
    if (this.status === 'active' || this.status === 'completed') {
        return next();
    }
    
    const now = new Date();
    
    // Different status initialization based on election type
    if (this.electionType === 'candidate-based') {
        // Only candidate-based elections start as 'pending'
        this.status = 'pending';
    } else if (['yes-no', 'image-based', 'rating'].includes(this.electionType)) {
        // Yes-no, image-based, and rating elections start as 'active' directly
        // If current date is after end date, mark as completed
        if (now > this.endDate) {
            this.status = 'completed';
        } 
        // If current date is after start date but before end date, mark as active
        else if (now > this.startDate) {
            this.status = 'active';
        }
        // If current date is before start date, still mark as active (will become active on start date)
        else {
            this.status = 'active';
        }
    } else {
        // Default fallback (should never happen with enum validation)
        this.status = 'pending';
    }
    
    next();
});

module.exports = mongoose.model('Election', ElectionSchema);