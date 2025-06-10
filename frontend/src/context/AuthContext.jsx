import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';
import axios from 'axios'; // Import axios to set default headers

// Create Context
const AuthContext = createContext();

// Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true); // Add loading state

    // Effect to load user on initial render/refresh
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user'); // Try loading from storage first

            if (token) {
                 // Set axios default header for subsequent requests
                 axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                 setIsAuthenticated(true);

                 if (storedUser) {
                     setUser(JSON.parse(storedUser));
                 } else {
                     try {
                         // If no stored user but we have a token, fetch fresh user data
                         const response = await authService.getProfile();
                         setUser(response.data);
                     } catch (error) {
                         console.error('Error loading user profile:', error);
                         // If token is invalid, clear everything
                         authService.logout();
                         setIsAuthenticated(false);
                         setUser(null);
                     }
                 }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    // Register user (likely admin or specific scenarios)
    const register = async (name, username, email, password, role, profileImage) => { // Add username parameter
        const response = await authService.register(name, username, email, password, role, profileImage); // Pass username to service
        
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Set axios default header
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            
            setUser(response.data.user);
            setIsAuthenticated(true);
        }
        
        return response.data;
    };

    // Public Register user
    const publicRegister = async (formData) => { // Changed to accept FormData
        // This function calls the public registration service.
        // It does not log the user in or set a token, as account approval is pending.
        const response = await authService.publicRegister(formData); // Pass FormData directly
        return response; // Returns { success: true, message: '...' }
    };

    // Login user (First Factor - Email/Password)
    const login = async (email, password) => {
        const response = await authService.login(email, password);
        
        // Set axios default header
        if (response.token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
        }
        
        // For 2FA, token and user are set after successful face verification.
        // This login function now primarily returns the stageOneToken and username from the backend.
        // Actual authentication state (isAuthenticated, user) will be set by verifyFaceAndLogin.
        // No need to set axios default headers here, as it's done after final verification.
        // setUser(response.user); // This will be set by verifyFaceAndLogin
        // setIsAuthenticated(true); // This will be set by verifyFaceAndLogin
        return response; // Expected: { success, message, stageOneToken, username }
    };

    // Verify Face and Login (Second Factor)
    const verifyFaceAndLogin = async (stageOneToken, username, imageBase64) => {
        const response = await authService.verifyFaceAndLogin(stageOneToken, username, imageBase64);

        if (response.token && response.user) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
            setUser(response.user);
            setIsAuthenticated(true);
        } else {
            // Handle cases where token/user might not be present on error
            // Error handling might be more robust in the component calling this
            console.error('Verification or final login step failed:', response.message);
        }
        return response; // Return the full response which includes user and final token or error
    };

    // Removed faceLogin function (single-factor Face ID login)

    // Logout user
    const logout = () => {
        authService.logout();
        // Remove axios default header
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
    };

    // Request password reset with Face ID verification
    const requestPasswordResetFaceVerify = async (imageBase64) => {
        // This will call the service, which then calls the backend.
        // The backend is expected to return a reset token if face verification is successful.
        const response = await authService.requestPasswordResetFaceVerify(imageBase64);
        return response; // Expected: { success, message, resetToken }
    };

    // Reset password using the token obtained from face verification
    const resetPasswordWithToken = async (resetToken, newPassword) => {
        // This will call the service to update the password.
        const response = await authService.resetPasswordWithToken(resetToken, newPassword);
        return response; // Expected: { success, message }
    };

    // Verify current user's face for password change (when already authenticated)
    const verifyCurrentUserFaceForPasswordChange = async (imageBase64) => {
        // Calls a service that verifies the face against the logged-in user's data
        // Expected to return a token for the password update step
        const response = await authService.verifyCurrentUserFaceForPasswordChange(imageBase64);
        return response; // Expected: { success, message, changeToken }
    };

    // Update current user's password using the token from face verification
    const updateCurrentUserPasswordWithToken = async (changeToken, newPassword) => {
        // Calls a service to update the authenticated user's password
        const response = await authService.updateCurrentUserPasswordWithToken(changeToken, newPassword);
        return response; // Expected: { success, message }
    };

    // Verify current user's face for profile update
    const verifyFaceForProfileUpdate = async (imageBase64) => {
        // Verify the user's face before allowing profile updates
        const response = await authService.verifyFaceForProfileUpdate(imageBase64);
        return response; // Expected: { success, message, updateToken }
    };

    // Update user profile with verification token
    const updateProfile = async (updateToken, profileData) => {
        // Update the user's profile after face verification
        const response = await authService.updateProfile(updateToken, profileData);
        
        // If update was successful, update the user in state and local storage
        if (response.success && response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        
        return response; // Expected: { success, message, data }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                loading,
                register,
                login, // First factor (email/password)
                verifyFaceAndLogin, // Second factor (face ID)
                // Removed faceLogin from export
                logout,
                publicRegister,
                requestPasswordResetFaceVerify, // Add new function for password reset face verification
                resetPasswordWithToken, // Add new function for resetting password with token
                verifyCurrentUserFaceForPasswordChange, // For profile page password change
                updateCurrentUserPasswordWithToken, // For profile page password change
                verifyFaceForProfileUpdate, // For profile page update
                updateProfile // For profile page update
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);