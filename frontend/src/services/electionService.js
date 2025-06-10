import axios from 'axios';
// No need to import authService here if axios defaults are set in AuthContext
// import authService from './authService';

// Configure the base URL for your backend API
const API_URL = 'http://localhost:5000/api/v1/elections'; // Adjust if needed

// Get all elections (public endpoint usually)
const getElections = async () => {
    try {
        const response = await axios.get(API_URL);
        // Ensure data exists and is an array
        return response.data?.data || [];
    } catch (error) {
        console.error("Error fetching elections:", error);
        // Re-throw or handle as needed, maybe return empty array or throw custom error
        throw error;
    }
};

// Get a single election by ID (public endpoint usually)
const getElectionById = async (id) => {
     try {
        const response = await axios.get(`${API_URL}/${id}`);
        // Ensure data exists
        return response.data?.data || null;
     } catch (error) {
        console.error(`Error fetching election ${id}:`, error);
        throw error; // Re-throw for the component to handle
     }
};

// Cast a vote in a specific election (requires authentication)
const castVote = async (electionId, voteData) => {
    if (!electionId) {
        throw new Error("Election ID is required to cast a vote.");
    }
    
    // Support both old format (just candidateId) and new format (voteData object)
    const payload = typeof voteData === 'string' 
        ? { candidateId: voteData } // Old format: candidateId string
        : voteData;                 // New format: { candidateId, choice, ratingValue, selectedImageId }
    
    if (!payload || Object.keys(payload).length === 0) {
        throw new Error("Vote data is required to cast a vote.");
    }

    console.log("VOTE PAYLOAD BEFORE PROCESSING:", payload); // Debug before
    
    // Additional preprocessing for image-based election votes
    // Ensure selectedImageId is a proper ObjectId string (not the whole object)
    if (payload.selectedImageId) {
        // If it's an object with _id property, use that
        if (typeof payload.selectedImageId === 'object' && payload.selectedImageId._id) {
            payload.selectedImageId = payload.selectedImageId._id;
        }
        
        // Convert to string in case it's an ObjectId instance
        if (payload.selectedImageId.toString) {
            payload.selectedImageId = payload.selectedImageId.toString();
        }
    }
    
    console.log("VOTE PAYLOAD AFTER PROCESSING:", payload); // Debug after

    try {
        // Axios instance should have the Authorization header set by AuthContext
        const response = await axios.post(`${API_URL}/${electionId}/votes`, payload);
        return response.data.data;
    } catch (err) {
        // Format the error for consistent handling
        console.error('Error details:', err.response?.data || err.message);
        // Get the most specific error message
        const errorMessage = err.response?.data?.message || err.message || 'Failed to cast vote';
        throw new Error(errorMessage);
    }
};

// Get results for a specific election (public endpoint usually)
const getElectionResults = async (electionId) => {
    if (!electionId) {
        throw new Error("Election ID is required to get results.");
    }
    try {
        // Corrected Endpoint based on backend routes/votes.js
        const response = await axios.get(`${API_URL}/${electionId}/votes/results`);
        // Assuming backend sends { success: true, data: { results: [...] } }
        return response.data?.data || { results: [] }; // Return the data part or default
    } catch (error) {
        console.error(`Error fetching results for election ${electionId}:`, error);
        // Throw the error so the component can display feedback
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch election results.');
    }
};


// Create a new election (requires admin authentication)
const createElection = async (electionData) => {
    // electionData should contain { title, description, startDate, endDate, status }
    // Candidates are no longer added at creation time
    if (!electionData) {
        throw new Error("Election data is required.");
    }
    
    // If using FormData (checking instance directly), we'll rely on backend validation
    // Otherwise, we'll do basic validation here
    if (!(electionData instanceof FormData) && 
        (!electionData.title || !electionData.startDate || !electionData.endDate || !electionData.status)) {
        throw new Error("Missing required fields for creating an election (Title, Start Date, End Date, Status).");
    }
    
    try {
        // Check if electionData is FormData (for image-based elections)
        let response;
        if (electionData instanceof FormData) {
            // For FormData, we need special config
            response = await axios.post(
                API_URL, 
                electionData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );
        } else {
            // For JSON data (other election types)
            response = await axios.post(API_URL, electionData);
        }
        // Assuming backend sends { success: true, message: '...', data: election }
        return response.data;
    } catch (error) {
        console.error("Error creating election:", error);
        // Throw the error so the component can display feedback
        // Include backend error message if available
        throw new Error(error.response?.data?.message || error.message || 'Failed to create election.');
    }
};

