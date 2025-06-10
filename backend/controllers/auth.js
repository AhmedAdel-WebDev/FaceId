const User = require('../models/User');
const faceRecognitionService = require('../services/faceRecognitionService'); // Ensure this is imported
const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const axios = require('axios');
const { Buffer } = require('buffer');
const crypto = require('crypto');

// @desc    Register user (Public Registration)
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    console.log('--- New Registration Request ---');
    console.log('req.body contents:', JSON.stringify(req.body).substring(0, 500) + (JSON.stringify(req.body).length > 500 ? '...' : '')); // Log part of req.body
    console.log('req.file (for CV):', req.file);
    console.log('Raw req.body.profileImages:', req.body.profileImages);
    console.log('Type of req.body.profileImages:', typeof req.body.profileImages);
    if (req.body.profileImages !== undefined) {
        console.log('Is req.body.profileImages an array?:', Array.isArray(req.body.profileImages));
        console.log('Length of req.body.profileImages (if array/string):', req.body.profileImages.length);
    }

    try {
        const { 
            name, 
            username, 
            email: originalEmail, 
            password, 
            role, 
            idNumber, 
            birthDate, 
            gender,
            // New fields
            street,
            city,
            state,
            zipCode,
            phoneNumber
        } = req.body; // Destructure other fields
        
        let profileImagesFromBody = req.body.profileImages; // Get profileImages separately
        const email = originalEmail ? originalEmail.toLowerCase() : undefined;
        let cvPath = ''; // Initialize cvPath

        // Handle CV upload if a file is present (path provided by multer or similar middleware)
        if (req.file && req.file.path) {
            cvPath = req.file.path.replace(/\\/g, '/'); // Normalize path for storage
        }

        // Ensure profileImagesFromBody is correctly processed into an array PImages
        let PImages = [];
        if (profileImagesFromBody) {
            if (!Array.isArray(profileImagesFromBody)) {
                PImages = [profileImagesFromBody]; // Wrap single string in an array
            } else {
                PImages = profileImagesFromBody; // Use as is if already an array
            }
        }
        console.log('Processed PImages array:', PImages.map(p => typeof p === 'string' ? p.substring(0,30) + '...' : p)); // Log processed PImages (first 30 chars)
        console.log('Length of PImages array:', PImages.length);

        // Validate required fields including username and PImages array
        // The error message implies profileImages is missing or not an array with items.
        // PImages.length === 0 covers cases where profileImages was undefined, null, or an empty array initially.
        if (!name || !username || !email || !password || !role || PImages.length === 0 || !idNumber || !birthDate || !gender || 
            !street || !city || !state || !phoneNumber) {
            return next(new ErrorResponse('Please provide all required fields including name, username, email, password, role, profile images, ID number, birth date, gender, address, and phone number', 400));
        }

        // Basic validation for new fields (more specific validation can be added)
        if (idNumber.length !== 14 || !/^[0-9]+$/.test(idNumber)) {
            return next(new ErrorResponse('ID number must be 14 digits', 400));
        }
        try {
            const parsedBirthDate = new Date(birthDate);
            if (isNaN(parsedBirthDate.getTime())) {
                return next(new ErrorResponse('Invalid birth date format', 400));
            }
        } catch (e) {
            return next(new ErrorResponse('Invalid birth date format', 400));
        }
        const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!allowedGenders.includes(gender)) {
            return next(new ErrorResponse('Invalid gender selected', 400));
        }
        
        // Validate phone number format
        if (!/^[0-9+\s()-]{8,20}$/.test(phoneNumber)) {
            return next(new ErrorResponse('Please provide a valid phone number', 400));
        }

        // Validate each image in the array (basic check)
        for (const img of PImages) { // Use PImages here
            if (typeof img !== 'string' || !img.startsWith('data:image/')) {
                console.warn('An item in profileImages does not appear to be a data URL:', img.substring(0, 50) + '...');
                // Depending on strictness, you might return an error here
                // return next(new ErrorResponse('All profile images must be valid base64 data URLs', 400));
            }
        }

        // The validation is now done in the loop above.

        try {
            const trimmedUsername = username.trim(); // Trim input username
            // Note: Username existence check moved outside this try block
            console.log(`Attempting to create user with username: '${trimmedUsername}'`); // Log before create
            console.log(`Trimmed username for check: '${trimmedUsername}'`); // Log trimmed username

            if (!trimmedUsername) { // Also check if username becomes empty after trimming
                console.log('Username became empty after trimming.');
                return next(new ErrorResponse('Username cannot be empty or just whitespace', 400));
            }

            // Check if username already exists
            const existingUser = await User.findOne({ username: { $regex: `^${trimmedUsername}$`, $options: 'i' } }); // Use trimmed username
            if (existingUser) {
                console.log(`Found existing user with username '${trimmedUsername}'. ID: ${existingUser._id}`);
                return next(new ErrorResponse('Username already exists', 400));
            } else {
                console.log(`No existing user found with username '${trimmedUsername}'. Proceeding to create.`);
            }

            // 1. Create user in MongoDB
            const user = await User.create({
                name,
                username: trimmedUsername, // Use trimmed username
                email, // Already lowercased
                password,
                role,
                profileImage: PImages[0], // Use the first image from PImages as the profile picture
                idNumber,
                cvPath, // Add cvPath (will be empty string if no file uploaded or handled differently)
                birthDate,
                gender,
                // New fields
                street,
                city,
                state,
                zipCode,
                phoneNumber
            });
            console.log(`Successfully created user in DB. ID: ${user._id}`); // Log after successful create

            // 2. Register faces with the Python service
            try {
                // Pass the username and the array of base64 images
                await faceRecognitionService.registerFace(trimmedUsername, PImages); // Pass PImages array
                console.log(`Successfully sent ${PImages.length} images for user '${trimmedUsername}' to the recognition service for registration.`);
            } catch (faceRegError) {
                console.error(`Failed to register faces for user '${trimmedUsername}' with the recognition service:`, faceRegError); // Use trimmed username
                // Decide how to handle this error. Options:
                // a) Delete the created user and return an error
                // await User.findByIdAndDelete(user._id);
                // return next(new ErrorResponse('Failed to register face data. User creation rolled back.', 500));
                // b) Log the error and continue (user exists but face login won't work)
                // return next(new ErrorResponse('User created, but failed to register face data. Please contact support.', 500)); // Or maybe a 201 with a warning?
                // c) For now, let's just log it and proceed, but return an error to the client
                return next(new ErrorResponse(`User created in DB, but failed to register faces: ${faceRegError.message || 'Unknown error'}`, 500));
            }

            // 3. Send success response - Account pending approval
            res.status(201).json({
                success: true,
                message: 'Registration successful. Your account is pending admin approval.'
                // No token or user data is sent until approval
            });

        } catch (error) {
            console.error('Error during registration inner try-catch:', error); // Log the full error

            if (error.code === 11000) {
                console.log('Caught MongoDB duplicate key error (11000).'); // Log entry into block
                console.log('Error keyPattern:', error.keyPattern); // Log keyPattern
                // Check which field caused the duplicate key error
                if (error.keyPattern && error.keyPattern.username) {
                    console.log('Duplicate key error specifically for username.');
                    return next(new ErrorResponse('Username already exists', 400));
                } else if (error.keyPattern && error.keyPattern.email) {
                    console.log('Duplicate key error specifically for email.');
                    return next(new ErrorResponse('Email already exists', 400));
                } else {
                    console.log('Duplicate key error for other field:', error.keyPattern);
                    // Generic duplicate key error if the field isn't username or email
                    return next(new ErrorResponse('Duplicate field value entered', 400));
                }
            }
            if (error.name === 'ValidationError') {
                console.error('Mongoose Validation Error Details:', error.errors);
                const messages = Object.values(error.errors).map(val => val.message);
                return next(new ErrorResponse(`Validation Failed: ${messages.join(', ')}`, 400));
            }
            // Handle other potential errors during user creation
            next(new ErrorResponse(error.message || 'User registration failed', 500));
        }
    } catch (outerError) {
        console.error('Unexpected outer error in registration:', outerError);
        next(outerError);
    }
};

