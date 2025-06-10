const mongoose = require('mongoose');
const Election = require('../models/Election');
const User = require('../models/User');
const path = require('path'); // Needed for file paths
const fs = require('fs'); // Needed for file system operations (like deleting old CV)
// Add error handling utilities later (e.g., ErrorResponse, asyncHandler)

// @desc    Get all elections
// @route   GET /api/v1/elections
// @access  Public
exports.getElections = async (req, res, next) => {
    try {
        // Basic query, can be expanded with filtering, sorting, pagination later
        const elections = await Election.find().populate('createdBy', 'name email'); // Populate creator info

        res.status(200).json({
            success: true,
            count: elections.length,
            data: elections
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
        // next(err);
    }
};

// @desc    Get single election
// @route   GET /api/v1/elections/:id
// @access  Public
exports.getElection = async (req, res, next) => {
    try {
        const election = await Election.findById(req.params.id)
            .populate('createdBy', 'name email') // Populate creator info
            .populate({ // Populate approved candidates and their user details
                path: 'candidates.candidateId',
                select: 'name email profileImage' // Select fields for candidate user
            })
            // --- EDIT: Add population for the full applications array ---
            .populate({ // Populate all applications associated with the election
                path: 'applications',
                populate: { // Also populate the candidate details within each application
                    path: 'candidateId',
                    select: 'name email profileImage' // Select fields for applicant user
                }
            });
            // --- END EDIT ---

        if (!election) {
            // Use ErrorResponse later
            return res.status(404).json({ success: false, message: `Election not found with id of ${req.params.id}` });
            // return next(new ErrorResponse(`Election not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: election });
    } catch (err) {
        console.error(err);
        // Handle potential CastError if ID format is invalid
        if (err.name === 'CastError') {
             return res.status(404).json({ success: false, message: `Election not found with id of ${req.params.id}` });
            // return next(new ErrorResponse(`Election not found with id of ${req.params.id}`, 404));
        }
        res.status(500).json({ success: false, message: 'Server Error' });
        // next(err);
    }
};

// @desc    Create new election
// @route   POST /api/v1/elections
// @access  Private (Admin)
exports.createElection = async (req, res, next) => {
    try {
        const createdBy = req.user.id;
        // For image-based, 'candidates' (image URLs) will come from req.files, not req.body.candidates
        // imageLabels will be a separate field in req.body for image-based type
        const { electionType, proposition, ratingOptions, imageLabels, candidates, ...otherFields } = req.body;

        let electionData = { ...otherFields, createdBy };

        if (!electionType || !['candidate-based', 'yes-no', 'rating', 'image-based'].includes(electionType)) {
            return res.status(400).json({ success: false, message: 'A valid electionType (candidate-based, yes-no, rating, image-based) is required.' });
        }
        electionData.electionType = electionType;

        if (electionType === 'candidate-based') {
            if (candidates && Array.isArray(candidates)) {
                const processedCandidates = [];
                for (let i = 0; i < candidates.length; i++) {
                    const cand = candidates[i];
                    if (!cand.candidateId || !mongoose.Types.ObjectId.isValid(cand.candidateId)) {
                        return res.status(400).json({ success: false, message: `Valid Candidate ID is required for candidate-based election option at index ${i}.` });
                    }
                    const user = await User.findById(cand.candidateId);
                    if (!user || user.role !== 'candidate') {
                        return res.status(400).json({ success: false, message: `Invalid candidate ID or user is not a candidate: ${cand.candidateId} at index ${i}.` });
                    }
                    processedCandidates.push({
                        candidateId: cand.candidateId,
                        name: cand.name || user.name,
                        profileImage: cand.profileImage || user.profileImage,
                        applicationDescription: cand.applicationDescription || '',
                        cvPath: cand.cvPath || ''
                    });
                }
                electionData.candidates = processedCandidates;
            } else {
                electionData.candidates = [];
            }
            electionData.proposition = undefined;
            electionData.ratingOptions = undefined;
        } else if (electionType === 'yes-no') {
            electionData.proposition = proposition;
            electionData.candidates = [];
            electionData.ratingOptions = undefined;
        } else if (electionType === 'rating') {
            electionData.ratingOptions = ratingOptions;
            electionData.candidates = [];
            electionData.proposition = undefined;
        } else if (electionType === 'image-based') {
            if (candidates && Array.isArray(candidates) && candidates.length > 0) {
                electionData.candidates = candidates.map((opt, index) => {
                    if (!opt.imageUrl || typeof opt.imageUrl !== 'string') {
                        const err = new Error(`imageUrl (string) is required for image option at index ${index}.`);
                        err.statusCode = 400; // Custom property for error handler
                        throw err;
                    }
                    return {
                        imageUrl: opt.imageUrl,
                        imageLabel: opt.imageLabel || `Option ${index + 1}`,
                        name: opt.imageLabel || `Option ${index + 1}`, // Consistent field name for display
                        profileImage: opt.imageUrl // Consistent field name for display
                    };
                });
            } else if (req.files && req.files.length > 0) {
                // Handle uploaded files for image-based elections
                const parsedImageLabels = imageLabels ? JSON.parse(imageLabels) : [];
                electionData.candidates = req.files.map((file, index) => {
                    const label = parsedImageLabels[index] || `Option ${index + 1}`;
                    const imagePath = `/${file.path.replace(/\\/g, '/')}`;
                    return {
                        imageUrl: imagePath,
                        imageLabel: label,
                        name: label, // Consistent field name for display
                        profileImage: imagePath // Consistent field name for display
                    };
                });
            } else {
                return res.status(400).json({ success: false, message: 'At least one image option is required for an image-based election.' });
            }
            electionData.proposition = undefined;
            electionData.ratingOptions = undefined;
        }

        const election = await Election.create(electionData);

        res.status(201).json({ // 201 Created
            success: true,
            data: election
        });
    } catch (err) {
        console.error(err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
        // next(err);
    }
};

// @desc    Update election
// @route   PUT /api/v1/elections/:id
// @access  Private (Admin)
exports.updateElection = async (req, res, next) => {
    try {
        let election = await Election.findById(req.params.id);

        if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id of ${req.params.id}` });
        }

        if (req.body.createdBy) {
            delete req.body.createdBy;
        }
        
        // Initialize oldImagePathsToDelete array here to avoid the ReferenceError
        let oldImagePathsToDelete = [];
        
        // For image-based, 'candidates' might come from req.files (new uploads) or req.body.candidates (existing image data)
        // imageLabels will be a separate field in req.body for new uploads with image-based type
        const { electionType, candidates, proposition, ratingOptions, imageLabels, removedImageIds, status, ...otherUpdates } = req.body;
        let updatePayload = { ...otherUpdates };
        
        // If status is being explicitly updated, set manualStatus flag to true
        if (status !== undefined) {
            updatePayload.status = status;
            updatePayload.manualStatus = true; // Mark status as manually set
        }
        
        let unsetFields = {};

        const finalElectionType = electionType || election.electionType;
        if (electionType && electionType !== election.electionType) {
            updatePayload.electionType = electionType;
        }

        if (finalElectionType === 'candidate-based') {
            if (candidates !== undefined) {
                if (Array.isArray(candidates)) {
                    const processedCandidates = [];
                    for (let i = 0; i < candidates.length; i++) {
                        const cand = candidates[i];
                        if (!cand.candidateId || !mongoose.Types.ObjectId.isValid(cand.candidateId)) {
                            return res.status(400).json({ success: false, message: `Valid Candidate ID is required for candidate-based election option at index ${i}.` });
                        }
                        const user = await User.findById(cand.candidateId);
                        if (!user || user.role !== 'candidate') {
                            return res.status(400).json({ success: false, message: `Invalid candidate ID or user is not a candidate: ${cand.candidateId} at index ${i}.` });
                        }
                        processedCandidates.push({
                            _id: cand._id || undefined, // Preserve _id if updating existing subdocument
                            candidateId: cand.candidateId,
                            name: cand.name || user.name,
                            profileImage: cand.profileImage || user.profileImage,
                            applicationDescription: cand.applicationDescription !== undefined ? cand.applicationDescription : (election.candidates.find(ec => ec.candidateId.toString() === cand.candidateId.toString())?.applicationDescription || ''),
                            cvPath: cand.cvPath !== undefined ? cand.cvPath : (election.candidates.find(ec => ec.candidateId.toString() === cand.candidateId.toString())?.cvPath || '')
                        });
                    }
                    updatePayload.candidates = processedCandidates;
                } else {
                    return res.status(400).json({ success: false, message: `Candidates must be an array for candidate-based election.` });
                }
            }
            if (electionType === 'candidate-based' || (election.electionType === 'candidate-based' && proposition !== undefined)) { unsetFields.proposition = 1; updatePayload.proposition = undefined; }
            if (electionType === 'candidate-based' || (election.electionType === 'candidate-based' && ratingOptions !== undefined)) { unsetFields.ratingOptions = 1; updatePayload.ratingOptions = undefined; }
        } else if (finalElectionType === 'yes-no') {
            if (proposition !== undefined) { updatePayload.proposition = proposition; }
            if (electionType === 'yes-no' || (election.electionType === 'yes-no' && candidates !== undefined)) { updatePayload.candidates = []; }
            if (electionType === 'yes-no' || (election.electionType === 'yes-no' && ratingOptions !== undefined)) { unsetFields.ratingOptions = 1; updatePayload.ratingOptions = undefined; }
        } else if (finalElectionType === 'rating') {
            if (ratingOptions !== undefined) { updatePayload.ratingOptions = ratingOptions; }
            if (electionType === 'rating' || (election.electionType === 'rating' && candidates !== undefined)) { updatePayload.candidates = []; }
            if (electionType === 'rating' || (election.electionType === 'rating' && proposition !== undefined)) { unsetFields.proposition = 1; updatePayload.proposition = undefined; }
        } else if (finalElectionType === 'image-based') {
            // For image-based elections, we'll now only update image options' labels 
            // and preserve the existing image files
            
            // Check if this is a new election being created
            if (!isEditMode && req.files && req.files.length > 0) {
                // Handle new image uploads for new elections only
                const parsedImageLabels = imageLabels ? JSON.parse(imageLabels) : [];
                
                // Create new image entries for the uploaded files
                const newImageEntries = req.files.map((file, index) => {
                    const label = parsedImageLabels[index] || `Option ${index + 1}`;
                    const imagePath = `/${file.path.replace(/\\/g, '/')}`;
                    return {
                        imageUrl: imagePath,
                        imageLabel: label,
                        name: label,
                        profileImage: imagePath
                    };
                });
                
                updatePayload.candidates = newImageEntries;
                
            } else if (candidates) {
                // For existing elections, only update the labels of existing images
                // but keep the image files themselves
                if (Array.isArray(candidates)) {
                    // Create a map of existing candidates for quick lookup
                    const existingCandidatesMap = {};
                    election.candidates.forEach(candidate => {
                        if (candidate._id) {
                            existingCandidatesMap[candidate._id.toString()] = candidate;
                        }
                    });
                    
                    // Update only the labels while preserving image URLs
                    updatePayload.candidates = candidates.map(candidate => {
                        if (candidate._id && existingCandidatesMap[candidate._id.toString()]) {
                            // Get the existing candidate data
                            const existingCandidate = existingCandidatesMap[candidate._id.toString()];
                            return {
                                _id: candidate._id,
                                imageUrl: existingCandidate.imageUrl, // Preserve original image URL
                                imageLabel: candidate.imageLabel || existingCandidate.imageLabel,
                                name: candidate.imageLabel || existingCandidate.imageLabel, // Update name to match the label
                                profileImage: existingCandidate.imageUrl // Preserve profile image
                            };
                        } else {
                            // This shouldn't normally happen, but handle it just in case
                            // by returning candidate as is
                            return candidate;
                        }
                    });
                } else {
                    // No changes to candidates provided, keep existing ones
                    updatePayload.candidates = election.candidates;
                }
            } else {
                // No candidates data provided, keep existing ones
                updatePayload.candidates = election.candidates;
            }

            // Clear unrelated fields for image-based elections
            if (electionType === 'image-based' || (election.electionType === 'image-based' && proposition !== undefined)) { 
                unsetFields.proposition = 1; 
                updatePayload.proposition = undefined; 
            }
            if (electionType === 'image-based' || (election.electionType === 'image-based' && ratingOptions !== undefined)) { 
                unsetFields.ratingOptions = 1; 
                updatePayload.ratingOptions = undefined; 
            }
        } else if (electionType) {
             return res.status(400).json({ success: false, message: `Invalid electionType: ${electionType}` });
        }

        if (Object.keys(unsetFields).length > 0) {
            updatePayload.$unset = unsetFields;
        }

        election = await Election.findByIdAndUpdate(req.params.id, updatePayload, {
            new: true,
            runValidators: true,
            context: 'query' // Important for conditional schema validation on update
        });

        // After successful update, delete old image files if new ones were uploaded
        if (oldImagePathsToDelete.length > 0) {
            oldImagePathsToDelete.forEach(filePath => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image file: ${filePath}`, err);
                        // Don't fail the request, but log the error
                    } else {
                        console.log(`Successfully deleted old image file: ${filePath}`);
                    }
                });
            });
        }

        res.status(200).json({ success: true, data: election });
    } catch (err) {
        console.error(err);
         if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (err.name === 'CastError') {
             return res.status(404).json({ success: false, message: `Election not found with id of ${req.params.id}` });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
        // next(err);
    }
};

