// Placeholder for face recognition service
// This requires significant setup with face-api.js

const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const User = require('../models/User'); // To fetch stored descriptors
const axios = require('axios');

// Patch face-api.js environment for Node.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// --- Model Loading (Needs to happen once on server start) ---
let modelsLoaded = false;
const MODELS_URL = path.join(__dirname, '../models/face-api'); // Create this folder and download models

async function loadModels() {
    if (modelsLoaded) return;
    try {
        console.log('Loading face-api models...');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL);
        modelsLoaded = true;
        console.log('Face-api models loaded successfully.');
    } catch (error) {
        console.error('Error loading face-api models:', error);
        // Handle error appropriately - maybe prevent server start or disable face auth
    }
}
// Call loadModels() when your server starts, e.g., in server.js

// --- Function to get descriptors from an image buffer ---
async function getDescriptorsFromImageBuffer(imageBuffer) {
    if (!modelsLoaded) throw new Error('Face models not loaded');
    try {
        const img = await canvas.loadImage(imageBuffer);
        const detections = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            return null; // No face detected
        }
        return detections.descriptor; // Float32Array
    } catch (error) {
        console.error('Error processing image for face descriptors:', error);
        throw error;
    }
}

// --- Function to find the best match ---
// Function to find the best match for a given face descriptor
async function findBestMatch(loginDescriptor) {
    try {
        // Get all users from the database
        const users = await User.find({});
        
        // Log for debugging
        console.log(`Found ${users.length} users in database to compare against.`);
        
        // Filter users who have face descriptors
        const usersWithFaces = users.filter(user => 
            user.faceDescriptors && 
            Array.isArray(user.faceDescriptors) && 
            user.faceDescriptors.length > 0
        );
        
        console.log(`${usersWithFaces.length} users have face descriptors stored.`);
        
        if (usersWithFaces.length === 0) {
            console.log('No users with face descriptors found in the database.');
            return null;
        }
        
        // Calculate distances between the login descriptor and all stored descriptors
        const matches = usersWithFaces.map(user => {
            // Ensure user.faceDescriptors is an array before mapping
            if (!user.faceDescriptors || !Array.isArray(user.faceDescriptors)) {
                console.log(`User ${user._id} has invalid face descriptors format.`);
                return { user, distance: Infinity };
            }
            
            // Calculate the minimum distance across all descriptors for this user
            const distances = user.faceDescriptors.map(descriptorWrapper => {
                // Ensure the descriptor wrapper is an array
                if (!Array.isArray(descriptorWrapper) || descriptorWrapper.length === 0) {
                    console.log(`User ${user._id} has empty descriptor wrapper.`);
                    return Infinity;
                }
                
                // Get the actual descriptor array (should be the first element in the wrapper)
                const storedDescriptor = descriptorWrapper[0];
                
                // Ensure the stored descriptor is an array
                if (!Array.isArray(storedDescriptor)) {
                    console.log(`User ${user._id} has invalid descriptor format.`);
                    return Infinity;
                }
                
                // Calculate Euclidean distance between descriptors
                return calculateEuclideanDistance(loginDescriptor[0], storedDescriptor);
            });
            
            // Find the minimum distance for this user
            const minDistance = Math.min(...distances);
            return { user, distance: minDistance };
        });
        
        // Sort matches by distance (ascending)
        matches.sort((a, b) => a.distance - b.distance);
        
        // Log the best match for debugging
        if (matches.length > 0) {
            console.log(`Best match: User ID ${matches[0].user._id} with distance ${matches[0].distance}`);
        }
        
        // Return the user with the smallest distance if it's below the threshold
        const threshold = 0.6; // Adjust this threshold based on testing
        if (matches.length > 0 && matches[0].distance < threshold) {
            return matches[0].user;
        }
        
        console.log(`No match found below threshold (${threshold}).`);
        return null;
    } catch (error) {
        console.error('Error in findBestMatch:', error);
        return null;
    }
}



// URL of the Python face recognition API
const PYTHON_API_URL = process.env.PYTHON_FACE_API_URL || 'http://localhost:5001'; // Use environment variable or default

/**
 * Registers a user's face images with the Python face recognition service.
 * @param {string} username - The username of the user.
 * @param {string[]} base64Images - An array of base64 encoded image strings.
 * @returns {Promise<object>} The response data from the Python API.
 */
async function registerFace(username, base64Images) {
    console.log(`Sending ${base64Images.length} images for user '${username}' to Python API (${PYTHON_API_URL}/register) for registration.`);
    try {
        const response = await axios.post(`${PYTHON_API_URL}/register`, {
            username: username,
            images: base64Images // Send the array of images
        }, {
           timeout: 30000 // Set a timeout (e.g., 30 seconds) for potentially long operations
        });

        console.log('Python API registration response status:', response.status);
        console.log('Python API registration response data:', response.data);

        // Check for successful status codes (e.g., 200 OK, 201 Created)
        if (response.status >= 200 && response.status < 300) {
             // Optionally, trigger a database reload on the Python side if needed by its API design
             // try {
             //     console.log(`Triggering database reload on Python API (${PYTHON_API_URL}/reload_database)`);
             //     await axios.post(`${PYTHON_API_URL}/reload_database`);
             //     console.log('Python API database reload triggered successfully.');
             // } catch (reloadError) {
             //     console.error('Error triggering Python API database reload:', reloadError.response ? reloadError.response.data : reloadError.message);
             //     // Decide if this should be a critical error or just a warning
             // }
            return response.data; // Return the response from the Python API
        } else {
            // Handle non-success status codes explicitly
            throw new Error(`Python API returned status ${response.status}: ${response.data.error || response.data.message || 'Registration failed'}`);
        }

    } catch (error) {
        console.error('Error calling Python API for face registration:');
        let errorMessage = 'Failed to communicate with face recognition service';
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            errorMessage = error.response.data?.error || error.response.data?.message || `Python API Error (${error.response.status})`;
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Request:', error.request);
            errorMessage = 'No response received from Python API. Is it running and accessible?';
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error', error.message);
            errorMessage = error.message;
        }
        console.error('Final Error Message:', errorMessage);
        throw new Error(`Face registration failed: ${errorMessage}`);
    }
}

