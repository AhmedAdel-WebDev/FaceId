import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Function to get the token from localStorage or AuthContext
const getToken = () => {
    // Adjust this based on how you store the auth token (e.g., localStorage, context)
    const token = localStorage.getItem('token'); 
    // Or if using AuthContext: const { token } = useAuth(); (this service can't use hooks directly)
    // For services, it's common to have a utility function or pass the token if needed.
    // For simplicity, assuming localStorage for now.
    return token;
};

const getAuthHeaders = () => {
    const token = getToken();
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
};

/**
 * Fetches users from the backend.
 * @param {boolean} pendingOnly - If true, fetches only users pending approval.
 * @returns {Promise<Object>} The response data from the API.
 */
export const getUsers = async (pendingOnly = false) => {
    try {
        const url = pendingOnly ? `${API_URL}/admin/users?pending=true` : `${API_URL}/admin/users`;
        const response = await axios.get(url, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error.response || error.message);
        throw error.response?.data || new Error('Failed to fetch users');
    }
};

/**
 * Approves a user account.
 * @param {string} userId - The ID of the user to approve.
 * @returns {Promise<Object>} The response data from the API.
 */
export const approveUser = async (userId) => {
    try {
        const response = await axios.put(`${API_URL}/admin/users/${userId}/approve`, {}, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error('Error approving user:', error.response || error.message);
        throw error.response?.data || new Error('Failed to approve user');
    }
};

/**
 * Rejects (deletes) a user account.
 * @param {string} userId - The ID of the user to reject.
 * @returns {Promise<Object>} The response data from the API.
 */
export const rejectUser = async (userId) => {
    try {
        const response = await axios.delete(`${API_URL}/admin/users/${userId}/reject`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error('Error rejecting user:', error.response || error.message);
        throw error.response?.data || new Error('Failed to reject user');
    }
};

/**
 * Fetches a single user by ID.
 * @param {string} userId - The ID of the user to fetch.
 * @returns {Promise<Object>} The response data from the API.
 */
export const getUserById = async (userId) => {
    try {
        const response = await axios.get(`${API_URL}/admin/users/${userId}`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching user by ID:', error.response || error.message);
        throw error.response?.data || new Error('Failed to fetch user by ID');
    }
};

// You might also need a function for the admin to create users, if that's still a requirement
// For example, if the existing register function in AuthContext was admin-only and needs to be preserved.
// This example assumes the public registration handles new user creation.