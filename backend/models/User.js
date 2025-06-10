const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        trim: true // Optional: remove whitespace
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Don't return password by default when querying users
    },
    role: {
        type: String,
        enum: ['voter', 'candidate'], // Roles users can select during registration
        required: [true, 'Please select a role']
    },
    profileImage: {
        type: String, // Store URL or path to the image
        required: [true, 'Please add a profile image URL']
    },
    idNumber: {
        type: String,
        required: [true, 'Please add your ID number'],
        unique: true,
        match: [/^[0-9]{14}$/, 'Please add a valid 14-digit ID number']
    },
    cvPath: {
        type: String, // Store path to the CV file
        default: '' // Optional, so can be empty
    },
    birthDate: {
        type: Date,
        required: [true, 'Please add your birth date']
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: [true, 'Please select your gender']
    },
    // New address fields
    street: {
        type: String,
        required: [true, 'Please add your street address']
    },
    city: {
        type: String,
        required: [true, 'Please add your city']
    },
    state: {
        type: String,
        required: [true, 'Please add your state/province']
    },
    zipCode: {
        type: String,
        // Removed required validation to make it optional
    },
    // New phone number field
    phoneNumber: {
        type: String,
        required: [true, 'Please add your phone number'],
        match: [/^[0-9+\s()-]{8,20}$/, 'Please add a valid phone number']
    },
    isVerified: { // For email verification, etc.
        type: Boolean,
        default: false
    },
    isApproved: { // For admin approval of the account
        type: Boolean,
        default: false
    },
    hasVoted: {
        type: Map,
        of: Boolean,
        default: {}
    },
    bookmarkedElections: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Election',
        default: []
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    profileUpdateToken: String,
    profileUpdateExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password with hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);