/**
 * Verifies a face image against the registered faces using the Python service.
 * @param {string} base64Image - A base64 encoded image string for verification.
 * @returns {Promise<object|null>} - The matched user object from MongoDB or null if no match/error.
 */
async function verifyFace(expectedUsername, base64Image) { // Signature changed
    console.log(`Sending image to Python API (${PYTHON_API_URL}/recognize) for verification against expected user: ${expectedUsername}.`); // Log updated
    try {
        const response = await axios.post(`${PYTHON_API_URL}/recognize`, { // Endpoint changed to /recognize
            image: base64Image
        }, {
            timeout: 15000 // Set a timeout (e.g., 15 seconds)
        });

        console.log('Python API (called for verification) response status:', response.status);
        console.log('Python API (called for verification) response data:', response.data);

        // Python /recognize returns { "username": "recognized_name" }
        if (response.status === 200 && response.data && response.data.username) {
            const recognizedUsernameFromApi = response.data.username;
            if (recognizedUsernameFromApi !== 'Unknown' && recognizedUsernameFromApi.toLowerCase() === expectedUsername.toLowerCase()) {
                console.log(`Python API recognized user: ${recognizedUsernameFromApi}, which matches expected user: ${expectedUsername}. Verification successful.`);
                return { verified: true, username: recognizedUsernameFromApi }; // Return structure for auth.js
            } else {
                console.log(`Python API recognized user: ${recognizedUsernameFromApi}, but it does not match expected user: ${expectedUsername} or was 'Unknown'. Verification failed.`);
                return { verified: false, username: recognizedUsernameFromApi };
            }
        } else {
            console.log('Python API did not return a valid username or status was not 200 during verification call.');
            return { verified: false, username: 'Error/UnknownResponse' }; // Indicate error or unexpected response
        }

    } catch (error) {
        console.error('Error calling Python API for face verification (via /recognize):');
         let errorMessage = 'Failed to communicate with face verification service';
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            errorMessage = error.response.data?.error || error.response.data?.message || `Python API Error (${error.response.status})`;
        } else if (error.request) {
            console.error('Request:', error.request);
            errorMessage = 'No response received from Python API during verification.';
        } else {
            console.error('Error', error.message);
            errorMessage = error.message;
        }
        console.error('Final Verification Error (service level):', errorMessage);
        // Return a structure indicating failure, consistent with what auth.js expects
        return { verified: false, username: 'Error/ServiceCommunication', error: errorMessage };
    }
}

/**
 * Recognizes a face from a base64 encoded image using the Python service.
 * @param {string} base64Image - A base64 encoded image string for recognition.
 * @returns {Promise<string|null>} - The recognized username or null if no match/error.
 */
async function recognizeFace(base64Image) {
    console.log(`Sending image to Python API (${PYTHON_API_URL}/recognize) for recognition.`);

    try {
        const response = await axios.post(`${PYTHON_API_URL}/recognize`, {
            image: base64Image
        }, {
            timeout: 15000 // Set a timeout (e.g., 15 seconds)
        });

        console.log('Python API recognition response status:', response.status);
        console.log('Python API recognition response data:', response.data);

        // Check for a successful response and a valid username
        // The python api returns { "username": "recognized_name" }
        if (response.status === 200 && response.data.username && response.data.username !== 'Unknown') {
            const username = response.data.username;
            console.log(`Python API recognized user: ${username}.`);
            // Return an object with the username property instead of just the username string
            return { username, recognized: true };
        } else {
            // Handle cases where Python API didn't find a match or returned an unexpected response
            console.log('No known face recognized by Python API or response indicates no match/error.');
            return { username: 'Unknown', recognized: false };
        }

    } catch (error) {
        console.error('Error calling Python API for face recognition:');
        let errorMessage = 'Failed to communicate with face recognition service';
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            errorMessage = error.response.data?.error || error.response.data?.message || `Python API Error (${error.response.status})`;
        } else if (error.request) {
            console.error('Request:', error.request);
            errorMessage = 'No response received from Python API during recognition.';
        } else {
            console.error('Error', error.message);
            errorMessage = error.message;
        }
        console.error('Final Recognition Error:', errorMessage);
        // For recognition failures (including communication errors), return error object
        return { username: 'Unknown', recognized: false, error: errorMessage };
    }
}

// --- Service Exports ---
module.exports = {
    registerFace, // Export the updated registration function
    verifyFace,   // Export the verification function
    recognizeFace // Export the new recognition function
};