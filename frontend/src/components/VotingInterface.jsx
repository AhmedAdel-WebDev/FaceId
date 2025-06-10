import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import electionService from '../services/electionService';
import { getSafeImageUrl } from '../utils/imageUtils.js'; // Import the image utility
import { useTranslation } from 'react-i18next'; // Import translation hook
import styles from './VotingInterface.module.css';

function VotingInterface({ electionId, candidates, electionType, proposition, ratingOptions, onVoteSuccess }) {
    const { t } = useTranslation(); // Initialize translation hook
    const { user, isAuthenticated } = useAuth();
    const [selectedCandidate, setSelectedCandidate] = useState(''); // For candidate-based
    const [selectedChoice, setSelectedChoice] = useState(''); // For yes-no
    const [selectedRating, setSelectedRating] = useState(null); // For rating
    const [selectedImageOptionId, setSelectedImageOptionId] = useState(''); // For image-based
    const [election, setElection] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [canVote, setCanVote] = useState(true);
    const [eligibilityMessage, setEligibilityMessage] = useState('');
    const [previousVoteInvalid, setPreviousVoteInvalid] = useState(false);
    const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

    // Function to check vote eligibility
    const checkEligibility = async () => {
        if (!electionId || !isAuthenticated) return;
        
        try {
            setIsCheckingEligibility(true);
            const eligibility = await electionService.checkVoteEligibility(electionId);
            console.log('Vote eligibility check result:', eligibility);
            
            setCanVote(eligibility.canVote);
            
            if (!eligibility.canVote && eligibility.reason) {
                setEligibilityMessage(eligibility.reason);
            } else if (eligibility.previousVoteInvalid) {
                setPreviousVoteInvalid(true);
                setEligibilityMessage(eligibility.reason || 'Your previous vote was for an option that has been removed.');
            }
        } catch (err) {
            console.error("Error checking vote eligibility:", err);
            setError("Could not verify your voting eligibility. Please try again.");
        } finally {
            setIsCheckingEligibility(false);
        }
    };

    // Fetch the election data and check vote eligibility
    useEffect(() => {
        const fetchElectionData = async () => {
            if (!electionId) return;
            
            try {
                setIsLoading(true);
                const data = await electionService.getElectionById(electionId);
                setElection(data);
                
                // Check vote eligibility if user is authenticated
                if (isAuthenticated) {
                    await checkEligibility();
                }
            } catch (err) {
                console.error("Error fetching election data:", err);
                setError("Could not load election details");
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchElectionData();
    }, [electionId, isAuthenticated]);
    
    // Handle force check of eligibility
    const handleForceEligibilityCheck = async () => {
        setError(null); // Clear any previous errors
        await checkEligibility();
    };

    const handleSelectionChange = (event) => {
        setSelectedCandidate(event.target.value);
        setError(null); // Clear error when selection changes
    };

    const handleChoiceChange = (choice) => {
        setSelectedChoice(choice);
        setError(null);
    };

    const handleRatingChange = (rating) => {
        setSelectedRating(rating);
        setError(null);
    };

    const handleImageOptionChange = (imageId) => {
        setSelectedImageOptionId(imageId);
        setError(null);
    };

    const handleSubmitVote = async (event) => {
        event.preventDefault();
        if (!isAuthenticated) {
            setError('You must be logged in to vote.');
            return;
        }

        // Get the current election type either from prop or fetched election
        const currentElectionType = electionType || election?.electionType;
        
        if (!currentElectionType) {
            setError('Election type information is missing.');
            return;
        }

        let votePayload = {};
        let hasSelection = false;

        switch (currentElectionType) {
            case 'candidate-based':
                if (!selectedCandidate) {
                    setError('Please select a candidate.');
                    return;
                }
                votePayload = { candidateId: selectedCandidate };
                hasSelection = true;
                break;
            case 'yes-no':
                if (!selectedChoice) {
                    setError('Please select Yes or No.');
                    return;
                }
                votePayload = { choice: selectedChoice };
                hasSelection = true;
                break;
            case 'rating':
                if (selectedRating === null) {
                    setError('Please select a rating.');
                    return;
                }
                votePayload = { ratingValue: selectedRating };
                hasSelection = true;
                break;
            case 'image-based':
                if (!selectedImageOptionId) {
                    setError('Please select an image option.');
                    return;
                }
                votePayload = { selectedImageId: selectedImageOptionId };
                hasSelection = true;
                break;
            default:
                setError('Unsupported election type for voting.');
                return;
        }

        if (!hasSelection) {
            // This case should ideally be caught by specific checks above
            setError('Please make a selection to vote.');
            return;
        }

        // Debug log the vote payload and election data
        console.log('Submitting vote with payload:', votePayload);
        console.log('For election type:', currentElectionType);
        console.log('Election ID:', electionId);

        setIsLoading(true);
        setError(null);

        try {
            // Use electionId for the API call
            const response = await electionService.castVote(electionId, votePayload);
            setSelectedCandidate('');
            setSelectedChoice('');
            setSelectedRating(null);
            setSelectedImageOptionId('');
            if (onVoteSuccess) {
                onVoteSuccess();
            }
        } catch (err) {
            console.error("Voting failed:", err);
            // Check if the error message indicates the user already voted
            if (err.message?.includes('already voted')) {
                 setError('You have already voted in this election.');
                 // Optionally, still call onVoteSuccess to show results if they somehow got here
                 if (onVoteSuccess) {
                    onVoteSuccess();
                 }
            } else {
                setError(err.message || 'An error occurred while casting your vote.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderVotingOptions = () => {
        // Get current election data either from props or fetched election
        const currentElectionType = electionType || election?.electionType;
        const currentCandidates = candidates || election?.candidates || [];
        const currentProposition = proposition || election?.proposition;
        const currentRatingOptions = ratingOptions || election?.ratingOptions;
        
        if (!currentElectionType) return <p>{t('elections.electionDetailsNotAvailable', 'Election details not available.')}</p>;

        switch (currentElectionType) {
            case 'candidate-based':
                return (
                    <div className={styles.candidateList}>
                        {currentCandidates && currentCandidates.length > 0 ? (
                            currentCandidates.map((candidate) => {
                                const candidateUserId = candidate?.candidateId?._id;
                                const candidateName = candidate?.candidateId?.name || candidate?.name || t('elections.unnamedCandidate', 'Unnamed Candidate');
                                const candidateImage = getSafeImageUrl(candidate?.candidateId?.profileImage || candidate?.profileImage);

                                if (!candidateUserId) {
                                    console.warn("Skipping candidate due to missing ID:", candidate);
                                    return null;
                                }
                                return (
                                    <label key={candidateUserId} className={styles.candidateLabel}>
                                        <input
                                            type="radio"
                                            name="candidate"
                                            value={candidateUserId}
                                            checked={selectedCandidate === candidateUserId}
                                            onChange={handleSelectionChange}
                                            className={styles.radioInput}
                                            disabled={isLoading}
                                        />
                                        <img src={candidateImage} alt={candidateName} className={styles.candidateImage} />
                                        <span className={styles.candidateName}>{candidateName}</span>
                                    </label>
                                );
                            })
                        ) : (
                            <p>{t('elections.noCandidatesAvailable', 'No candidates available for this election.')}</p>
                        )}
                    </div>
                );
            case 'yes-no':
                return (
                    <div className={styles.choiceOptions}>
                        <div className={styles.proposition}>
                            <p>{currentProposition || t('elections.noProposition', 'No proposition provided.')}</p>
                        </div>
                        <div className={styles.yesNoButtonContainer}>
                            <button
                                type="button"
                                onClick={() => handleChoiceChange('yes')}
                                className={`${styles.choiceButton} ${selectedChoice === 'yes' ? styles.selected : ''}`}
                                disabled={isLoading}
                            >
                                {t('common.yes', 'Yes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChoiceChange('no')}
                                className={`${styles.choiceButton} ${selectedChoice === 'no' ? styles.selected : ''}`}
                                disabled={isLoading}
                            >
                                {t('common.no', 'No')}
                            </button>
                        </div>
                    </div>
                );
            case 'rating':
                const min = currentRatingOptions?.min || 1;
                const max = currentRatingOptions?.max || 5;
                const ratings = Array.from({ length: (max - min) + 1 }, (_, i) => min + i);
                return (
                    <div className={styles.ratingOptions}>
                        <div className={styles.proposition}>
                            <p>{currentProposition || t('elections.noRatingProposition', 'No rating proposition provided.')}</p>
                        </div>
                        <p>{t('elections.rateFromTo', 'Rate from {{min}} to {{max}}:', { min: currentRatingOptions?.labelMin || t('elections.poor', 'Poor'), max: currentRatingOptions?.labelMax || t('elections.excellent', 'Excellent') })}</p>
                        <div className={styles.ratingStars}>
                            {ratings.map(rate => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => handleRatingChange(rate)}
                                    className={`${styles.starButton} ${selectedRating && selectedRating >= rate ? styles.selectedStar : ''}`}
                                    title={`${rate} ${rate === 1 ? t('elections.star', 'star') : t('elections.stars', 'stars')}`}
                                    disabled={isLoading}
                                >
                                    <span className={styles.starIcon}>★</span>
                                </button>
                            ))}
                        </div>
                        <div className={styles.ratingLabel}>
                            {selectedRating ? `${selectedRating} ${selectedRating === 1 ? t('elections.star', 'star') : t('elections.stars', 'stars')}` : t('elections.clickToRate', 'Click to rate')}
                        </div>
                    </div>
                );
            case 'image-based':
                return (
                    <div className={styles.imageOptionsGrid}>
                        {currentCandidates && currentCandidates.length > 0 ? (
                            currentCandidates.map((option, index) => {
                                // Debug the image option data structure
                                console.log(`Image option ${index} data:`, option);
                                
                                // Use imageId as primary, fall back to _id
                                const imageId = option.imageId || option._id;
                                
                                if (!imageId) {
                                    console.warn("Skipping image option due to missing ID:", option);
                                    return null;
                                }
                                
                                // Get a safe image URL
                                const imageUrl = getSafeImageUrl(option.imageUrl);
                                console.log(`Image option ${index} safe URL:`, imageUrl);
                                
                                return (
                                    <div
                                        key={imageId}
                                        className={`${styles.imageOptionCard} ${selectedImageOptionId === imageId ? styles.selectedImage : ''}`}
                                        onClick={() => !isLoading && handleImageOptionChange(imageId)}
                                    >
                                        <img 
                                            src={imageUrl} 
                                            alt={option.imageLabel || t('elections.option', 'Option') + ` ${index + 1}`} 
                                            className={styles.optionImagePreview}
                                            onError={(e) => { 
                                                console.error(`Failed to load voting image: ${imageUrl}`); 
                                                e.target.onerror = null; 
                                                e.target.src = '/placeholder-image.svg'; 
                                            }} 
                                        />
                                        <p>{option.imageLabel || t('elections.option', 'Option') + ` ${index + 1}`}</p>
                                    </div>
                                );
                            })
                        ) : (
                            <p>{t('elections.noImageOptions', 'No image options available for this election.')}</p>
                        )}
                    </div>
                );
            default:
                return <p>{t('elections.votingNotAvailable', 'Voting not available for this election type.')}</p>;
        }
    };

    // If we're loading the election details
    if (isLoading && !election && !electionType) {
        return <p className={styles.loadingText}>{t('elections.loadingVotingOptions', 'Loading voting options...')}</p>;
    }

    return (
        <div className={styles.votingContainer}>
            <h3 className={styles.title}>{t('elections.castYourVote', 'Cast Your Vote')}</h3>
            
            {previousVoteInvalid && (
                <div className={styles.notificationMessage}>
                    <p>🔄 {eligibilityMessage}</p>
                    <p>{t('elections.canVoteAgain', 'You can now vote again.')}</p>
                </div>
            )}
            
            {!canVote && !previousVoteInvalid ? (
                <div className={styles.messageContainer}>
                    <p className={styles.infoMessage}>{eligibilityMessage}</p>
                    <div className={styles.actionButtonsContainer}>
                        <button 
                            onClick={handleForceEligibilityCheck} 
                            className={styles.refreshButton}
                            disabled={isCheckingEligibility}
                        >
                            {isCheckingEligibility ? t('common.checking', 'Checking...') : t('elections.checkAgain', 'Check Again')}
                        </button>
                        {onVoteSuccess && (
                            <button 
                                onClick={onVoteSuccess} 
                                className={styles.viewResultsButton}
                            >
                                {t('elections.viewResults', 'View Results')}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmitVote}>
                    {renderVotingOptions()} 

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading || 
                            ((electionType || election?.electionType) === 'candidate-based' && !selectedCandidate) ||
                            ((electionType || election?.electionType) === 'yes-no' && !selectedChoice) ||
                            ((electionType || election?.electionType) === 'rating' && selectedRating === null) ||
                            ((electionType || election?.electionType) === 'image-based' && !selectedImageOptionId)}
                    >
                        {isLoading ? t('common.submitting', 'Submitting...') : t('elections.submitVote', 'Submit Vote')}
                    </button>
                </form>
            )}
        </div>
    );
}

export default VotingInterface;