// Update an existing election (requires admin authentication)
const updateElection = async (id, electionData) => {
    if (!id || !electionData) {
        throw new Error("Election ID and update data are required.");
    }
    try {
        // Check if electionData is FormData (for image-based elections)
        let response;
        if (electionData instanceof FormData) {
            // For FormData, we need special config
            response = await axios.put(
                `${API_URL}/${id}`, 
                electionData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );
        } else {
            // For JSON data (other election types)
            response = await axios.put(`${API_URL}/${id}`, electionData);
        }
        // Assuming backend sends { success: true, message: '...', data: updatedElection }
        return response.data;
    } catch (error) {
        console.error(`Error updating election ${id}:`, error);
        // Throw the error so the component can display feedback
        // Include backend error message if available
        throw new Error(error.response?.data?.message || error.message || 'Failed to update election.');
    }
};

// Add the missing deleteElection function definition
// Delete an election (requires admin authentication)
const deleteElection = async (id) => {
    if (!id) {
        throw new Error("Election ID is required to delete.");
    }
    try {
        // Axios instance should have the Authorization header set by AuthContext
        const response = await axios.delete(`${API_URL}/${id}`);
        // Assuming backend sends { success: true, message: '...', data: {} }
        return response.data;
    } catch (error) {
        console.error(`Error deleting election ${id}:`, error);
        // Throw the error so the component can display feedback
        // Include backend error message if available
        throw new Error(error.response?.data?.message || error.message || 'Failed to delete election.');
    }
};


