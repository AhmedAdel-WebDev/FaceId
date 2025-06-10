const express = require('express');
const {
    register,
    login,
    getMe,
    faceLogin, // This might be deprecated or removed later depending on 2FA finalization
    verifyFaceLogin, // For 2FA login
    requestPasswordResetFaceVerify, // New: For initiating password reset via face
    resetPasswordWithToken,         // New: For resetting password with a token
    verifyCurrentUserFaceForPasswordChange, // New: For verifying face before password change (profile)
    updateCurrentUserPasswordWithToken,  // New: For updating password after face verification (profile)
    verifyFaceForProfileUpdate,      // New: For verifying face before profile update
    updateProfile                    // New: For updating profile after face verification
} = require('../controllers/auth');
const { uploadCV } = require('../middleware/uploads');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', uploadCV, register);
router.post('/login', login);
router.post('/verifyface', verifyFaceLogin); // 2FA step after password login
// router.post('/facelogin', faceLogin); // Original single-factor face login (consider deprecation/modification) - Commented out due to undefined controller

// Password Reset Flow (Public)
router.post('/request-password-reset-face-verify', requestPasswordResetFaceVerify);
router.post('/reset-password-with-token', resetPasswordWithToken);

// Authenticated routes
router.get('/me', protect, getMe);

// Password Change Flow (Authenticated - from profile page)
router.post('/verify-current-user-face', protect, verifyCurrentUserFaceForPasswordChange);
router.post('/update-current-user-password', protect, updateCurrentUserPasswordWithToken);

// Profile Update Flow (Authenticated)
router.post('/verify-face-for-profile-update', protect, verifyFaceForProfileUpdate);
router.put('/update-profile', protect, updateProfile);

module.exports = router;