// @desc    Login user (First Factor - Email/Password)
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email: originalEmail, password } = req.body;
        const email = originalEmail ? originalEmail.toLowerCase() : undefined;

        // Validate email & password presence
        if (!email || !password) {
            return next(new ErrorResponse('Please provide an email and password', 400));
        }

        // Check for user
        // Explicitly select the password and isApproved fields
        const user = await User.findOne({ email }) // email is already lowercased
            .select('+password +isApproved +isVerified');

        if (!user) {
            return next(new ErrorResponse('Invalid credentials', 401)); // Unauthorized
        }

        // Check if user account is approved
        if (!user.isApproved) {
            return next(new ErrorResponse('Account not approved. Please wait for admin approval.', 403)); // Forbidden
        }

        // Optional: Check if user account is verified (e.g., email verification)
        // if (!user.isVerified) {
        //     return next(new ErrorResponse('Account not verified. Please check your email.', 403)); // Forbidden
        // }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return next(new ErrorResponse('Invalid credentials', 401)); // Unauthorized
        }

        // Instead of sending final token, send a temporary token for face verification
        const stageOnePayload = {
            id: user._id,
            username: user.username, // Include username for the next step
            type: 'stageOneAuth'
        };

        const stageOneToken = jwt.sign(stageOnePayload, process.env.JWT_SECRET, {
            expiresIn: '10m' // Short-lived token for the second factor
        });

        res.status(200).json({
            success: true,
            message: 'Password verified. Please proceed with Face ID verification.',
            stageOneToken,
            username: user.username // Send username to frontend to associate with face scan
        });

    } catch (error) {
        console.error(error);
        next(new ErrorResponse('Server Error during login', 500));
    }
};