// Candidate applies for an election (requires candidate authentication)
// Add this method
// Update the applyForElection method
const applyForElection = async (electionId, formData) => {
    try {
        // Check if the description field is an object and convert it to a string
        if (formData.has('description')) {
            const descriptionValue = formData.get('description');
            // If the description is already an object (not a string), stringify it
            if (typeof descriptionValue === 'object' && descriptionValue !== null) {
                formData.set('description', JSON.stringify(descriptionValue));
            }
        }
        
        const response = await axios.post(
            `${API_URL}/${electionId}/apply`,  // Verify this matches your backend route
            formData, 
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`  // Add auth header
                }
            }
        );
        return response.data;
    } catch (err) {
        throw new Error(err.response?.data?.message || 'Application failed');
    }
};

// Admin approves a candidate application (requires admin authentication)
const approveApplication = async (electionId, candidateId) => {
     if (!electionId || !candidateId) {
        throw new Error("Election ID and Candidate ID are required to approve application.");
    }
    try {
        // Endpoint: PUT /api/v1/elections/:electionId/applications/:candidateId/approve
        const response = await axios.put(`${API_URL}/${electionId}/applications/${candidateId}/approve`);
        return response.data; // Expect { success: true, message: '...', data: updatedElection? }
    } catch (error) {
        console.error(`Error approving application for candidate ${candidateId} in election ${electionId}:`, error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to approve application.');
    }
};

// Admin rejects a candidate application (requires admin authentication)
const rejectApplication = async (electionId, candidateId) => {
     if (!electionId || !candidateId) {
        throw new Error("Election ID and Candidate ID are required to reject application.");
    }
    try {
        // Endpoint: DELETE /api/v1/elections/:electionId/applications/:candidateId/reject
        const response = await axios.delete(`${API_URL}/${electionId}/applications/${candidateId}/reject`);
        return response.data; // Expect { success: true, message: '...' }
    } catch (error) {
        console.error(`Error rejecting application for candidate ${candidateId} in election ${electionId}:`, error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to reject application.');
    }
};


// Check if the current user has voted in a specific election (requires authentication)
const checkVoteStatus = async (electionId) => {
    if (!electionId) {
        throw new Error("Election ID is required to check vote status.");
    }
    try {
        // Axios instance should have the Authorization header set by AuthContext
        // The endpoint assumes a nested route like /elections/:electionId/votes/status
        const response = await axios.get(`${API_URL}/${electionId}/votes/status`);
        // Assuming backend sends { success: true, data: { hasVoted: boolean } }
        return response.data?.data || { hasVoted: false }; // Return the data part or default
    } catch (error) {
        console.error(`Error checking vote status for election ${electionId}:`, error);
        // If the error is 404 (e.g., vote record not found), it likely means they haven't voted.
        // You might want to handle this gracefully depending on backend implementation.
        // For now, re-throw to let the component handle potential issues.
        // If a 404 specifically means "not voted", you could return { hasVoted: false } here.
        if (error.response && error.response.status === 404) {
            console.log(`Vote status check for election ${electionId} returned 404, assuming not voted.`);
            return { hasVoted: false };
        }
        throw error; // Re-throw other errors
    }
};

// Check if the current user is eligible to vote (requires authentication)
const checkVoteEligibility = async (electionId) => {
    if (!electionId) {
        throw new Error("Election ID is required to check vote eligibility.");
    }
    try {
        console.log("Checking vote eligibility for election:", electionId);
        
        const response = await axios.get(`${API_URL}/${electionId}/votes/eligibility`);
        console.log("Eligibility check response:", response.data);
        
        // If the response doesn't have the expected structure, log an error
        if (!response.data.hasOwnProperty('canVote')) {
            console.error("Invalid eligibility response format:", response.data);
            return { 
                success: false, 
                canVote: false, 
                reason: "Could not determine vote eligibility. Try refreshing the page."
            };
        }
        
        return response.data; // Returns { success: true, canVote: boolean, reason?: string, previousVoteInvalid?: boolean }
    } catch (error) {
        console.error(`Error checking vote eligibility for election ${electionId}:`, error);
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
        
        if (error.response && error.response.status === 404) {
            return { success: false, canVote: false, reason: "Eligibility check endpoint not found" };
        }
        
        // Return a more user-friendly error
        return { 
            success: false, 
            canVote: false, 
            reason: error.response?.data?.message || error.message || 'Failed to check vote eligibility' 
        };
    }
};


// Admin removes a candidate from an election (requires admin authentication)
const removeCandidate = async (electionId, candidateId) => {
    if (!electionId || !candidateId) {
        throw new Error("Election ID and Candidate ID are required to remove a candidate.");
    }
    try {
        // Endpoint: DELETE /api/v1/elections/:electionId/candidates/:candidateId
        const response = await axios.delete(`${API_URL}/${electionId}/candidates/${candidateId}`);
        return response.data; // Expect { success: true, message: '...', data: updatedCandidatesList }
    } catch (error) {
        console.error(`Error removing candidate ${candidateId} from election ${electionId}:`, error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to remove candidate.');
    }
};

// Bookmark an election (requires authentication)
const bookmarkElection = async (electionId) => {
    if (!electionId) {
        throw new Error("Election ID is required to bookmark.");
    }
    
    try {
        const response = await axios.post(`${API_URL}/${electionId}/bookmark`);
        return response.data;
    } catch (error) {
        console.error(`Error bookmarking election ${electionId}:`, error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to bookmark election.');
    }
};

// Remove a bookmark (requires authentication)
const removeBookmark = async (electionId) => {
    if (!electionId) {
        throw new Error("Election ID is required to remove bookmark.");
    }
    
    try {
        const response = await axios.delete(`${API_URL}/${electionId}/bookmark`);
        return response.data;
    } catch (error) {
        console.error(`Error removing bookmark for election ${electionId}:`, error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to remove bookmark.');
    }
};

// Get all bookmarked elections for the logged-in user (requires authentication)
const getBookmarkedElections = async () => {
    try {
        const response = await axios.get(`${API_URL}/bookmarks`);
        return response.data?.data || [];
    } catch (error) {
        console.error("Error fetching bookmarked elections:", error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch bookmarked elections.');
    }
};

// Get all applications submitted by the current candidate (requires candidate authentication)
const getMyApplications = async () => {
    try {
        const response = await axios.get(`${API_URL}/my-applications`);
        return response.data?.data || [];
    } catch (error) {
        console.error("Error fetching candidate applications:", error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch your applications.');
    }
};

// Get all elections the logged-in user has voted in along with their voting choices
const getMyVotes = async () => {
    try {
        const response = await axios.get('http://localhost:5000/api/v1/votes/my-votes');
        return response.data?.data || [];
    } catch (error) {
        console.error("Error fetching user voting history:", error);
        
        // If the API route doesn't exist (404), return an empty array instead of throwing
        if (error.response && error.response.status === 404) {
            console.warn("Votes endpoint not found. The server might need to be updated.");
            return [];
        }
        
        // For other errors, throw so the component can show the error message
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch your voting history.');
    }
};

// Update just the election status (requires admin authentication)
const updateElectionStatus = async (id, status) => {
    if (!id || !status) {
        throw new Error("Election ID and status are required.");
    }
    
    // Validate the status value
    const validStatuses = ['pending', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    try {
        // Use the dedicated status update endpoint
        const response = await axios.patch(`${API_URL}/${id}/status`, { status });
        console.log(`Election ${id} status updated to ${status}`);
        return response.data;
    } catch (error) {
        console.error(`Error updating election ${id} status:`, error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to update election status.');
    }
};

const electionService = {
    getElections,
    getElectionById,
    castVote,
    getElectionResults, // Now this function is defined above
    applyForElection,
    // approveCandidate, // Note: Your code has approveApplication/rejectApplication, ensure consistency
    // rejectCandidate,  // Note: Your code has approveApplication/rejectApplication, ensure consistency
    approveApplication, // Using the defined function name
    rejectApplication,  // Using the defined function name
    createElection,
    updateElection,
    deleteElection,
    checkVoteStatus,
    checkVoteEligibility,
    removeCandidate, // Add the new function here
    bookmarkElection,
    removeBookmark,
    getBookmarkedElections,
    getMyApplications,
    getMyVotes,
    updateElectionStatus // Add the new method to exports
};

export default electionService;