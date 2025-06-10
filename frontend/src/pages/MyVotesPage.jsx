import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import electionService from '../services/electionService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ViewButton from '../components/ViewButton';
import styles from './MyVotesPage.module.css';
import listStyles from './ListPage.module.css';
import { getStatus } from '../utils/dateUtils'; // Import getStatus utility
import { useTranslation } from 'react-i18next'; // Import useTranslation hook

function MyVotesPage() {
    const { t } = useTranslation(); // Initialize translation
    const { isAuthenticated, user } = useAuth();
    const [votes, setVotes] = useState([]);
    const [filteredVotes, setFilteredVotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    // Sort states
    const [dateSort, setDateSort] = useState('none'); // 'none', 'asc', 'desc'
    const [timeRemainingSort, setTimeRemainingSort] = useState('none'); // 'none', 'asc', 'desc'

    // Add a state to store time remaining for each vote
    const [timeRemaining, setTimeRemaining] = useState({});

    // Fetch user votes when component mounts
    useEffect(() => {
        const fetchMyVotes = async () => {
            try {
                setLoading(true);
                setError(null);
                const myVotes = await electionService.getMyVotes();
                setVotes(myVotes);
                setFilteredVotes(myVotes);
            } catch (err) {
                console.error('Error fetching voting history:', err);
                setError(err.message || t('myVotes.error'));
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchMyVotes();
        }
    }, [isAuthenticated, t]);

    // Helper to calculate time remaining for an election
    const getTimeRemaining = (endDate) => {
        const now = new Date();
        const end = new Date(endDate);
        
        // If end date is in the past, return 0
        if (end <= now) return 0;
        
        // Return milliseconds remaining
        return end - now;
    };

    // Filter votes when filter conditions change
    useEffect(() => {
        if (!votes.length) return;
        
        let result = [...votes];
        
        // Apply search term filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(vote => 
                vote.election?.title?.toLowerCase().includes(searchLower) || 
                vote.election?.description?.toLowerCase().includes(searchLower)
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(vote => {
                if (!vote.election) return false;
                // Calculate display status using the same function as ElectionCard
                const displayStatus = getStatus(
                    vote.election.startDate, 
                    vote.election.endDate, 
                    vote.election.status
                );
                return displayStatus === statusFilter;
            });
        }
        
        // Apply type filter
        if (typeFilter !== 'all') {
            result = result.filter(vote => vote.election?.electionType === typeFilter);
        }
        
        // Apply date sorting
        if (dateSort !== 'none') {
            result.sort((a, b) => {
                const dateA = new Date(a.votedAt);
                const dateB = new Date(b.votedAt);
                
                if (dateSort === 'asc') {
                    return dateA - dateB; // Ascending order (oldest first)
                } else {
                    return dateB - dateA; // Descending order (newest first)
                }
            });
        }
        
        // Apply time remaining sorting - only for elections that aren't completed or cancelled
        if (timeRemainingSort !== 'none') {
            result.sort((a, b) => {
                // Skip if either election is completed or cancelled
                if (!a.election || !b.election || 
                    a.election.status === 'completed' || a.election.status === 'cancelled' || 
                    b.election.status === 'completed' || b.election.status === 'cancelled') {
                    return 0;
                }
                
                const remainingA = getTimeRemaining(a.election.endDate);
                const remainingB = getTimeRemaining(b.election.endDate);
                
                if (timeRemainingSort === 'asc') {
                    return remainingA - remainingB; // Ascending (least time left first)
                } else {
                    return remainingB - remainingA; // Descending (most time left first)
                }
            });
        }
        
        setFilteredVotes(result);
    }, [searchTerm, statusFilter, typeFilter, dateSort, timeRemainingSort, votes]);

    // Calculate and update time remaining for all active elections
    useEffect(() => {
        if (!filteredVotes.length) return;

        const calculateTimeRemaining = (vote) => {
            if (!vote.election) return t('myVotes.voteDetailsNotAvailable');

            const now = new Date();
            const endDate = new Date(vote.election.endDate);
            
            // If election is already over or cancelled
            if (vote.election.status === 'completed' || 
                vote.election.status === 'cancelled' || 
                now > endDate) {
                return t('myVotes.completed');
            }
            
            // If election hasn't started yet
            const startDate = new Date(vote.election.startDate);
            if (now < startDate) {
                const diffTime = Math.abs(startDate - now);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                
                return t('myVotes.startsIn', { days: diffDays, hours: diffHours });
            }
            
            // Calculate remaining time for active elections
            const diffTime = Math.abs(endDate - now);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffDays > 0) {
                return t('myVotes.remaining', { days: diffDays, hours: diffHours });
            } else if (diffHours > 0) {
                return t('myVotes.remainingHours', { hours: diffHours, minutes: diffMinutes });
            } else {
                return t('myVotes.remainingMinutes', { minutes: diffMinutes });
            }
        };

        // Calculate time remaining for each vote's election
        const timers = {};
        filteredVotes.forEach(vote => {
            if (vote.election) {
                timers[vote.voteId] = calculateTimeRemaining(vote);
            }
        });
        setTimeRemaining(timers);

        // Update timers every minute
        const interval = setInterval(() => {
            const updatedTimers = {};
            filteredVotes.forEach(vote => {
                if (vote.election) {
                    updatedTimers[vote.voteId] = calculateTimeRemaining(vote);
                }
            });
            setTimeRemaining(updatedTimers);
        }, 60000);

        return () => clearInterval(interval);
    }, [filteredVotes, t]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };
    
    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };
    
    // Handle type filter change
    const handleTypeFilterChange = (e) => {
        setTypeFilter(e.target.value);
    };
    
    // Handle date sort change
    const handleDateSortChange = (e) => {
        setDateSort(e.target.value);
        // Reset time remaining sort when date sort changes
        if (e.target.value !== 'none') {
            setTimeRemainingSort('none');
        }
    };
    
    // Handle time remaining sort change
    const handleTimeRemainingSortChange = (e) => {
        setTimeRemainingSort(e.target.value);
        // Reset date sort when time remaining sort changes
        if (e.target.value !== 'none') {
            setDateSort('none');
        }
    };
    
    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setTypeFilter('all');
        setDateSort('none');
        setTimeRemainingSort('none');
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get vote details based on election type
    const getVoteDetails = (vote) => {
        if (!vote.election) {
            return t('myVotes.electionDeleted');
        }
        
        const electionType = vote.election?.electionType;
        
        if (electionType === 'candidate-based' && vote.votedForCandidate) {
            return t('myVotes.votedFor', { name: vote.votedForCandidate.name || t('common.notAvailable') });
        } else if (electionType === 'yes-no' && vote.choice) {
            return t('myVotes.votedChoice', { choice: vote.choice.toUpperCase() });
        } else if (electionType === 'rating' && vote.ratingValue !== null && vote.ratingValue !== undefined) {
            return t('myVotes.votedRating', { rating: vote.ratingValue });
        } else if (electionType === 'image-based' && vote.selectedImageId) {
            return t('myVotes.votedImage');
        }
        
        return t('myVotes.voteDetailsNotAvailable');
    };

    // Render a special card for deleted elections
    const renderDeletedElectionCard = (vote) => {
        return (
            <div key={vote.voteId} className={`${styles.voteCard} ${styles.deletedElectionCard}`}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.electionTitle}>{t('myVotes.deletedElection')}</h3>
                    <span className={`${styles.statusBadge} ${styles.deleted}`}>
                        {t('myVotes.deleted')}
                    </span>
                </div>
                
                <div className={styles.cardContent}>
                    <div className={styles.voteDetails}>
                        <p className={styles.voteChoice}>{t('myVotes.electionDeleted')}</p>
                    </div>
                    
                    <div className={styles.infoRows}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>{t('myVotes.voteDate')}:</span>
                            <span className={styles.infoValue}>{formatDate(vote.votedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <main className={styles.mainContent}>
                <div className={styles.headerSection}>
                    <h1 className={styles.pageTitle}>{t('myVotes.pageTitle')}</h1>
                    <Link to="/elections" className={styles.browseLink}>
                        {t('myVotes.browseElections')}
                    </Link>
                </div>

                {/* Search and Filter Section */}
                <div className={listStyles.filtersContainer}>
                    <div className={listStyles.searchWrapper}>
                        <input
                            type="text"
                            placeholder={t('myVotes.searchPlaceholder')}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className={listStyles.searchInput}
                        />
                    </div>
                    
                    <div className={listStyles.filtersWrapper}>
                        <div className={listStyles.filterGroup}>
                            <label className={listStyles.filterLabel}>{t('myVotes.filters.status')}</label>
                            <select 
                                value={statusFilter} 
                                onChange={handleStatusFilterChange}
                                className={listStyles.filterSelect}
                            >
                                <option value="all">{t('myVotes.filters.allStatuses')}</option>
                                <option value="pending">{t('myVotes.filters.pending')}</option>
                                <option value="active">{t('myVotes.filters.active')}</option>
                                <option value="completed">{t('myVotes.filters.completed')}</option>
                                <option value="cancelled">{t('myVotes.filters.cancelled')}</option>
                            </select>
                        </div>
                        
                        <div className={listStyles.filterGroup}>
                            <label className={listStyles.filterLabel}>{t('myVotes.filters.electionType')}</label>
                            <select 
                                value={typeFilter} 
                                onChange={handleTypeFilterChange}
                                className={listStyles.filterSelect}
                            >
                                <option value="all">{t('myVotes.filters.allTypes')}</option>
                                <option value="candidate-based">{t('myVotes.filters.candidateBased')}</option>
                                <option value="yes-no">{t('myVotes.filters.yesNo')}</option>
                                <option value="rating">{t('myVotes.filters.rating')}</option>
                                <option value="image-based">{t('myVotes.filters.imageBased')}</option>
                            </select>
                        </div>
                        
                        <div className={listStyles.filterGroup}>
                            <label className={listStyles.filterLabel}>{t('myVotes.filters.sortByVoteDate')}</label>
                            <select 
                                value={dateSort} 
                                onChange={handleDateSortChange}
                                className={listStyles.filterSelect}
                            >
                                <option value="none">{t('myVotes.filters.noSorting')}</option>
                                <option value="asc">{t('myVotes.filters.oldestFirst')}</option>
                                <option value="desc">{t('myVotes.filters.newestFirst')}</option>
                            </select>
                        </div>
                        
                        <div className={listStyles.filterGroup}>
                            <label className={listStyles.filterLabel}>{t('myVotes.filters.sortByTimeLeft')}</label>
                            <select 
                                value={timeRemainingSort} 
                                onChange={handleTimeRemainingSortChange}
                                className={listStyles.filterSelect}
                            >
                                <option value="none">{t('myVotes.filters.noSorting')}</option>
                                <option value="asc">{t('myVotes.filters.endingSoon')}</option>
                                <option value="desc">{t('myVotes.filters.mostTimeLeft')}</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className={listStyles.actionWrapper}>
                        <button 
                            onClick={clearFilters}
                            className={listStyles.clearFiltersBtn}
                        >
                            {t('myVotes.filters.clearFilters')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <p className={styles.loadingText}>{t('myVotes.loading')}</p>
                    </div>
                ) : error ? (
                    <div className={styles.errorContainer}>
                        <p className={styles.errorText}>{error}</p>
                    </div>
                ) : votes.length === 0 ? (
                    <div className={styles.emptyContainer}>
                        <p className={styles.emptyText}>{t('myVotes.noVotes')}</p>
                        <Link to="/elections" className={styles.browseButton}>
                            {t('myVotes.browseActiveElections')}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className={listStyles.resultsInfo}>
                            {filteredVotes.length > 0 ? (
                                <p>
                                    {filteredVotes.length === 1 
                                        ? t('myVotes.showingVotes', { count: filteredVotes.length })
                                        : t('myVotes.showingVotesPlural', { count: filteredVotes.length })}
                                </p>
                            ) : (
                                <p>{t('myVotes.noMatchingVotes')}</p>
                            )}
                        </div>
                        
                        {filteredVotes.length > 0 ? (
                            <div className={styles.votesGrid}>
                                {filteredVotes.map((vote) => (
                                    vote.election ? (
                                        <div 
                                            key={vote.voteId} 
                                            className={styles.voteCard}
                                            data-type={vote.election.electionType}
                                        >
                                            <div className={styles.cardHeader}>
                                                <h3 className={styles.electionTitle}>{vote.election?.title || t('common.notAvailable')}</h3>
                                                <span className={`${styles.statusBadge} ${styles[vote.election?.status || 'unknown']}`}>
                                                    {vote.election?.status ? t(`elections.${vote.election.status.toLowerCase()}`, vote.election.status) : t('common.notAvailable')}
                                                </span>
                                            </div>
                                            
                                            <div className={styles.cardContent}>
                                                <div className={styles.voteDetails}>
                                                    <p className={styles.voteChoice}>{getVoteDetails(vote)}</p>
                                                </div>
                                                
                                                {/* Add Countdown Timer */}
                                                <div className={styles.countdownTimer}>
                                                    {timeRemaining[vote.voteId] || t('myVotes.calculating')}
                                                </div>
                                                
                                                <div className={styles.infoRows}>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>{t('myVotes.voteDate')}:</span>
                                                        <span className={styles.infoValue}>{formatDate(vote.votedAt)}</span>
                                                    </div>
                                                    
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>{t('elections.electionType')}:</span>
                                                        <span className={styles.infoValue}>
                                                            {vote.election?.electionType ? 
                                                                (() => {
                                                                    switch(vote.election.electionType) {
                                                                        case 'yes-no':
                                                                            return t('elections.yesNoQuestion');
                                                                        case 'rating':
                                                                            return t('elections.ratingFeedback');
                                                                        case 'image-based':
                                                                            return t('elections.imageBased');
                                                                        case 'candidate-based':
                                                                        default:
                                                                            return t('elections.candidateBased');
                                                                    }
                                                                })() : 
                                                                t('common.notAvailable')}
                                                        </span>
                                                    </div>
                                                    
                                                    {vote.election?.startDate && vote.election?.endDate && (
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>{t('myVotes.electionPeriod')}:</span>
                                                            <span className={styles.infoValue}>
                                                                {new Date(vote.election.startDate).toLocaleDateString()} - {new Date(vote.election.endDate).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className={styles.cardFooter}>
                                                <ViewButton 
                                                    to={`/elections/${vote.election?._id}`}
                                                    text={t('myVotes.viewElection')}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        renderDeletedElectionCard(vote)
                                    )
                                ))}
                            </div>
                        ) : (
                            <div className={listStyles.noResultsContainer}>
                                <p className={listStyles.noResultsText}>{t('myVotes.noMatchingVotes')}</p>
                                <button onClick={clearFilters} className={listStyles.resetFiltersBtn}>{t('myVotes.resetFilters')}</button>
                            </div>
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default MyVotesPage; 