// Helper function to generate JWT, set cookie, and send response
// MODIFIED: Accept userResponseData to allow pre-cleaned data
exports.sendTokenResponse = (user, statusCode, res, userResponseData = null) => {
    // Create token using the original user object's ID and role
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });

    const options = {
        expires: new Date(
            Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE || '30', 10) * 24 * 60 * 60 * 1000)
        ),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    // Use the provided userResponseData if available, otherwise create from user object
    const responseJsonUser = userResponseData ? userResponseData :
                            (user.toObject ? user.toObject() : { ...user });

    // Ensure password and potentially large image data are removed from the final response body
    delete responseJsonUser.password;
    if (responseJsonUser.faceDescriptors) { // If faceDescriptors exist (they shouldn't in register response)
        delete responseJsonUser.faceDescriptors;
    }
    // Consider removing profileImage if it's the large base64 string
    // delete responseJsonUser.profileImage;

    res.status(statusCode)
       .cookie('token', token, options)
       .json({
           success: true,
           token,
           user: responseJsonUser // Send cleaned user data
       });
};

// @desc    Verify Face ID and Login User (Second Factor)
// @route   POST /api/v1/auth/verifyface
// @access  Public (requires stageOneToken)
exports.verifyFaceLogin = async (req, res, next) => {
    try {
        const { stageOneToken, image, username: expectedUsername } = req.body; // Expect username from frontend too

        if (!stageOneToken || !image || !expectedUsername) {
            return next(new ErrorResponse('Please provide the stage one token, face image, and username', 400));
        }

        let decoded;
        try {
            decoded = jwt.verify(stageOneToken, process.env.JWT_SECRET);
        } catch (err) {
            return next(new ErrorResponse('Invalid or expired stage one token', 401));
        }

        if (!decoded.id || !decoded.username || decoded.type !== 'stageOneAuth') {
            return next(new ErrorResponse('Malformed stage one token', 401));
        }

        // Crucially, verify that the username from the token matches the username submitted with the face
        if (decoded.username.toLowerCase() !== expectedUsername.toLowerCase()) {
            console.warn(`Username mismatch: token username '${decoded.username}' vs submitted username '${expectedUsername}'`);
            return next(new ErrorResponse('User identity mismatch. Please try logging in again.', 401));
        }

        // 1. Verify face with the Python service, using the username from the trusted token
        try {
            console.log(`Attempting to verify face for username: ${decoded.username}`);
            // Call the updated service method, passing the expected username and the image
            const recognitionResult = await faceRecognitionService.verifyFace(decoded.username, image);

            if (!recognitionResult || !recognitionResult.verified) { // Simplified check based on typical verify endpoint
                 console.log('Face verification failed or did not return verified status.', recognitionResult);
                return next(new ErrorResponse('Face verification failed. Face not recognized or does not match.', 401));
            }
            // If recognitionResult includes a username, it's good for logging, but the primary check is `verified` flag.
            // And we've already confirmed the `expectedUsername` matches `decoded.username`.
            const recognizedUsername = recognitionResult.username || decoded.username; // Use recognized if available, else from token
            console.log(`Face verified for: ${recognizedUsername}`);

        } catch (faceVerifyError) {
            console.error(`Error during face verification for ${decoded.username}:`, faceVerifyError);
            // Check if the error is from the service being unavailable or a specific recognition error
            if (faceVerifyError.message && faceVerifyError.message.includes('No face detected')) {
                return next(new ErrorResponse('No face detected in the provided image.', 400));
            }
            if (faceVerifyError.message && faceVerifyError.message.includes('multiple faces')) {
                return next(new ErrorResponse('Multiple faces detected. Please ensure only one face is present.', 400));
            }
            return next(new ErrorResponse(faceVerifyError.message || 'Face verification service error', 500));
        }

        // 2. Fetch user from DB (user ID is from the trusted stageOneToken)
        const user = await User.findById(decoded.id).select('+isApproved +isVerified');

        if (!user) {
            // This case should be rare if stageOneToken was valid and user existed then
            return next(new ErrorResponse('User not found for the provided token', 404));
        }

        // Double check approval status (though it was checked in stage one)
        if (!user.isApproved) {
            return next(new ErrorResponse('Account not approved. Please wait for admin approval.', 403));
        }

        // 3. Send final token response
        exports.sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error('Error in verifyFaceLogin:', error);
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        // req.user is already populated by the 'protect' middleware
        // and the password has already been excluded by .select('-password') in protect
        const user = req.user;

        if (!user) {
            // This case should technically be handled by 'protect', but as a safeguard:
            return next(new ErrorResponse('User not found or not authenticated', 401));
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
         console.error(err);
         next(new ErrorResponse('Server Error fetching user data', 500));
    }
};


// @desc    Face Login (Single Factor - This will be deprecated or modified)
// @route   POST /api/v1/auth/facelogin
// @access  Public
exports.faceLogin = async (req, res, next) => {
    const { image } = req.body; // Expect base64 image string in request body

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
         return next(new ErrorResponse('Please provide a valid base64 image data URL', 400));
        // return next(new ErrorResponse('Please provide an image', 400));
    }

    try {
        // 1. Call the Python API service to recognize the face
        const recognitionResult = await faceRecognitionService.recognizeFace(image);

        if (!recognitionResult || !recognitionResult.recognized || recognitionResult.username === 'Unknown') {
            return next(new ErrorResponse('Face not recognized or invalid', 401));
            // return next(new ErrorResponse('Face not recognized', 401));
        }

        // 2. Find the user in the database by the recognized username (case-insensitive and trimmed)
        const trimmedUsername = recognitionResult.username.trim();
        console.log(`Attempting to find user with username (case-insensitive): '${trimmedUsername}'`); // Added logging
        // Select isApproved and isVerified fields
        const user = await User.findOne({ username: { $regex: `^${trimmedUsername}$`, $options: 'i' } }).select('+isApproved +isVerified');

        if (!user) {
            // If user not found by username, return unauthorized
            console.log(`User not found in database for username: '${trimmedUsername}'`); // Added logging
            return next(new ErrorResponse('User associated with the recognized face not found', 401));
        }

        // Check if user account is approved
        if (!user.isApproved) {
            return next(new ErrorResponse('Account not approved. Please wait for admin approval.', 403)); // Forbidden
        }

        // Optional: Check if user account is verified
        // if (!user.isVerified) {
        //    return next(new ErrorResponse('Account not verified. Please check your email.', 403));
        // }

         // Optional: Check if user account is active/verified if needed
         // if (!user.isVerified) {
         //    return res.status(401).json({ success: false, message: 'User account not verified' });
         // }


        // 3. If user found, generate JWT token and send response
        // Use the modified sendTokenResponse helper
        exports.sendTokenResponse(user, 200, res);

    } catch (err) {
        console.error("Face login error:", err);
        // Check if the error came from the face recognition service
        if (err.isAxiosError || err.message?.includes('recognition service')) {
             next(new ErrorResponse('Face recognition service unavailable or failed.', 503));
        } else {
             next(new ErrorResponse('Server error during face login', 500));
        }
        // next(err);
    }
}; // This is the end of exports.faceLogin

