import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import electionService from '../services/electionService';
import styles from './ElectionForm.module.css';
import { useTranslation } from 'react-i18next';

// Accept props for editing: electionData (existing data) and isEditMode
function ElectionForm({ electionData = null, isEditMode = false }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('pending'); // Default for create
    const [electionType, setElectionType] = useState('candidate-based'); // New state for election type
    const [proposition, setProposition] = useState(''); // For 'yes-no' elections
    // Fixed 1-5 star rating system for 'rating' elections
    const [ratingOptions, setRatingOptions] = useState({ 
        min: 1, 
        max: 5,
        labelMin: t('elections.poor'),
        labelMax: t('elections.excellent'),
        proposition: ''  // Add proposition to rating options
    });
    // For 'image-based' elections: store file objects and their existing URLs (for edit mode)
    const [imageOptions, setImageOptions] = useState([{ file: null, previewUrl: '', imageLabel: '', existingImageUrl: '' }]);
    const [replaceAllImages, setReplaceAllImages] = useState(false);
    const [removedImageIds, setRemovedImageIds] = useState([]); // Track removed image IDs
    
    // Local fallback image - embedded SVG as base64 for image loading errors
    const fallbackImageSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFmMmEzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiPkltYWdlIExvYWQgRXJyb3I8L3RleHQ+PC9zdmc+';

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Pre-fill form if in edit mode and data is provided
    useEffect(() => {
        if (isEditMode && electionData) {
            setTitle(electionData.title || '');
            setDescription(electionData.description || '');
            // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
            setStartDate(electionData.startDate ? new Date(electionData.startDate).toISOString().slice(0, 16) : '');
            setEndDate(electionData.endDate ? new Date(electionData.endDate).toISOString().slice(0, 16) : '');
            setStatus(electionData.status || 'pending');
            setElectionType(electionData.electionType || 'candidate-based');
            if (electionData.electionType === 'yes-no') {
                setProposition(electionData.proposition || '');
            }
            if (electionData.electionType === 'rating') {
                // Set rating options
                setRatingOptions({
                    min: electionData.ratingOptions?.min || 1,
                    max: electionData.ratingOptions?.max || 5,
                    labelMin: electionData.ratingOptions?.labelMin || t('elections.poor'),
                    labelMax: electionData.ratingOptions?.labelMax || t('elections.excellent'),
                    proposition: electionData.ratingOptions?.proposition || ''
                });
            }
            if (electionData.electionType === 'image-based') {
                // Improved handling for image-based elections
                if (electionData.candidates && electionData.candidates.length > 0) {
                    // Get the backend URL from environment or window location
                    // In development, the frontend may run on 5173 while backend runs on 5000
                    const apiUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
                    
                    // Map candidates to image options with proper URLs for previews
                    setImageOptions(
                        electionData.candidates.map(c => {
                            // Normalize the image URL
                            let imageUrl = c.imageUrl || '';
                            
                            // Handle relative paths by prefixing with API URL
                            if (imageUrl && !imageUrl.startsWith('http')) {
                                // Make sure we use the backend URL for images
                                imageUrl = imageUrl.startsWith('/') 
                                    ? `${apiUrl}${imageUrl}`
                                    : `${apiUrl}/${imageUrl}`;
                            }
                            
                            return {
                                file: null, // No file initially for existing images
                                previewUrl: imageUrl, // Complete URL for preview
                                imageLabel: c.imageLabel || '',
                                existingImageUrl: c.imageUrl || '', // Original URL for backend
                                _id: c._id || null, // Store the document ID
                                imageId: c.imageId || null // Store any alternative image ID
                            };
                        })
                    );
                } else {
                    // Default empty state if no candidates
                    setImageOptions([{ file: null, previewUrl: '', imageLabel: '', existingImageUrl: '' }]);
                }
            }
        }
    }, [isEditMode, electionData, t]);

    // Update status when election type changes
    useEffect(() => {
        // For non-candidate-based elections, set status to 'active' if it's currently 'pending'
        if (['yes-no', 'image-based', 'rating'].includes(electionType) && status === 'pending') {
            setStatus('active');
        }
    }, [electionType, status]);

    const handleImageOptionChange = (index, field, value) => {
        const newImageOptions = [...imageOptions];
        if (field === 'file') {
            // If we're changing the file
            if (value) {
                // Clean up previous preview URL if it was created by us
                if (newImageOptions[index].previewUrl && newImageOptions[index].previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(newImageOptions[index].previewUrl);
                }
                
                // Create a new object URL for preview
                newImageOptions[index].file = value;
                newImageOptions[index].previewUrl = URL.createObjectURL(value);
                // Mark that we no longer want to use the existing URL
                newImageOptions[index].existingImageUrl = '';
            }
        } else {
            // For other fields like imageLabel
            newImageOptions[index][field] = value;
        }
        setImageOptions(newImageOptions);
    };

    const addImageOption = () => {
        setImageOptions([...imageOptions, { file: null, previewUrl: '', imageLabel: '', existingImageUrl: '' }]);
    };

    const removeImageOption = (index) => {
        console.log('Removing image option at index:', index);
        const newImageOptions = [...imageOptions];
        
        // If this is an existing image (has an ID), add it to the removedImageIds list
        if (newImageOptions[index]._id || newImageOptions[index].imageId) {
            const imageId = newImageOptions[index]._id || newImageOptions[index].imageId;
            console.log('Adding image ID to removed list:', imageId);
            setRemovedImageIds([...removedImageIds, imageId]);
        }
        
        // Clean up object URL to prevent memory leaks
        if (newImageOptions[index].previewUrl && newImageOptions[index].previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(newImageOptions[index].previewUrl);
        }
        
        // Remove the option
        newImageOptions.splice(index, 1);
        
        // Ensure there's always at least one option
        if (newImageOptions.length === 0) {
            newImageOptions.push({ file: null, previewUrl: '', imageLabel: '', existingImageUrl: '' });
        }
        
        setImageOptions(newImageOptions);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Validation
        if (!title || !startDate || !endDate || !status) {
            setError(t('elections.fillRequiredFields'));
            return;
        }
        if (new Date(startDate) >= new Date(endDate)) {
            setError(t('elections.endDateMustBeAfterStartDate'));
            return;
        }

        setIsLoading(true);

        const updatedElectionData = {
            title,
            description,
            startDate,
            endDate,
            status,
            // Note: We are not sending candidates/applications from this form anymore
            // Send electionType and related fields
            electionType,
        };

        if (electionType === 'yes-no') {
            if (!proposition) {
                setError(t('elections.propositionRequired'));
                setIsLoading(false);
                return;
            }
            updatedElectionData.proposition = proposition;
        } else if (electionType === 'rating') {
            // Use fixed rating options (1-5 stars)
            if (!ratingOptions.proposition) {
                setError(t('elections.ratingPropositionRequired'));
                setIsLoading(false);
                return;
            }
            updatedElectionData.ratingOptions = ratingOptions;
        } else if (electionType === 'image-based') {
            // For image-based elections, only upload new images during creation, not during edit
            if (!isEditMode) {
                // Create FormData object here to fix the missing variable error
                const formData = new FormData();
                
                // Add basic election data to formData
                formData.append('title', title);
                formData.append('description', description);
                formData.append('startDate', startDate);
                formData.append('endDate', endDate);
                formData.append('status', status);
                formData.append('electionType', electionType);
                
                // Check if we have at least one valid image option
                const hasValidImage = imageOptions.some(opt => opt.file !== null);
                if (!hasValidImage) {
                    setError(t('elections.uploadAtLeastOneImage'));
                    setIsLoading(false);
                    return;
                }
                
                // Attach all image files
                const imageLabels = [];
                imageOptions.forEach((opt, index) => {
                    if (opt.file) {
                        formData.append('files', opt.file);
                        imageLabels.push(opt.imageLabel || `${t('elections.option')} ${index + 1}`);
                    }
                });
                formData.append('imageLabels', JSON.stringify(imageLabels));
                
                try {
                    if (isEditMode) {
                        await electionService.updateElection(electionData._id, formData);
                        setSuccessMessage(t('elections.electionUpdatedSuccess'));
                    } else {
                        await electionService.createElection(formData);
                        setSuccessMessage(t('elections.electionCreatedSuccess'));
                    }
                    // Redirect after a delay to show the success message
                    setTimeout(() => navigate('/admin/elections'), 1500);
                } catch (err) {
                    setError(err.message || t('elections.errorOccurred'));
                } finally {
                    setIsLoading(false);
                }
                
                return; // Return early since we've already handled the request
            } else {
                // For edit mode with image-based election, maintain existing images
                updatedElectionData.candidates = imageOptions.map(opt => ({
                    _id: opt._id,
                    imageId: opt.imageId,
                    imageUrl: opt.existingImageUrl,
                    imageLabel: opt.imageLabel
                }));
            }
        }

        try {
            let response;
            if (isEditMode && electionData?._id) {
                // Call update service function
                response = await electionService.updateElection(electionData._id, updatedElectionData);
                setSuccessMessage(t('elections.electionUpdatedSuccess'));
                // Optionally navigate back to details page after a delay
                setTimeout(() => navigate(`/elections/${electionData._id}`), 1500);
            } else {
                // Call create service function
                response = await electionService.createElection(updatedElectionData);
                setSuccessMessage(t('elections.electionCreatedSuccess'));
                 // Optionally navigate to the new election's details page or list
                 setTimeout(() => navigate(`/elections/${response.data._id}`), 1500); // Navigate to new election
            }
            console.log('Operation successful:', response);

        } catch (err) {
            console.error('Operation failed:', err);
            setError(err.message || t('elections.operationFailed', { operation: isEditMode ? t('common.update') : t('common.create') }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.formContainer}>
            <h2>{isEditMode ? t('admin.editElection') : t('dashboard.createNewElection')}</h2>
            {error && <p className={styles.errorMessage}>{error}</p>}
            {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

            <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className={styles.formGroup}>
                    <label htmlFor="title">{t('elections.electionTitle')} <span className={styles.required}>*</span></label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>

                {/* Description */}
                <div className={styles.formGroup}>
                    <label htmlFor="description">{t('elections.description')}</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="4"
                        disabled={isLoading}
                    />
                </div>

                {/* Election Type Dropdown */}
                <div className={styles.formGroup}>
                    <label htmlFor="electionType">{t('elections.electionType')} <span className={styles.required}>*</span></label>
                    <select
                        id="electionType"
                        value={electionType}
                        onChange={(e) => setElectionType(e.target.value)}
                        required
                        disabled={isLoading || isEditMode} // Disable in edit mode
                        className={styles.selectInput}
                    >
                        <option value="candidate-based">{t('elections.candidateBased')}</option>
                        <option value="yes-no">{t('elections.yesNoQuestion')}</option>
                        <option value="rating">{t('elections.ratingFeedback')}</option>
                        <option value="image-based">{t('elections.imageBased')}</option>
                    </select>
                    {/* Add helper text explaining types */}
                    <small className={styles.helperText}>
                        {electionType === 'candidate-based' ? 
                            t('elections.candidateBasedHelp') : 
                         electionType === 'yes-no' ? 
                            t('elections.yesNoHelp') : 
                         electionType === 'rating' ? 
                            t('elections.ratingHelp') : 
                            t('elections.imageBasedHelp')}
                    </small>
                </div>

                {/* Conditional Fields based on Election Type */}
                {electionType === 'yes-no' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="proposition">{t('elections.proposition')} <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            id="proposition"
                            value={proposition}
                            onChange={(e) => setProposition(e.target.value)}
                            required
                            disabled={isLoading}
                            placeholder={t('elections.propositionPlaceholder')}
                        />
                    </div>
                )}

                {electionType === 'rating' && (
                    <div className={styles.formGroup}>
                        <div className={styles.formGroup}>
                            <label htmlFor="ratingProposition">{t('elections.ratingProposition')} <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                id="ratingProposition"
                                value={ratingOptions.proposition}
                                onChange={(e) => setRatingOptions({ ...ratingOptions, proposition: e.target.value })}
                                required
                                disabled={isLoading}
                                placeholder={t('elections.ratingPropositionPlaceholder')}
                            />
                        </div>
                        
                        <div className={styles.ratingInfoBox}>
                            <div className={styles.ratingStarsPreview}>★★★★★</div>
                            <p>{t('elections.ratingSystemInfo')}</p>
                            <p>{t('elections.ratingScaleInfo', { min: ratingOptions.labelMin || t('elections.poor'), max: ratingOptions.labelMax || t('elections.excellent') })}</p>
                        </div>
                        
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="labelMin">{t('elections.labelForLowestRating')}</label>
                                <input
                                    type="text"
                                    id="labelMin"
                                    value={ratingOptions.labelMin}
                                    onChange={(e) => setRatingOptions({ ...ratingOptions, labelMin: e.target.value })}
                                    placeholder={t('elections.poorPlaceholder')}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="labelMax">{t('elections.labelForHighestRating')}</label>
                                <input
                                    type="text"
                                    id="labelMax"
                                    value={ratingOptions.labelMax}
                                    onChange={(e) => setRatingOptions({ ...ratingOptions, labelMax: e.target.value })}
                                    placeholder={t('elections.excellentPlaceholder')}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {electionType === 'image-based' && (
                    <div className={styles.formGroup}>
                        <label>{t('elections.imageOptions')} <span className={styles.required}>*</span></label>
                        
                        {isEditMode ? (
                            <div className={styles.notificationBox}>
                                <p className={styles.notificationText}>
                                    <span className={styles.notificationIcon}>ℹ️</span>
                                    {t('elections.imageEditingDisabled')}
                                </p>
                            </div>
                        ) : null}
                        
                        <div className={styles.imageOptionsGrid}>
                            {imageOptions.map((option, index) => (
                                <div key={index} className={styles.imageOptionContainer}>
                                    <div className={styles.imageOptionRow}>
                                        {/* Hidden file input with styled label */}
                                        <input
                                            type="file"
                                            id={`file-upload-${index}`}
                                            accept="image/jpeg, image/png, image/gif, image/webp"
                                            onChange={(e) => handleImageOptionChange(index, 'file', e.target.files[0])}
                                            disabled={isLoading || isEditMode}
                                            className={styles.fileInput}
                                            style={{ display: 'none' }}
                                        />
                                        
                                        <div className={styles.imagePreviewContainer}>
                                            <div className={styles.imagePreview}>
                                                {option.previewUrl ? (
                                                    <img 
                                                        src={option.previewUrl}
                                                        alt={`${t('elections.preview')} ${index + 1}`}
                                                        className={styles.previewImage}
                                                        onError={(e) => { e.target.src = fallbackImageSrc }}
                                                    />
                                                ) : (
                                                    <div className={styles.placeholderImage}>
                                                        <span>{t('elections.noImage')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {!isEditMode && (
                                                <label 
                                                    htmlFor={`file-upload-${index}`}
                                                    className={styles.uploadButton}
                                                >
                                                    {option.previewUrl ? t('elections.changeImage') : t('elections.uploadImage')}
                                                </label>
                                            )}
                                        </div>
                                        
                                        <div className={styles.imageDetailsContainer}>
                                            <input
                                                type="text"
                                                placeholder={`${t('elections.option')} ${index + 1} ${t('elections.label')}`}
                                                value={option.imageLabel}
                                                onChange={(e) => handleImageOptionChange(index, 'imageLabel', e.target.value)}
                                                disabled={isLoading}
                                                className={styles.labelInput}
                                            />
                                            
                                            {!isEditMode && imageOptions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeImageOption(index);
                                                    }}
                                                    className={styles.imageRemoveButton}
                                                >
                                                    {t('elections.removeOption')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {!isEditMode && (
                            <button
                                type="button"
                                onClick={addImageOption}
                                className={styles.addOptionButton}
                                disabled={isLoading}
                            >
                                + {t('elections.addAnotherImageOption')}
                            </button>
                        )}
                    </div>
                )}

                 {/* Date Row */}
                 <div className={styles.formRow}>
                    {/* Start Date */}
                    <div className={styles.formGroup}>
                        <label htmlFor="startDate">{t('elections.startDateTime')} <span className={styles.required}>*</span></label>
                        <input
                            type="datetime-local"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {/* End Date */}
                    <div className={styles.formGroup}>
                        <label htmlFor="endDate">{t('elections.endDateTime')} <span className={styles.required}>*</span></label>
                        <input
                            type="datetime-local"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>


                {/* Status Dropdown */}
                <div className={styles.formGroup}>
                    <label htmlFor="status">{t('elections.status')} <span className={styles.required}>*</span></label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        required
                        disabled={isLoading}
                        className={styles.selectInput}
                    >
                        {electionType === 'candidate-based' && (
                            <option value="pending">{t('elections.statusPending')}</option>
                        )}
                        <option value="active">{t('elections.statusActive')}</option>
                        <option value="completed">{t('elections.statusCompleted')}</option>
                        <option value="cancelled">{t('elections.statusCancelled')}</option>
                    </select>
                     {/* Optional: Add helper text explaining status effects */}
                     <small className={styles.helperText}>
                        {electionType === 'candidate-based' 
                            ? t('elections.candidateStatusHelp')
                            : t('elections.nonCandidateStatusHelp')}
                     </small>
                </div>


                {/* Submit Button */}
                <div className={styles.buttonContainer}>
                    <button type="submit" className={styles.submitButton} disabled={isLoading}>
                        {isLoading ? t('common.saving') : (isEditMode ? t('elections.updateElection') : t('elections.createElection'))}
                    </button>
                     {/* Optional: Add a cancel button */}
                     <button
                        type="button"
                        className={`${styles.submitButton} ${styles.cancelButton}`} // Add cancelButton style
                        onClick={() => navigate(isEditMode ? `/elections/${electionData?._id}` : '/elections')} // Navigate back
                        disabled={isLoading}
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ElectionForm;