// --- EDIT THIS LINE ---
// Import axios directly, like in other service files
import axios from 'axios';
// --- END EDIT ---

// Define the base URL for stats endpoints (adjust if different from other services)
// Assuming stats routes are mounted under /api/v1 like others
const API_URL = 'http://localhost:5000/api/v1/stats'; // Base URL for stats

const statsService = {
    getAdminStats: async () => {
        try {
            // Use axios directly and construct the full URL
            // Axios instance should have the Authorization header set by AuthContext if needed
            const response = await axios.get(`${API_URL}/admin`);
            return response.data; // { success: true, data: { ...stats } }
        } catch (error) {
            console.error("Error fetching admin stats:", error.response?.data || error.message);
            throw error.response?.data || new Error('Failed to fetch admin stats');
        }
    },

    getVoterStats: async () => {
        try {
            // Use axios directly
            const response = await axios.get(`${API_URL}/voter`);
            return response.data; // { success: true, data: { ...stats } }
        } catch (error) {
            console.error("Error fetching voter stats:", error.response?.data || error.message);
            throw error.response?.data || new Error('Failed to fetch voter stats');
        }
    },

    getCandidateStats: async () => {
        try {
            // Use axios directly
            const response = await axios.get(`${API_URL}/candidate`);
            return response.data; // { success: true, data: { ...stats } }
        } catch (error) {
            console.error("Error fetching candidate stats:", error.response?.data || error.message);
            throw error.response?.data || new Error('Failed to fetch candidate stats');
        }
    },
};

export default statsService;