// @desc    Request password reset using Face ID verification
// @route   POST /api/v1/auth/request-password-reset-face-verify
// @access  Public
exports.requestPasswordResetFaceVerify = async (req, res, next) => {
    try {
        const { image } = req.body;

        if (!image) {
            return next(new ErrorResponse('Please provide an image for face verification', 400));
        }

        // Use the recognizeFace function to identify the person
        const recognitionResult = await faceRecognitionService.recognizeFace(image);
        
        if (!recognitionResult || !recognitionResult.username || !recognitionResult.recognized || recognitionResult.username === 'Unknown') {
            return next(new ErrorResponse('Face verification failed. Face not recognized.', 401));
        }

        // Get user by recognized username
        const user = await User.findOne({ username: recognitionResult.username });
        if (!user) {
            return next(new ErrorResponse('User associated with this face not found', 404));
        }

        // Check if user account is approved
        if (!user.isApproved) {
            return next(new ErrorResponse('Account not approved. Please wait for admin approval.', 403));
        }

        // Generate password reset token (using crypto)
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (10 minutes)
        const resetExpire = Date.now() + 10 * 60 * 1000;

        // Update user with the reset token and expiration (don't modify other fields)
        // Use updateOne to only update specific fields without validating others
        await User.updateOne(
            { _id: user._id },
            {
                resetPasswordToken: hashedToken,
                resetPasswordExpire: resetExpire
            }
        );

        res.status(200).json({
            success: true,
            message: 'Face verification successful. You can now reset your password.',
            resetToken: resetToken // Send the unhashed token to the client for the reset step
        });

    } catch (error) {
        console.error('Error in requestPasswordResetFaceVerify:', error);
        next(new ErrorResponse('Server error processing face verification for password reset', 500));
    }
};