// @desc    Delete election
// @route   DELETE /api/v1/elections/:id
// @access  Private (Admin)
exports.deleteElection = async (req, res, next) => {
    try {
        const election = await Election.findById(req.params.id);

        if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id of ${req.params.id}` });
        }

        // Find all votes associated with this election
        const Vote = require('../models/Vote'); // Import Vote model
        
        // First, find all users who voted in this election so we can update their hasVoted map
        const votes = await Vote.find({ election: req.params.id }).select('voter');
        
        if (votes.length > 0) {
            console.log(`Deleting ${votes.length} votes associated with election ${req.params.id}`);
            
            // Get unique voter IDs
            const voterIds = [...new Set(votes.map(vote => vote.voter.toString()))];
            
            // Update each user's hasVoted map to remove this election
            if (voterIds.length > 0) {
                const updatePromises = voterIds.map(voterId => {
                    return User.findByIdAndUpdate(
                        voterId,
                        { $unset: { [`hasVoted.${req.params.id}`]: "" } },
                        { new: true }
                    );
                });
                
                // Use Promise.allSettled to handle all updates, even if some fail
                const updateResults = await Promise.allSettled(updatePromises);
                const successCount = updateResults.filter(result => result.status === 'fulfilled').length;
                console.log(`Updated hasVoted map for ${successCount}/${voterIds.length} users`);
            }
            
            // Delete all votes for this election
            const deleteResult = await Vote.deleteMany({ election: req.params.id });
            console.log(`Deleted ${deleteResult.deletedCount} votes for election ${req.params.id}`);
        }

        // Delete the election itself
        await election.remove(); // Triggers 'remove' middleware if any

        res.status(200).json({ 
            success: true, 
            message: `Election and ${votes.length} associated votes deleted successfully`,
            data: {} 
        });
    } catch (err) {
        console.error(err);
         if (err.name === 'CastError') {
             return res.status(404).json({ success: false, message: `Election not found with id of ${req.params.id}` });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
        // next(err);
    }
};


// @desc    Candidate applies to an election
// @route   POST /api/v1/elections/:id/apply
// @access  Private (Candidate)
// Update applyToElection controller
exports.applyToElection = async (req, res, next) => {
    // --- Add Detailed Logging ---
    console.log('--- Inside applyToElection ---');
    console.log('req.user:', req.user ? req.user.id : 'undefined'); // Log user ID from protect middleware
    console.log('req.params.id:', req.params.id); // Log election ID
    console.log('req.body:', JSON.stringify(req.body, null, 2)); // Log the parsed text fields
    console.log('req.file:', req.file ? JSON.stringify(req.file, null, 2) : 'undefined'); // Log the uploaded file details
    // --- End Detailed Logging ---

    try {
        const electionId = req.params.id;
        const candidateId = req.user.id; // From protect middleware
        const { description } = req.body;

        // --- Check if CV file was uploaded ---
        // Log the derived path *before* checking it
        const cvPath = req.file ? req.file.path : undefined;
        console.log('Derived cvPath:', cvPath); // Log the path we are trying to use

        if (!req.file) {
            console.error('Validation Error Triggered: CV file is missing (req.file is undefined).');
            return res.status(400).json({ success: false, message: 'CV file (PDF) is required.' });
        }
        // --- End Check ---

        // Log the derived description *before* checking it
        console.log('Derived description:', description);

        if (!description) {
             console.error('Validation Error Triggered: Description is missing (req.body.description is undefined).');
             return res.status(400).json({ success: false, message: 'Application description is required.' });
        }

        // Parse the extended description JSON if it's a string
        let parsedDescription;
        try {
            // Check if the description is a JSON string
            if (typeof description === 'string') {
                // Try to parse it if it looks like JSON
                if (description.startsWith('{') && description.endsWith('}')) {
                    parsedDescription = JSON.parse(description);
                    console.log('Parsed extended description:', JSON.stringify(parsedDescription, null, 2));
                } else {
                    // If it's not JSON formatted, use it as-is (backward compatibility)
                    parsedDescription = description;
                }
            } else if (typeof description === 'object' && description !== null) {
                // If it's already an object, use it directly
                parsedDescription = description;
                console.log('Using object description:', JSON.stringify(parsedDescription, null, 2));
            } else {
                // For any other case, use as is
                parsedDescription = description;
            }
        } catch (parseError) {
            console.error('Error parsing description JSON:', parseError);
            // Continue with the original description string if parsing fails
            parsedDescription = description;
        }

        const election = await Election.findById(electionId);

        if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }

        // Check if user has already applied
        if (election.applications.some(app => app.candidateId.toString() === candidateId)) {
            return res.status(400).json({ success: false, message: 'You have already applied to this election.' });
        }

        // --- Create the application object ---
        const newApplication = {
            candidateId: candidateId,
            description: parsedDescription, // Use the parsed or original description
            cvPath: cvPath,                // Use the derived cvPath
            status: 'pending',
            appliedAt: new Date()
        };
        // --- End Create ---


        election.applications.push(newApplication);
        await election.save(); // This is where the ValidationError occurs if fields are missing

        // --- DEBUGGING LOG ---
        console.log('Application Saved Successfully:', JSON.stringify(newApplication, null, 2));
        // --- END DEBUGGING LOG ---


        res.status(201).json({ success: true, message: 'Application submitted successfully.' });

    } catch (err) {
        // Log the error *before* sending the response
        console.error('Error in applyToElection catch block:', err);

        // Handle potential file system errors if needed (e.g., delete uploaded file if DB save fails)
        if (req.file && req.file.path) {
             // Consider adding logic to delete req.file.path if the DB operation failed
             // fs.unlink(req.file.path, (unlinkErr) => { ... });
        }


        // Handle validation errors specifically
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            // Log the specific validation messages
            console.error('Validation Error Details:', messages.join(', '));
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }

        res.status(500).json({ success: false, message: 'Server Error applying to election' });
        // next(err);
    }
};

// Update approveApplication controller
// @desc    Approve a candidate application
// @route   PUT /api/v1/elections/:id/applications/:candidateId/approve
// @access  Private (Admin)
exports.approveApplication = async (req, res, next) => {
    const { id: electionId, candidateId } = req.params;
    console.log(`Attempting to approve application for candidate ${candidateId} in election ${electionId}`);

    try {
        // Fetch the election and populate the entire applications array,
        // including the candidateId within each application.
        const election = await Election.findById(electionId)
            .populate({
                path: 'applications',
                populate: {
                    path: 'candidateId',
                    select: 'name email profileImage' // Include fields needed for candidate entry
                }
            });

        if (!election) {
            console.error(`Approve Error: Election not found with id ${electionId}`);
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }

        // Check election type - only candidate-based elections should have applications
        if (election.electionType !== 'candidate-based') {
            console.warn(`Approve Warning: Cannot approve application for election of type ${election.electionType}`);
            return res.status(400).json({ 
                success: false, 
                message: `Applications can only be approved for 'candidate-based' elections. Current type: ${election.electionType}` 
            });
        }

        // Check election status (moved check after finding election)
        if (election.status !== 'pending') {
            console.warn(`Approve Warning: Election ${electionId} status is not 'pending' (status: ${election.status})`);
            return res.status(400).json({ success: false, message: `Applications can only be approved for 'pending' elections. Current status: ${election.status}` });
        }

        // Find the application using the candidate's User ID
        // Ensure candidateId on application exists before comparing
        const applicationIndex = election.applications.findIndex(app => app.candidateId && app.candidateId._id.equals(candidateId));

        if (applicationIndex === -1) {
            console.error(`Approve Error: Application from candidate ${candidateId} not found for election ${electionId}. Applications found:`, election.applications);
            return res.status(404).json({ success: false, message: `Application from candidate ${candidateId} not found for this election.` });
        }

        // Get the actual application object using the index
        const application = election.applications[applicationIndex];
        // --- Logging from previous step (keep for verification) ---
        console.log('-----------------------------------------');
        console.log('[DEBUG] Found application object before copy:', JSON.stringify(application, null, 2));
        console.log(`[DEBUG] Checking values directly: application.description = ${application.description}, application.cvPath = ${application.cvPath}`);
        console.log('-----------------------------------------');
        // --- End Logging ---

        // Check if the candidate is already in the approved list
        const isAlreadyCandidate = election.candidates.some(c => c.candidateId && c.candidateId.equals(candidateId));
        if (isAlreadyCandidate) {
             console.warn(`Approve Warning: Candidate ${candidateId} already approved for election ${electionId}. Removing application.`);
             election.applications.splice(applicationIndex, 1); // Remove application by index
             await election.save();
             // Fetch updated data to send back
             const updatedElection = await Election.findById(electionId)
                .populate('candidates.candidateId', 'name email profileImage')
                .populate({ path: 'applications', populate: { path: 'candidateId', select: 'name email profileImage' } });
             return res.status(400).json({ success: false, message: 'Candidate is already approved for this election. Application removed.', data: updatedElection });
        }

        // We already have the populated candidate info from the application object
        const candidateUser = application.candidateId;
        if (!candidateUser) {
             // This shouldn't happen if findIndex worked, but good to check
             console.error(`Approve Error: Candidate user details missing in found application for ID ${candidateId}.`);
             return res.status(404).json({ success: false, message: `Candidate user details not found within the application.` });
        }

        // Extract detailed candidate information from the application description
        let candidateName = candidateUser.name;
        let extendedDetails = {};
        let applicationSummary = application.description;

        // Check if the description is an object (structured data) or a string
        if (typeof application.description === 'object' && application.description !== null) {
            // We have the enhanced structure already as an object
            extendedDetails = application.description;
            
            // Use the structured fullName if available, otherwise fallback to user's name
            candidateName = extendedDetails.fullName || candidateUser.name;
            
            // Use summary as the main description for display
            applicationSummary = extendedDetails.summary || '';
            
            console.log('[DEBUG] Using structured candidate data (object):', JSON.stringify(extendedDetails, null, 2));
        } else if (typeof application.description === 'string') {
            // Try to parse the string as JSON
            try {
                if (application.description.startsWith('{') && application.description.endsWith('}')) {
                    const parsedData = JSON.parse(application.description);
                    if (parsedData && typeof parsedData === 'object') {
                        extendedDetails = parsedData;
                        candidateName = parsedData.fullName || candidateUser.name;
                        applicationSummary = parsedData.summary || application.description;
                        console.log('[DEBUG] Using structured candidate data (parsed from string):', JSON.stringify(extendedDetails, null, 2));
                    }
                }
            } catch (e) {
                console.error('Error parsing application description JSON:', e);
                // If parsing fails, use the original string as-is
                applicationSummary = application.description;
            }
        }

        // --- EDIT: Log the object being constructed before pushing ---
        const candidateEntry = {
            candidateId: candidateUser._id,
            name: candidateName, // Use name from structured data or populated user
            profileImage: candidateUser.profileImage, // Use image from populated user
            applicationDescription: applicationSummary, // Use summary or original description text
            cvPath: application.cvPath,                // Copy CV path from application
            // Add extended information fields
            idNumber: extendedDetails.idNumber || '',
            planPoints: extendedDetails.planPoints || [],
            socialMedia: extendedDetails.socialMedia || {
                facebook: null,
                twitter: null,
                instagram: null,
                linkedin: null
            }
        };
        console.log('-----------------------------------------');
        console.log('[DEBUG] Object constructed to push to candidates:', JSON.stringify(candidateEntry, null, 2));
        console.log('-----------------------------------------');
        // --- END EDIT ---

        // Add to the candidates array, copying details from the application
        election.candidates.push(candidateEntry);


        // Remove from applications array using the index
        election.applications.splice(applicationIndex, 1);

        await election.save();
        console.log(`Application for candidate ${candidateId} approved successfully for election ${electionId}.`);

        // Fetch the updated election data again to ensure all populations are correct in the response
        const finalElectionData = await Election.findById(electionId)
            .populate('createdBy', 'name email')
            .populate('candidates.candidateId', 'name email profileImage') // Populate approved candidates
            .populate({ // Populate remaining applications
                path: 'applications',
                populate: { path: 'candidateId', select: 'name email profileImage' }
            });

        // --- EDIT: Log the final candidates array before sending response ---
        console.log('-----------------------------------------');
        console.log('[DEBUG] Final candidates array in response data being sent to frontend:', JSON.stringify(finalElectionData.candidates, null, 2));
        console.log('-----------------------------------------');
        // --- END EDIT ---


        res.status(200).json({
            success: true,
            message: `Application for candidate ${candidateId} approved.`,
            data: finalElectionData // Send fully populated data back
        });

    } catch (err) {
        console.error(`Server Error in approveApplication for Election ID: ${req.params.id}, Candidate ID: ${req.params.candidateId}`, err);
        if (err.name === 'CastError') {
             return res.status(404).json({ success: false, message: `Invalid ID format provided.` });
        }
        res.status(500).json({ success: false, message: 'Server Error approving application' });
    }
};


// @desc    Get all applications for a specific election
// @route   GET /api/v1/elections/:electionId/applications
// @access  Private (Admin)
exports.getElectionApplications = async (req, res, next) => {
    try {
        const electionId = req.params.electionId;

        // Find the election and populate candidate details within applications
        const election = await Election.findById(electionId)
                                     .populate({
                                         path: 'applications.candidateId',
                                         select: 'name email profileImage' // Select fields to show for applicant
                                     });

        if (!election) {
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }

        // Optional: Check if the requesting user is the creator or just any admin
        // if (election.createdBy.toString() !== req.user.id && req.user.role !== 'admin') { ... }

        res.status(200).json({
            success: true,
            count: election.applications.length,
            data: election.applications
        });

    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
             return res.status(404).json({ success: false, message: `Election not found with id ${req.params.electionId}` });
        }
        res.status(500).json({ success: false, message: 'Server Error fetching applications' });
        // next(err);
    }
};

// @desc    Reject a candidate's application for an election
// @route   PUT /api/v1/elections/:id/applications/:candidateId/reject  // Assuming PUT based on route definition
// @access  Private (Admin)
exports.rejectApplication = async (req, res, next) => {
     try {
        // --- FIX: Use the correct parameter names from the route definition ---
        const electionId = req.params.id; // Use 'id' as defined in the route
        const candidateId = req.params.candidateId;
        // --- END FIX ---

        console.log(`Attempting to reject application for Election ID: ${electionId}, Candidate ID: ${candidateId}`); // Add log

        const election = await Election.findById(electionId);

        if (!election) {
            console.error(`Reject Error: Election not found with id ${electionId}`); // Add log
            return res.status(404).json({ success: false, message: `Election not found with id ${electionId}` });
        }

        // Check election type - only candidate-based elections should have applications
        if (election.electionType !== 'candidate-based') {
            console.warn(`Reject Warning: Cannot reject application for election of type ${election.electionType}`);
            return res.status(400).json({ 
                success: false, 
                message: `Applications can only be rejected for 'candidate-based' elections. Current type: ${election.electionType}` 
            });
        }

         // Ensure election is still pending (optional, maybe allow rejection anytime?)
        // if (election.status !== 'pending') {
        //     return res.status(400).json({ success: false, message: `Applications can only be rejected for 'pending' elections. Current status: ${election.status}` });
        // }

        // Find the application index
        const applicationIndex = election.applications.findIndex(app => app.candidateId.equals(candidateId));
        if (applicationIndex === -1) {
            console.error(`Reject Error: Application from candidate ${candidateId} not found for election ${electionId}.`); // Add log
            return res.status(404).json({ success: false, message: `Application from candidate ${candidateId} not found for this election.` });
        }

        // Get the application details before removing (optional, for logging/response)
        const rejectedApplication = election.applications[applicationIndex];

        // Remove the application from the array
        election.applications.splice(applicationIndex, 1);
        // Or using $pull: await Election.findByIdAndUpdate(electionId, { $pull: { applications: { candidateId: candidateId } } });

        await election.save();
        console.log(`Application for candidate ${candidateId} rejected successfully for election ${electionId}.`); // Add log

        res.status(200).json({
            success: true,
            message: `Application for candidate ${candidateId} rejected.`,
            data: { applications: election.applications } // Return updated applications list
        });

    } catch (err) {
        console.error(`Server Error in rejectApplication for Election ID: ${req.params.id}, Candidate ID: ${req.params.candidateId}`, err); // Log error with IDs
        if (err.name === 'CastError') {
             return res.status(404).json({ success: false, message: `Invalid ID format provided.` });
        }
        res.status(500).json({ success: false, message: 'Server Error rejecting application' });
        // next(err);
    }
};


// @desc    Get applications submitted by the logged-in candidate
// @route   GET /api/v1/elections/my-applications
// @access  Private (Candidate)
exports.getMyApplications = async (req, res, next) => {
    try {
        const candidateId = req.user.id; // Get candidate ID from authenticated user

        // Find elections where the user is either an applicant or an approved candidate
        const elections = await Election.find({
            $or: [
                { 'applications.candidateId': candidateId },
                { 'candidates.candidateId': candidateId }
            ]
        }).select('title description startDate endDate status candidates applications'); // Select relevant fields

        if (!elections || elections.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'You have not applied to any elections.',
                count: 0,
                data: []
            });
        }

        // Determine the status for the requesting candidate for each election
        const applicationStatuses = elections.map(election => {
            let applicationStatus = 'Unknown'; // Default status

            const isApproved = election.candidates.some(c => c.candidateId.equals(candidateId));
            const isPending = election.applications.some(app => app.candidateId.equals(candidateId));

            if (isApproved) {
                applicationStatus = 'Approved';
            } else if (isPending) {
                applicationStatus = 'Pending';
            } else {
                // If the election was found via the $or query but the ID is in neither list now,
                // it implies it was likely rejected (removed from applications without being added to candidates).
                applicationStatus = 'Rejected / Not Found'; // Or just filter these out if preferred
            }

            // Return a structured object for each application
            return {
                electionId: election._id,
                electionTitle: election.title,
                electionStatus: election.status, // Status of the election itself
                startDate: election.startDate,
                endDate: election.endDate,
                applicationStatus: applicationStatus // Status of *this candidate's* application
            };
        });

        // Optional: Filter out 'Rejected / Not Found' if you don't want to show them
        // const filteredStatuses = applicationStatuses.filter(app => app.applicationStatus !== 'Rejected / Not Found');

        res.status(200).json({
            success: true,
            count: applicationStatuses.length, // Or filteredStatuses.length
            data: applicationStatuses // Or filteredStatuses
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error fetching applications' });
        // next(err);
    }
};

// @desc    Remove a candidate from an election
// @route   DELETE /api/v1/elections/:id/candidates/:candidateId
// @access  Private (Admin)
exports.removeCandidate = async (req, res, next) => {
    try {
        // --- FIX: Use the correct parameter names from the route definition ---
        const electionId = req.params.id; // Use 'id' as defined in the route
        const candidateId = req.params.candidateId;
        // --- END FIX ---

        console.log(`Attempting to remove candidate ${candidateId} from election ${electionId}`); // Add log

        const election = await Election.findById(electionId);

        if (!election) {
            console.error(`Remove Candidate Error: Election not found with id ${electionId}`); // Add log
            return res.status(404).json({
                success: false,
                message: `Election not found with id ${electionId}`
            });
        }

        // Check if election status allows candidate removal
        if (election.status === 'completed') {
             console.warn(`Remove Candidate Warning: Cannot remove candidate from completed election ${electionId}`); // Add log
            return res.status(400).json({
                success: false,
                message: 'Cannot remove candidates from completed elections'
            });
        }

        // Find the candidate index
        const candidateIndex = election.candidates.findIndex(
            c => c.candidateId.equals(candidateId)
        );

        if (candidateIndex === -1) {
             console.error(`Remove Candidate Error: Candidate ${candidateId} not found in election ${electionId}`); // Add log
            return res.status(404).json({
                success: false,
                message: `Candidate ${candidateId} not found in this election`
            });
        }

        // Remove the candidate
        election.candidates.splice(candidateIndex, 1);
        await election.save();
        console.log(`Candidate ${candidateId} removed successfully from election ${electionId}.`); // Add log

        res.status(200).json({
            success: true,
            message: 'Candidate removed successfully',
            data: election.candidates // Return the updated list
        });

    } catch (err) {
        console.error(`Server Error in removeCandidate for Election ID: ${req.params.id}, Candidate ID: ${req.params.candidateId}`, err); // Log error with IDs
        if (err.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: `Invalid ID format provided`
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error removing candidate'
        });
        // next(err);
    }
};

// @desc    Bookmark an election
// @route   POST /api/v1/elections/:id/bookmark
// @access  Private
exports.bookmarkElection = async (req, res, next) => {
    try {
        const electionId = req.params.id;

        // Check if election exists
        const election = await Election.findById(electionId);
        if (!election) {
            return res.status(404).json({ 
                success: false, 
                message: `Election not found with id of ${electionId}` 
            });
        }

        // Get user
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if already bookmarked
        const alreadyBookmarked = user.bookmarkedElections.includes(electionId);
        if (alreadyBookmarked) {
            return res.status(400).json({
                success: false,
                message: 'Election already bookmarked'
            });
        }

        // Add election to bookmarks - use findByIdAndUpdate instead of save() to avoid validation
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $push: { bookmarkedElections: electionId } },
            { new: true, runValidators: false }
        );

        res.status(200).json({
            success: true,
            message: 'Election bookmarked successfully',
            data: updatedUser.bookmarkedElections
        });
    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
            return res.status(404).json({ 
                success: false, 
                message: `Election not found with id of ${req.params.id}` 
            });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Remove bookmark from election
// @route   DELETE /api/v1/elections/:id/bookmark
// @access  Private
exports.removeBookmark = async (req, res, next) => {
    try {
        const electionId = req.params.id;

        // Get user
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if bookmarked
        const bookmarkIndex = user.bookmarkedElections.indexOf(electionId);
        if (bookmarkIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Election not bookmarked'
            });
        }

        // Remove election from bookmarks - use findByIdAndUpdate instead of save()
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { bookmarkedElections: electionId } },
            { new: true, runValidators: false }
        );

        res.status(200).json({
            success: true,
            message: 'Bookmark removed successfully',
            data: updatedUser.bookmarkedElections
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get user's bookmarked elections
// @route   GET /api/v1/elections/bookmarks
// @access  Private
exports.getBookmarkedElections = async (req, res, next) => {
    try {
        // Get user with populated bookmarked elections
        const user = await User.findById(req.user.id).populate('bookmarkedElections');

        res.status(200).json({
            success: true,
            count: user.bookmarkedElections.length,
            data: user.bookmarkedElections
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update election status
// @route   PATCH /api/v1/elections/:id/status
// @access  Private (Admin)
exports.updateElectionStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        
        // Validate the status
        if (!status || !['pending', 'active', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status must be one of: pending, active, completed, cancelled' 
            });
        }
        
        // Find the election
        const election = await Election.findById(req.params.id);
        
        if (!election) {
            return res.status(404).json({ 
                success: false, 
                message: `Election not found with id of ${req.params.id}` 
            });
        }
        
        // Update status and set manualStatus flag to true
        const updatedElection = await Election.findByIdAndUpdate(
            req.params.id,
            { 
                status: status,
                manualStatus: true // Mark as manually set to prevent auto-updates
            },
            {
                new: true, // Return the updated document
                runValidators: true
            }
        );
        
        res.status(200).json({
            success: true,
            data: updatedElection,
            message: `Election status successfully updated to ${status}`
        });
        
    } catch (err) {
        console.error(err);
        if (err.name === 'CastError') {
            return res.status(404).json({ 
                success: false, 
                message: `Election not found with id of ${req.params.id}` 
            });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};