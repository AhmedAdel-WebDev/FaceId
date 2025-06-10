import React, { useState, useEffect, useMemo } from 'react';
import electionService from '../services/electionService';
import { getSafeImageUrl } from '../utils/imageUtils.js'; // Import the image utility
import { useTranslation } from 'react-i18next'; // Import translation hook
import styles from './ElectionResults.module.css'; // Ensure CSS module is imported

function ElectionResults({ electionId, election: passedElection }) { // Accept both electionId and optional election object
    const { t } = useTranslation(); // Initialize translation hook
    const [election, setElection] = useState(passedElection); // Store the election object
    const [resultsData, setResultsData] = useState(null); // Store the raw results object
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Add error state

    // Fetch election details if only electionId is provided
    useEffect(() => {
        let isMounted = true;
        
        const fetchElectionData = async () => {
            if (!isMounted || passedElection) return; // Don't fetch if unmounted or election was passed
            
            try {
                setLoading(true);
                const data = await electionService.getElectionById(electionId);
                if (isMounted) {
                    setElection(data);
                }
            } catch (err) {
                console.error("Error fetching election data:", err);
                if (isMounted) {
                    setError(err.message || t('elections.failedToLoadElectionData', 'Failed to load election data.'));
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        
        // Only fetch if we have electionId but not the election object
        if (electionId && !passedElection) {
            fetchElectionData();
        }
        
        return () => {
            isMounted = false;
        };
    }, [electionId, passedElection, t]);

    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates on unmounted component
        let intervalId = null;

        const fetchResults = async () => {
            if (!isMounted) return; // Don't fetch if unmounted
            setError(null); // Clear previous errors
            try {
                // Use electionId from props directly or from election object
                const id = electionId || election?._id;
                if (!id) {
                    throw new Error(t('elections.electionIdNotAvailable', 'Election ID is not available to fetch results.'));
                }
                
                const data = await electionService.getElectionResults(id);
                if (isMounted) {
                    setResultsData(data.results); // Store the whole results object
                }
            } catch (err) {
                console.error("Error fetching election results:", err);
                if (isMounted) {
                    setError(err.message || t('elections.failedToLoadResults', 'Failed to load results.'));
                }
            } finally {
                if (isMounted && loading) { // Turn off initial loading spinner
                    setLoading(false);
                }
            }
        };

        // Check if we can fetch results
        const id = electionId || election?._id;
        if (!id) {
            setError(t('elections.electionDataNotAvailable', 'Election data is not available to fetch results.'));
            setLoading(false);
            return;
        }

        // Initial fetch
        fetchResults();

        // Poll for live updates every 5 seconds
        intervalId = setInterval(fetchResults, 5000);

        // Cleanup function
        return () => {
            isMounted = false; // Set flag on unmount
            clearInterval(intervalId); // Clear interval
        };
    }, [electionId, election, loading, t]);

    // Calculate total votes and max votes using useMemo for efficiency
    const { totalVotes, maxVotes, processedResults } = useMemo(() => {
        if (!resultsData || !election) return { totalVotes: 0, maxVotes: 0, processedResults: [] };

        let currentTotalVotes = 0;
        let currentMaxVotes = 0;
        let currentProcessedResults = [];

        switch (election.electionType) {
            case 'candidate-based':
            case 'image-based': // Handles both similarly for display
                currentProcessedResults = resultsData.map(r => ({
                    ...r, // Includes name, profileImage/imageUrl, imageLabel, votes
                    id: r.candidateId || r.imageId, // Unique key for list items
                    displayName: r.name || r.imageLabel || t('elections.option', 'Option')
                }));
                currentTotalVotes = currentProcessedResults.reduce((sum, r) => sum + r.votes, 0);
                currentMaxVotes = Math.max(...currentProcessedResults.map(r => r.votes), 0);
                break;
            case 'yes-no':
                currentProcessedResults = resultsData.choices.map(choice => ({
                    ...choice,
                    id: choice.choice,
                    displayName: choice.choice.toUpperCase()
                }));
                currentTotalVotes = currentProcessedResults.reduce((sum, r) => sum + r.votes, 0);
                currentMaxVotes = Math.max(...currentProcessedResults.map(r => r.votes), 0);
                break;
            case 'rating':
                // resultsData for rating: { distribution: [{ rating, votes }], averageRating, totalVotes }
                currentProcessedResults = resultsData.distribution.map(item => ({
                    ...item,
                    id: `rating-${item.rating}`,
                    displayName: t('elections.ratingValue', 'Rating {{value}}', { value: item.rating })
                }));
                currentTotalVotes = resultsData.totalVotes;
                currentMaxVotes = Math.max(...currentProcessedResults.map(r => r.votes), 0);
                break;
            default:
                return { totalVotes: 0, maxVotes: 0, processedResults: [] };
        }
        return { totalVotes: currentTotalVotes, maxVotes: currentMaxVotes, processedResults: currentProcessedResults.sort((a, b) => b.votes - a.votes) };
    }, [resultsData, election, t]);

    if (loading) return <p className={styles.loadingText}>{t('elections.loadingResults', 'Loading results...')}</p>;
    if (error) return <p className={styles.errorText}>{error}</p>;
    if (!election) return <p className={styles.errorText}>{t('elections.electionDataNotAvailable', 'Election data not available.')}</p>;
    if (!resultsData || (Array.isArray(resultsData) && resultsData.length === 0 && election.electionType !== 'rating' && election.electionType !== 'yes-no')) {
        // For rating/yes-no, resultsData is an object, so check processedResults for emptiness
        if ((election.electionType === 'rating' || election.electionType === 'yes-no') && (!processedResults || processedResults.length === 0)) {
            return <p className={styles.noResultsText}>{t('elections.noResultsAvailable', 'No results available yet for this election.')}</p>;
        }
        if (election.electionType !== 'rating' && election.electionType !== 'yes-no') {
             return <p className={styles.noResultsText}>{t('elections.noResultsAvailable', 'No results available yet for this election.')}</p>;
        }
    }

    const renderResultsList = () => {
        if (!processedResults || processedResults.length === 0) {
            return <p className={styles.noResultsText}>{t('elections.noVotingData', 'No voting data to display.')}</p>;
        }

        return (
            <ul className={styles.resultsList}>
                {processedResults.map((item, index) => {
                    const percentage = totalVotes > 0 ? ((item.votes / totalVotes) * 100).toFixed(1) : 0;
                    const barWidth = maxVotes > 0 ? (item.votes / maxVotes) * 100 : 0;
                    const isLeading = index === 0 && item.votes > 0 && (election.electionType === 'candidate-based' || election.electionType === 'image-based');

                    return (
                        <li key={item.id || index} className={`${styles.resultItem} ${isLeading ? styles.leading : ''}`}>
                            <div className={styles.candidateInfo}>
                                {(election.electionType === 'candidate-based' || election.electionType === 'image-based') && (
                                    <img
                                        src={getSafeImageUrl(item.profileImage || item.imageUrl) || '/placeholder-image.svg'}
                                        alt={item.displayName}
                                        className={styles.candidateImage}
                                        onError={(e) => { 
                                            console.error(`Failed to load result image for ${item.displayName}`);
                                            e.target.onerror = null; 
                                            e.target.src = '/placeholder-image.svg'; 
                                        }}
                                    />
                                )}
                                <span className={styles.candidateName}>{item.displayName}</span>
                            </div>
                            <div className={styles.barWrapper}>
                                <div className={styles.voteBarOuter}>
                                    <div
                                        className={styles.voteBarInner}
                                        style={{ width: `${barWidth}%` }}
                                        data-item-id={item.id}
                                    ></div>
                                </div>
                                <span className={styles.voteDetails}>
                                    {t('elections.votesPercentage', '{{count}} votes ({{percentage}}%)', { count: item.votes, percentage: percentage })}
                                </span>
                            </div>
                            {isLeading && (
                                <div className={styles.leadingBadgeWrapper}>
                                    <span className={styles.leadingBadge}>{t('elections.leading', 'Leading')}</span>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className={styles.resultsContainer}>
            <h3 className={styles.title}>{t('elections.liveElectionResults', 'Live Election Results')}</h3>
            <p className={styles.totalVotes}>{t('elections.totalVotesCast', 'Total Votes Cast')}: {totalVotes}</p>
            {election.electionType === 'rating' && resultsData?.averageRating !== undefined && (
                <p className={styles.averageRating}>{t('elections.averageRating', 'Average Rating')}: {resultsData.averageRating} ({t('elections.outOf', 'out of')} {election.ratingOptions?.max || t('common.notAvailable', 'N/A')})</p>
            )}
            {renderResultsList()}
        </div>
    );
}

export default ElectionResults;