// @desc    Reset password using token (after face verification)
// @route   POST /api/v1/auth/reset-password-with-token
// @access  Public
exports.resetPasswordWithToken = async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return next(new ErrorResponse('Please provide a reset token and new password', 400));
        }

        // Hash the token from the request to compare with stored token
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Find user by the hashed token and check if token is expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return next(new ErrorResponse('Invalid or expired reset token', 400));
        }

        // We need to use save() to trigger the password hashing middleware
        // But first let's clear other fields that might cause validation issues
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        // Set the new password - this will be hashed by the model middleware
        user.password = newPassword;
        
        try {
            await user.save({ validateBeforeSave: false }); // Skip validation to avoid role issues
        } catch (saveError) {
            console.error('Error saving user with new password:', saveError);
            return next(new ErrorResponse('Error updating password', 500));
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Error in resetPasswordWithToken:', error);
        next(new ErrorResponse('Server error resetting password', 500));
    }
};

// @desc    Verify Current User's Face for Password Change (Profile)
// @route   POST /api/v1/auth/verify-current-user-face
// @access  Private
exports.verifyCurrentUserFaceForPasswordChange = async (req, res, next) => {
    // Placeholder implementation
    console.log('verifyCurrentUserFaceForPasswordChange called');
    // TODO: Implement actual logic
    next(new ErrorResponse('verifyCurrentUserFaceForPasswordChange not implemented', 501));
};

// @desc    Update Current User's Password with Token (Profile)
// @route   POST /api/v1/auth/update-current-user-password
// @access  Private
exports.updateCurrentUserPasswordWithToken = async (req, res, next) => {
    // Placeholder implementation
    console.log('updateCurrentUserPasswordWithToken called');
    // TODO: Implement actual logic
    next(new ErrorResponse('updateCurrentUserPasswordWithToken not implemented', 501));
};

