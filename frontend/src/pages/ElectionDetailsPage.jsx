import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Ensure useNavigate is imported
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import electionService from '../services/electionService';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import VotingInterface from '../components/VotingInterface.jsx';
import ElectionResults from '../components/ElectionResults.jsx'; // Import ElectionResults
import AdminApplicationReview from '../components/adminapplicationreview.jsx'; // Import if needed
import { formatDate, getStatus } from '../utils/dateUtils.js';
import { getSafeImageUrl } from '../utils/imageUtils.js'; // Import the image utility
import ApplicationForm from '../components/ApplicationForm.jsx'; // Import ApplicationForm
import styles from './DetailsPage.module.css'; // Use shared styles
import CandidateApplicationDetails from '../components/CandidateApplicationDetails.jsx'; // Import the new modal component


function ElectionDetailsPage() {
    const { t } = useTranslation(); // Initialize translation function
    const { id } = useParams();
    const { user, isAuthenticated } = useAuth(); // Get user info
    const navigate = useNavigate(); // For navigation
    const [election, setElection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [removeCandidateLoading, setRemoveCandidateLoading] = useState({}); // Track loading per candidate
    const [status, setStatus] = useState(''); // This state holds the calculated status
    const [hasVoted, setHasVoted] = useState(false); // Track if user voted (checked on load and after vote)
    const [hasApplied, setHasApplied] = useState(false); // Track if candidate user has applied
    const [isBookmarked, setIsBookmarked] = useState(false); // Track if election is bookmarked
    const [bookmarkLoading, setBookmarkLoading] = useState(false); // Track bookmark action loading
    const [showApplicationDetailsModal, setShowApplicationDetailsModal] = useState(false); // State for modal visibility
    const [selectedApplication, setSelectedApplication] = useState(null); // State for selected application data
    const [showCandidateDetailsModal, setShowCandidateDetailsModal] = useState(false); // State for candidate details modal visibility
    const [selectedCandidate, setSelectedCandidate] = useState(null); // State for selected candidate data

    // Helper to display election type specific details
    const renderElectionTypeSpecificDetails = () => {
        if (!election) return null;

        if (election.electionType === 'image-based' && election.candidates && election.candidates.length > 0) {
            // Debug log the image URLs
            console.log('Image-based election candidates:', election.candidates);
            election.candidates.forEach((candidate, index) => {
                console.log(`Image option ${index}:`, {
                    imageUrl: candidate.imageUrl,
                    _id: candidate._id,
                    imageId: candidate.imageId
                });
            });
        }

        switch (election.electionType) {
            case 'yes-no':
                return (
                    <div className={styles.electionTypeDetail}>
                        <h4>{t('elections.proposition', 'Proposition')}</h4>
                        <div className={styles.propositionBox}>
                            {election.proposition || t('elections.noProposition', 'No proposition specified.')}
                        </div>
                        <p className={styles.guidanceNote}>
                            {t('elections.yesNoGuidance', 'Please vote Yes or No on this proposition. Your choice will help determine the outcome.')}
                        </p>
                    </div>
                );
            case 'rating':
                const min = election.ratingOptions?.min || 1;
                const max = election.ratingOptions?.max || 5;
                const ratings = Array.from({ length: (max - min) + 1 }, (_, i) => min + i);
                
                return (
                    <div className={styles.electionTypeDetail}>
                        <h4>{t('elections.ratingElection', 'Rating Election')}</h4>
                        <div className={styles.propositionBox}>
                            {election.description || t('elections.defaultRatingDescription', 'Please rate this item based on your opinion.')}
                        </div>
                        <div className={styles.starRatingDisplay}>
                            {ratings.map(rate => (
                                <span key={rate} className={styles.starIcon} title={t('elections.ratingTitle', 'Rating: {{value}}', { value: rate })}>★</span>
                            ))}
                        </div>
                        <div className={styles.ratingScaleLabel}>
                            <span>{election.ratingOptions?.labelMin || t('elections.poor', 'Poor')}</span>
                            <span>{election.ratingOptions?.labelMax || t('elections.excellent', 'Excellent')}</span>
                        </div>
                        <p className={styles.guidanceNote}>
                            {t('elections.ratingGuidance', 'Rate using the star system above. Your rating will contribute to the overall score.')}
                        </p>
                    </div>
                );
            case 'image-based':
                return (
                    <div className={styles.electionTypeDetail}>
                        <h4>{t('elections.imageContest', 'Image Contest')}</h4>
                        <div className={styles.propositionBox}>
                            {election.description || t('elections.defaultImageDescription', 'Choose your favorite image from the options below.')}
                        </div>
                        <p className={styles.guidanceNote}>
                            {t('elections.imageGuidance', 'Select the image you think is best. Each image can be viewed in detail before voting.')}
                        </p>
                    </div>
                );
            case 'candidate-based':
                // Add guidance for candidate-based elections
                return (
                    <div className={styles.electionTypeDetail}>
                        <h4>{t('elections.candidateElection', 'Candidate Election')}</h4>
                        <div className={styles.propositionBox}>
                            {election.description || t('elections.defaultCandidateDescription', 'Vote for your preferred candidate in this election.')}
                        </div>
                        <p className={styles.guidanceNote}>
                            {t('elections.candidateGuidance', 'Review each candidate\'s profile and select the one you believe is most qualified.')}
                        </p>
                    </div>
                );
            default:
                return <p>{t('elections.noSpecificDetails', 'This election type has no specific details to display.')}</p>;
        }
    };


    // Wrap fetchElection in useCallback
    const fetchElection = useCallback(async (showLoading = true) => {
        if (!id) {
            setError("No election ID provided.");
            if (showLoading) setLoading(false);
            return;
        }
        try {
            if (showLoading) setLoading(true);
            setActionError(null);
            // Don't reset hasVoted here, check it instead
            // setHasVoted(false);
            setHasApplied(false); // Reset apply status on fetch

            // Fetch election data, vote status, and bookmark status concurrently
            const promises = [
                electionService.getElectionById(id),
                isAuthenticated ? electionService.checkVoteStatus(id) : Promise.resolve({ hasVoted: false })
            ];
            
            // If authenticated, also check if election is bookmarked
            let bookmarkedElections = [];
            if (isAuthenticated) {
                try {
                    bookmarkedElections = await electionService.getBookmarkedElections();
                } catch (err) {
                    console.error('Error checking bookmark status:', err);
                }
            }
            
            const [electionData, voteStatusData] = await Promise.all(promises);
            
            // Set bookmark state
            const isElectionBookmarked = isAuthenticated && 
                bookmarkedElections.some(bookmark => bookmark._id === id);
            setIsBookmarked(isElectionBookmarked);

            // --- DEBUGGING LOG ---
            console.log('[ElectionDetailsPage] Raw Fetched Election Data:', JSON.stringify(electionData, null, 2));
            if (electionData?.applications) {
                 console.log('[ElectionDetailsPage] Fetched Applications:', JSON.stringify(electionData.applications, null, 2));
                 // Check here if description and cvPath are present in the logged applications
            }
            // --- END DEBUGGING LOG ---


            setElection(electionData);
            setHasVoted(voteStatusData?.hasVoted || false);

            if (electionData) {
                const currentStatus = getStatus(electionData.startDate, electionData.endDate, electionData.status);
                setStatus(currentStatus);

                // Check if user has applied
                // Ensure user and _id exist before checking
                const alreadyApplied = !!user?._id && electionData.applications?.some(app => app.candidateId?._id === user._id);
                setHasApplied(alreadyApplied);

                // --- REMOVE TEMPORARY DEBUG LOG ---
                // if (user?.role === 'candidate') {
                //     console.log('[Apply Button Debug] User Role:', user?.role);
                //     console.log('[Apply Button Debug] Election Status:', currentStatus);
                //     console.log('[Apply Button Debug] Has Applied:', alreadyApplied);
                //     console.log('[Apply Button Debug] Is Approved Candidate:', electionData.candidates?.some(c => c.candidateId?._id === user?._id));
                //     console.log('[Apply Button Debug] Election Data:', electionData);
                // }
                 // --- END TEMPORARY DEBUG LOG ---

            } else {
                 setError(`Election with ID ${id} not found.`);
                 setStatus('');
            }
           if (showLoading) setError(null);
        } catch (err) {
            console.error(`Error fetching election details or vote status for ${id}:`, err);
             // Handle specific errors (e.g., 404 for election, ignore 404 for vote status if election exists)
            if (err.response?.status === 404 && err.config?.url?.includes(`/elections/${id}`)) {
                 setError(`Election not found with id ${id}`);
                 setElection(null);
                 setStatus('');
                 setHasVoted(false);
            } else if (!err.config?.url?.includes('/votes/status')) { // Only set general error if it's not from vote status check
                const message = err.response?.data?.message || err.message || 'Failed to load election details.';
                setError(message);
                setElection(null); // Clear election data on general error
                setStatus('');
                setHasVoted(false);
            }
            // If vote status check fails but election loads, we assume they haven't voted yet
            if (!election) { // Clear election if it failed regardless of vote status error
                 setElection(null);
                 setStatus('');
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    // Include isAuthenticated in dependencies as checkVoteStatus depends on it
    }, [id, user, isAuthenticated]); // Keep user dependency for role/id checks

    useEffect(() => {
        fetchElection(); // Initial fetch
    }, [fetchElection]);

    useEffect(() => {
        // Validate and clean up image URLs when election data is loaded
        if (election && election.electionType === 'image-based' && election.candidates) {
            console.log('Validating image URLs...');
            
            // Check if any candidates have invalid or problematic image URLs
            election.candidates.forEach((candidate, index) => {
                if (!candidate.imageUrl || 
                    typeof candidate.imageUrl !== 'string' || 
                    candidate.imageUrl.includes('via.placeholder.com') ||
                    candidate.imageUrl === 'undefined' ||
                    candidate.imageUrl === 'null') {
                    console.warn(`Found invalid image URL in candidate ${index}:`, candidate.imageUrl);
                }
            });
        }
    }, [election]);

    // --- MOVE useMemo HOOK HERE ---
    // Filter pending applications using useMemo
    // This must be called unconditionally before any early returns
    const pendingApplications = useMemo(() => {
        // Ensure election, applications, and candidates exist before filtering
        // Return empty array if election data isn't available yet
        if (!election?.applications || !election?.candidates) {
            return [];
        }
        return election.applications.filter(app =>
            // Check if candidateId exists and is not already in the approved candidates list
            app.candidateId?._id && !election.candidates.some(c => c.candidateId?._id === app.candidateId._id)
        ) || [];
        // Dependency array: recalculate only when election data changes
    }, [election]); // Dependency remains the same

    // --- Handlers (handleApply, handleApprove, handleReject, handleVoteSuccess, handleRemoveCandidate) ---
    const handleRemoveCandidate = async (candidateIdToRemove) => {
        if (!election?._id || !candidateIdToRemove) {
            setActionError('Missing election or candidate ID for removal.');
            return;
        }
        if (!window.confirm('Are you sure you want to remove this candidate from the election?')) {
            return;
        }

        setRemoveCandidateLoading(prev => ({ ...prev, [candidateIdToRemove]: true }));
        setActionError(null);
        try {
            await electionService.removeCandidate(election._id, candidateIdToRemove);
            await fetchElection(false);  // Refresh election data
        } catch (err) {
            console.error('Candidate removal failed:', err);
            setActionError(err.message || 'Failed to remove candidate.');
        } finally {
            setRemoveCandidateLoading(prev => ({ ...prev, [candidateIdToRemove]: false }));
        }
    };


    // --- EDIT: Enhanced Handler to View APPROVED Candidate Details with extended info ---
    const handleViewApprovedCandidateDetails = (candidateId) => {
        // Find the candidate in the election's candidates array
        const candidateDetails = election.candidates.find(c => c.candidateId?._id === candidateId);
        
        // --- DEBUGGING LOG ---
        console.log('[ElectionDetailsPage] Viewing Approved Candidate Details:', JSON.stringify(candidateDetails, null, 2));
        // --- END DEBUGGING LOG ---
        
        if (candidateDetails) {
            // Set the selected candidate details state
            setSelectedCandidate({
                ...candidateDetails,
                // Initialize these values from the extended data if available
                idNumber: candidateDetails.idNumber || '',
                planPoints: candidateDetails.planPoints || [],
                socialMedia: candidateDetails.socialMedia || {
                    facebook: null,
                    twitter: null,
                    instagram: null,
                    linkedin: null
                }
            });
            
            // Open the modal
            setShowCandidateDetailsModal(true);
            setActionError(null);
            console.log('[DEBUG] Modal state should be set with constructed details.');
        } else {
            console.error(`[DEBUG] Details not found in candidates array for approved candidate ID: ${candidateId}`);
            setActionError("Details could not be found for this approved candidate.");
        }
    };
    

    // --- REMOVE THIS FUNCTION ---
    // const handleApply = async () => { ... }; // This logic is now handled by ApplicationForm.jsx

    const handleApprove = async (candidateId) => {
        if (!election?._id || !candidateId) {
            setActionError('Missing election or candidate ID for approval.');
            return;
        }
        setActionLoading(true);
        setActionError(null);
        try {
            const response = await electionService.approveApplication(election._id, candidateId);
            console.log('Approval successful:', response);
            // Re-fetch election data to update application list and candidate list
            await fetchElection(false); // <-- Add this line
        } catch (err) {
            console.error('Approval failed:', err);
            setActionError(err.message || 'Failed to approve application.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (candidateId) => {
         if (!election?._id || !candidateId) {
            setActionError('Missing election or candidate ID for rejection.');
            return;
        }
        setActionLoading(true);
        setActionError(null);
        try {
            const response = await electionService.rejectApplication(election._id, candidateId);
            console.log('Rejection successful:', response);
             // Re-fetch election data to update application list
            await fetchElection(false); // <-- Add this line
        } catch (err) {
            console.error('Rejection failed:', err);
            setActionError(err.message || 'Failed to reject application.');
        } finally {
            setActionLoading(false);
        }
    };

    // Handler for when VotingInterface confirms a vote was cast
    const handleVoteSuccess = () => {
        setHasVoted(true); // Update state to show results
        // Optionally, could re-fetch results immediately, but ElectionResults polls anyway
        // fetchElection(false); // Or just fetch results if needed
    };

    // Handle bookmark toggling
    const handleBookmarkToggle = async () => {
        if (!isAuthenticated) {
            alert('Please log in to bookmark elections');
            return;
        }

        try {
            setBookmarkLoading(true);
            setActionError(null);
            
            if (isBookmarked) {
                await electionService.removeBookmark(id);
            } else {
                await electionService.bookmarkElection(id);
            }
            
            // Toggle local state
            setIsBookmarked(!isBookmarked);
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
            setActionError(error.message || 'Failed to update bookmark');
        } finally {
            setBookmarkLoading(false);
        }
    };

    // --- EDIT: Rename Handler to View PENDING Application Details ---
    const handleViewPendingDetails = (application) => { // Renamed from handleViewApplicationDetails
        // --- DEBUGGING LOG ---
        console.log('[ElectionDetailsPage] Viewing Pending Application Details:', JSON.stringify(application, null, 2));
        // Check here if description and cvPath are present before setting state
        // --- END DEBUGGING LOG ---
        if (application) { // Add a check for application existence
            setSelectedApplication(application);
            setShowApplicationDetailsModal(true);
        } else {
             console.error("Attempted to view details for undefined pending application.");
        }
    };
    // --- END EDIT ---


    // --- Render Logic ---
    // Early returns can now safely happen after all hooks are called
    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <Navbar />
                <main className={styles.mainContent}>
                    <p className={styles.loadingText}>Loading election details...</p>
                </main>
                <Footer />
            </div>
        );
    }

    // Handle case where election fetch failed but wasn't a 404 initially
    if (error && !election) {
         return (
            <div className={styles.pageContainer}>
                <Navbar />
                <main className={styles.mainContent}>
                     <div className={styles.detailsContainer}>
                        <p className={styles.errorText}>{error}</p>
                        <Link to="/elections" className={styles.backLink}>&larr; Back to Elections</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Handle election not found specifically (data is null after fetch)
    if (!election) {
         return (
            <div className={styles.pageContainer}>
                <Navbar />
                <main className={styles.mainContent}>
                     <div className={styles.detailsContainer}>
                        <p className={styles.errorText}>Election not found.</p>
                        <Link to="/elections" className={styles.backLink}>&larr; Back to Elections</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }


    // Calculate status class based on the 'status' state variable
    const statusClass = styles[status.toLowerCase()] || styles.defaultStatus;

    // Determine if the current user is the creator (admin)
    const isAdminCreator = isAuthenticated && user?.role === 'admin' && user?._id === election.createdBy?._id;
    // Determine if the current user is *any* admin (for viewing applications and removing candidates)
    const isAdmin = isAuthenticated && user?.role === 'admin';
    // Determine if the current user is a candidate
    const isCandidate = isAuthenticated && user?.role === 'candidate';

    // --- REMOVE useMemo FROM HERE ---
    // const pendingApplications = useMemo(() => { ... }); // Moved above

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <main className={styles.mainContent}>
                <Link to="/elections" className={styles.backLink}>&larr; Back to Elections</Link>

                <div className={styles.detailsContainer}>
                    {/* Header Section */}
                    <div className={styles.headerSection}>
                        <h1 className={styles.title}>{election.title}</h1>
                        <div className={styles.headerActions}>
                            <span className={`${styles.statusBadge} ${statusClass}`}>{t(`elections.${status.toLowerCase()}`, status)}</span>
                            {isAuthenticated && (
                                <button 
                                    className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
                                    onClick={handleBookmarkToggle}
                                    disabled={bookmarkLoading}
                                    title={isBookmarked ? t('elections.unbookmark') : t('elections.bookmark')}
                                >
                                    {bookmarkLoading ? "..." : (isBookmarked ? "★" : "☆")}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className={styles.metaInfo}>
                        <span>{t('common.user', 'Created by')}: {election.createdBy?.name || 'Unknown'}</span>
                        <span>{t('myApplications.createdOn', 'Created on')}: {formatDate(election.createdAt)}</span>
                        {isAdmin && (
                            <Link to={`/elections/${election._id}/edit`} className={styles.editButton}>
                                {t('admin.editElection')}
                            </Link>
                        )}
                    </div>

                    <p className={styles.description}>{election.description}</p>

                    {/* Add this section to render election type specific details */}
                    <div className={styles.electionTypeSection}>
                        <h3 className={styles.subSectionTitle}>{t('elections.electionType')}: {t(`elections.${election.electionType}`, election.electionType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}</h3>
                        {renderElectionTypeSpecificDetails()}
                    </div>

                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <strong>{t('elections.startDate')}:</strong> {formatDate(election.startDate)}
                        </div>
                        <div className={styles.infoItem}>
                            <strong>{t('elections.endDate')}:</strong> {formatDate(election.endDate)}
                        </div>
                        <div className={styles.infoItem}>
                            <strong>{t('elections.status')}:</strong> <span style={{ textTransform: 'capitalize' }}>{t(`elections.${status.toLowerCase()}`, status)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>{election.electionType === 'image-based' ? t('elections.imageOptions') : t('elections.candidates')}:</strong> {election.candidates?.length || 0} {election.electionType === 'image-based' ? t('common.total', 'total') : t('admin.approve', 'approved')}
                        </div>
                    </div>

                    {actionError && <p className={styles.errorText}>{actionError}</p>}

                    {isCandidate && status === 'pending' && !hasApplied && !election.candidates?.some(c => c.candidateId?._id === user._id) && (
                        <div className={styles.actionArea}>
                            <div className={styles.applyCallout}>
                                <h3 className={styles.applyCalloutTitle}>{t('elections.applyCalloutTitle', 'Want to be a candidate?')}</h3>
                                <p className={styles.applyCalloutText}>
                                    {t('elections.applyCalloutText', 'This election is currently accepting candidate applications. Submit your application to participate.')}
                                </p>
                                <button
                                    onClick={() => navigate(`/elections/${id}/apply`)}
                                    className={`${styles.actionButton} ${styles.applyButton}`}
                                >
                                    <span className={styles.applyIcon}>📝</span> {t('elections.apply')}
                                </button>
                            </div>
                        </div>
                    )}

                    {isCandidate && hasApplied && !election.candidates?.some(c => c.candidateId?._id === user._id) && (
                        <div className={styles.actionArea}>
                            <div className={styles.statusCallout}>
                                <div className={styles.statusIcon}>⏳</div>
                                <p className={styles.statusMessage}>{t('elections.applicationPendingStatus', 'You have applied for this election. Waiting for admin approval.')}</p>
                            </div>
                        </div>
                    )}

                    {isCandidate && election.candidates?.some(c => c.candidateId?._id === user._id) && (
                        <div className={styles.actionArea}>
                            <div className={styles.statusCallout}>
                                <div className={styles.statusIcon}>✅</div>
                                <p className={styles.statusMessage}>{t('elections.approvedCandidateStatus', 'You are an approved candidate in this election.')}</p>
                            </div>
                        </div>
                    )}

                    {isAdmin && status === 'pending' && pendingApplications.length > 0 && (
                        <AdminApplicationReview
                            applications={pendingApplications}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onViewDetails={handleViewPendingDetails}
                            isLoading={actionLoading}
                        />
                    )}

                    {isAdmin && status === 'pending' && pendingApplications.length === 0 && (
                        <div className={styles.actionArea}>
                            <p className={styles.infoText}>{t('elections.noPendingApplications', 'No pending candidate applications.')}</p>
                        </div>
                    )}

                    {isAuthenticated && status === 'active' && !hasVoted && (
                        <VotingInterface
                            electionId={election._id}
                            candidates={election.candidates || []}
                            electionType={election.electionType}
                            proposition={election.proposition}
                            ratingOptions={election.ratingOptions}
                            onVoteSuccess={handleVoteSuccess}
                        />
                    )}

                    {isAuthenticated && status === 'active' && hasVoted && (
                        <div className={styles.resultsSection}>
                            <h2 className={styles.sectionTitle}>
                                <span className={styles.sectionIcon}>📊</span> {t('elections.electionResults', 'Election Results')}
                            </h2>
                            <ElectionResults 
                                electionId={election._id} 
                                election={election}
                            />
                        </div>
                    )}

                    {status === 'completed' && (
                        <div className={styles.resultsSection}>
                            <ElectionResults 
                                electionId={election._id}
                                election={election}
                            />
                        </div>
                    )}

                    {election.candidates && 
                     election.candidates.length > 0 && 
                     election.electionType !== 'image-based' && (
                        <div className={styles.candidateListSection} dir="ltr">
                            <h2 className={styles.sectionTitle}>{t('elections.approvedCandidates', 'Approved Candidates')}</h2>
                            <ul className={styles.candidateGrid}>
                                {election.candidates.map(candidate => {
                                    // Get a safe image URL for candidate profile
                                    const profileImageUrl = getSafeImageUrl(candidate.candidateId?.profileImage);
                                    console.log(`Candidate profile image URL:`, profileImageUrl);
                                    
                                    return (
                                        <li
                                            key={candidate.candidateId?._id || candidate._id}
                                            className={styles.candidateCard}
                                            // Keep onClick for viewing details, but button click should stop propagation
                                            onClick={() => handleViewApprovedCandidateDetails(candidate.candidateId?._id)}
                                            style={{ cursor: 'pointer' }}
                                            title={t('admin.clickToViewDetails', 'Click to view application details')}
                                        >
                                            <img
                                                src={profileImageUrl}
                                                alt={candidate.candidateId?.name || t('elections.candidate', 'Candidate')}
                                                className={styles.candidateImage}
                                                onError={(e) => { 
                                                    console.error(`Failed to load candidate image: ${profileImageUrl}`); 
                                                    e.target.onerror = null; 
                                                    e.target.src = '/placeholder-image.svg'; 
                                                }}
                                            />
                                            <span className={styles.candidateName}>
                                                {candidate.candidateId?.name || t('elections.unnamedCandidate', 'Unknown Candidate')}
                                            </span>
                                            
                                            {/* --- EDIT: Add Remove Candidate Button --- */}
                                            {isAdmin && status !== 'completed' && ( // Only show for admins and if election is not completed
                                                <button
                                                    className={styles.removeCandidateButton} // Add a style for this button in DetailsPage.module.css
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent the li's onClick from firing
                                                        handleRemoveCandidate(candidate.candidateId?._id);
                                                    }}
                                                    disabled={removeCandidateLoading[candidate.candidateId?._id] || actionLoading} // Disable if removing this specific candidate or any general action is loading
                                                    title={t('elections.removeCandidate', 'Remove this candidate')}
                                                >
                                                    {removeCandidateLoading[candidate.candidateId?._id] ? t('common.loading', '...') : '×'}
                                                </button>
                                            )}
                                            {/* --- END EDIT --- */}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </main>
            <Footer />

            {showApplicationDetailsModal && selectedApplication && (
                <CandidateApplicationDetails
                    application={selectedApplication}
                    isOpen={showApplicationDetailsModal}
                    onClose={() => setShowApplicationDetailsModal(false)}
                />
            )}

            {/* Approved Candidate Details Modal */}
            {showCandidateDetailsModal && selectedCandidate && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{t('elections.candidateDetails', 'Candidate Details')}</h3>
                            <button onClick={() => setShowCandidateDetailsModal(false)} className={styles.modalClose}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.candidateProfile}>
                                <img 
                                    src={getSafeImageUrl(selectedCandidate.candidateId?.profileImage)} 
                                    alt={selectedCandidate.name || t('elections.candidate', 'Candidate')} 
                                    className={styles.candidateModalImage}
                                    onError={(e) => {
                                        e.target.src = '/placeholder-image.svg';
                                    }}
                                />
                                <h4 className={styles.candidateName}>{selectedCandidate.name || selectedCandidate.candidateId?.name || t('elections.candidate', 'Candidate')}</h4>
                                
                                {/* ID Number (if available) */}
                                {selectedCandidate.idNumber && (
                                    <div className={styles.candidateIdSection}>
                                        <span className={styles.candidateIdLabel}>{t('admin.idNumber', 'ID Number')}:</span>
                                        <span className={styles.candidateIdValue}>{selectedCandidate.idNumber}</span>
                                    </div>
                                )}
                                
                                <div className={styles.candidateDescription}>
                                    <h5>{t('elections.personalStatement', 'Personal Statement')}</h5>
                                    <p>{selectedCandidate.applicationDescription || t('elections.noStatementProvided', 'No statement provided.')}</p>
                                </div>
                                
                                {/* Plan Points (if available) */}
                                {selectedCandidate.planPoints && selectedCandidate.planPoints.length > 0 && (
                                    <div className={styles.candidatePlanSection}>
                                        <h5>{t('elections.platformPoints', 'Platform Points')}</h5>
                                        <ul className={styles.candidatePlanList}>
                                            {selectedCandidate.planPoints.map((point, index) => (
                                                <li key={index} className={styles.candidatePlanItem}>{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {/* Social Media Links (if available) */}
                                {selectedCandidate.socialMedia && Object.values(selectedCandidate.socialMedia).some(link => link) && (
                                    <div className={styles.candidateSocialSection}>
                                        <h5>{t('elections.socialMedia', 'Social Media')}</h5>
                                        <div className={styles.socialLinks}>
                                            {selectedCandidate.socialMedia.facebook && (
                                                <a href={selectedCandidate.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                                    Facebook
                                                </a>
                                            )}
                                            {selectedCandidate.socialMedia.twitter && (
                                                <a href={selectedCandidate.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                                    Twitter/X
                                                </a>
                                            )}
                                            {selectedCandidate.socialMedia.instagram && (
                                                <a href={selectedCandidate.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                                    Instagram
                                                </a>
                                            )}
                                            {selectedCandidate.socialMedia.linkedin && (
                                                <a href={selectedCandidate.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                                    LinkedIn
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {/* CV Download Link */}
                                {selectedCandidate.cvPath && (
                                    <div className={styles.cvSection}>
                                        <a 
                                            href={selectedCandidate.cvPath.startsWith('/') ? selectedCandidate.cvPath : `/${selectedCandidate.cvPath}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={styles.cvDownloadLink}
                                        >
                                            {t('admin.downloadCV', 'Download CV')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowCandidateDetailsModal(false)} className={styles.modalCloseButton}>
                                {t('common.close', 'Close')}
                            </button>
                            {isAdmin && (
                                <button 
                                    onClick={() => {
                                        handleRemoveCandidate(selectedCandidate.candidateId?._id);
                                        setShowCandidateDetailsModal(false);
                                    }}
                                    className={styles.removeButton}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? t('common.processing', 'Processing...') : t('elections.removeCandidate', 'Remove Candidate')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ElectionDetailsPage;