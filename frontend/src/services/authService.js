import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1/auth/'; // Base auth URL

// Function to get the auth header (if needed elsewhere)
const authHeader = () => {
    const token = localStorage.getItem('token');
    if (token) {
        return { Authorization: `Bearer ${token}` };
    } else {
        return {};
    }
};

// Updated to send profileImages as an array
const register = (name, username, email, password, role, profileImages) => { // Changed profileImage to profileImages
    return axios.post(API_URL + 'register', {
        name,
        username,
        email,
        password,
        role,
        profileImages // Send as profileImages array
    });
    // This register function is likely for admin creation as it expects a token back.
    // For public registration, the backend now returns a message, not a token.
};

// New function for public user registration
const publicRegister = async (formData) => { // Changed to accept FormData
    // The backend endpoint /api/v1/auth/register is now public
    // It will return a success message, not a token, as approval is pending.
    // Content-Type will be multipart/form-data due to FormData
    const response = await axios.post(API_URL + 'register', formData, {
        headers: {
            // axios automatically sets Content-Type to multipart/form-data when FormData is used
            // 'Content-Type': 'multipart/form-data', // No longer explicitly needed
        }
    });
    return response.data; // Expected: { success: true, message: '...' }
};

const login = async (email, password) => {
    const response = await axios.post(API_URL + 'login', {
        email,
        password,
    });
    // Backend will now return { success: true, message: '...', stageOneToken: '...', username: '...' }
    // The token and user data will be stored after successful face verification.
    return response.data;
};

// New function for second factor (Face ID verification)
const verifyFaceAndLogin = async (stageOneToken, username, imageBase64) => {
    const response = await axios.post(API_URL + 'verifyface', {
        stageOneToken,
        username,
        image: imageBase64,
    });
    // Assuming backend sends { success: true, token: '...', user: { user object } } upon successful 2FA
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
    }
    return response.data;
};

// Removed faceLogin function

// New function to request password reset via Face ID verification
const requestPasswordResetFaceVerify = async (imageBase64) => {
    const response = await axios.post(API_URL + 'request-password-reset-face-verify', {
        image: imageBase64,
    });
    // Backend should return { success: true, message: '...', resetToken: '...' }
    return response.data;
};

// New function to reset password using a token
const resetPasswordWithToken = async (resetToken, newPassword) => {
    const response = await axios.post(API_URL + 'reset-password-with-token', {
        resetToken,
        newPassword,
    });
    // Backend should return { success: true, message: '...' }
    return response.data;
};

// New function to verify current user's face for password change (when already authenticated)
const verifyCurrentUserFaceForPasswordChange = async (imageBase64) => {
    const response = await axios.post(API_URL + 'verify-current-user-face', {
        image: imageBase64,
    }, { headers: authHeader() }); // Requires authentication
    // Backend should return { success: true, message: '...', changeToken: '...' }
    return response.data;
};

// New function to update current user's password using a token (when already authenticated)
const updateCurrentUserPasswordWithToken = async (changeToken, newPassword) => {
    const response = await axios.post(API_URL + 'update-current-user-password', {
        changeToken,
        newPassword,
    }, { headers: authHeader() }); // Requires authentication
    // Backend should return { success: true, message: '...' }
    return response.data;
};

// New function to verify face for profile update
const verifyFaceForProfileUpdate = async (imageBase64) => {
    const response = await axios.post(API_URL + 'verify-face-for-profile-update', {
        image: imageBase64,
    }, { headers: authHeader() }); // Requires authentication
    // Backend should return { success: true, message: '...', updateToken: '...' }
    return response.data;
};

// New function to update profile with token
const updateProfile = async (updateToken, profileData) => {
    const response = await axios.put(API_URL + 'update-profile', {
        updateToken,
        ...profileData // Spread profile fields
    }, { headers: authHeader() }); // Requires authentication
    // Backend should return { success: true, message: '...', data: { updated user data } }
    return response.data;
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};

// Get current user profile from API (with fresh data)
const getProfile = async () => {
    const response = await axios.get(API_URL + 'me', { headers: authHeader() });
    return response.data;
};

const authService = {
    register,
    login,
    logout,
    getCurrentUser,
    getProfile,
    // Removed faceLogin from export
    verifyFaceAndLogin, // Add new 2FA face verification step
    authHeader,
    publicRegister,
    requestPasswordResetFaceVerify, // Add new function
    resetPasswordWithToken, // Add new function
    verifyCurrentUserFaceForPasswordChange, // Add new function
    updateCurrentUserPasswordWithToken, // Add new function
    verifyFaceForProfileUpdate, // Add new function for profile update
    updateProfile // Add new function for profile update
};

export default authService;