// @desc    Verify Current User's Face for Profile Update
// @route   POST /api/v1/auth/verify-face-for-profile-update
// @access  Private
exports.verifyFaceForProfileUpdate = async (req, res, next) => {
    try {
        const userId = req.user.id; // From protect middleware
        const { image } = req.body;

        if (!image) {
            return next(new ErrorResponse('Please provide an image for face verification', 400));
        }

        // Get the user's username for face verification
        const user = await User.findById(userId);
        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Verify the user's face against stored images
        try {
            const verificationResult = await faceRecognitionService.verifyFace(user.username, image);
            
            if (!verificationResult || !verificationResult.verified) {
                return next(new ErrorResponse('Face verification failed. Please try again.', 401));
            }
            
            // Generate update token (valid for 15 minutes)
            const updateToken = crypto.randomBytes(20).toString('hex');
            
            // Hash token and store in user record
            const hashedToken = crypto
                .createHash('sha256')
                .update(updateToken)
                .digest('hex');
                
            // Store token with expiration time
            user.profileUpdateToken = hashedToken;
            user.profileUpdateExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
            
            await user.save({ validateBeforeSave: false });
            
            // Return success with token
            return res.status(200).json({
                success: true,
                message: 'Face verification successful.',
                updateToken
            });
            
        } catch (faceVerifyError) {
            console.error('Face verification error:', faceVerifyError);
            if (faceVerifyError.message && faceVerifyError.message.includes('No face detected')) {
                return next(new ErrorResponse('No face detected in the provided image.', 400));
            }
            if (faceVerifyError.message && faceVerifyError.message.includes('multiple faces')) {
                return next(new ErrorResponse('Multiple faces detected. Please ensure only one face is present.', 400));
            }
            return next(new ErrorResponse('Face verification service error', 500));
        }
    } catch (error) {
        console.error('Error in verifyFaceForProfileUpdate:', error);
        next(new ErrorResponse('Server error during face verification', 500));
    }
};

// @desc    Update user profile with verification token
// @route   PUT /api/v1/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id; // From protect middleware
        const { updateToken } = req.body;
        
        // These are the fields that we'll allow to be updated
        const allowedFields = ['name', 'phoneNumber', 'street', 'city', 'state'];
        
        // Create an object with only the allowed fields from req.body
        const updateData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        
        // Verify token is provided
        if (!updateToken) {
            return next(new ErrorResponse('Profile update token is required', 400));
        }
        
        // Hash the provided token to match against stored token
        const hashedToken = crypto
            .createHash('sha256')
            .update(updateToken)
            .digest('hex');
            
        // Find user and verify token
        const user = await User.findOne({
            _id: userId,
            profileUpdateToken: hashedToken,
            profileUpdateExpire: { $gt: Date.now() }
        });
        
        if (!user) {
            return next(new ErrorResponse('Invalid or expired update token', 401));
        }
        
        // If no fields to update
        if (Object.keys(updateData).length === 0) {
            return next(new ErrorResponse('No valid fields provided for update', 400));
        }
        
        // Update the user's profile
        user.profileUpdateToken = undefined;
        user.profileUpdateExpire = undefined;
        
        // Apply updates to user object
        for (const [key, value] of Object.entries(updateData)) {
            user[key] = value;
        }
        
        // Save the updated user
        await user.save({ validateBeforeSave: false });
        
        // Return updated user (excluding sensitive fields)
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                idNumber: user.idNumber,
                profileImage: user.profileImage,
                birthDate: user.birthDate,
                gender: user.gender,
                street: user.street,
                city: user.city,
                state: user.state,
                phoneNumber: user.phoneNumber
            }
        });
        
    } catch (error) {
        console.error('Error in updateProfile:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return next(new ErrorResponse(`Validation error: ${messages.join(', ')}`, 400));
        }
        next(new ErrorResponse('Server error updating profile', 500));
    }
};

// Make sure getSignedJwtToken exists on your User model (d:\FaceId\backend\models\User.js)
// Example:
/*
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};
*/
