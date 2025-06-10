import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import electionService from '../services/electionService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ElectionCard from '../components/electioncard';
import ViewButton from '../components/ViewButton';
import styles from './BookmarkedPage.module.css';
import listStyles from './ListPage.module.css'; // Import list styles for filter bar
import { getStatus } from '../utils/dateUtils'; // Import getStatus utility
import { useTranslation } from 'react-i18next'; // Import useTranslation hook

function BookmarkedElectionsPage() {
    const { t } = useTranslation(); // Initialize translation
    const { isAuthenticated, user } = useAuth();
    const [elections, setElections] = useState([]);
    const [filteredElections, setFilteredElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    // Sort states
    const [dateSort, setDateSort] = useState('none'); // 'none', 'asc', 'desc'
    const [timeRemainingSort, setTimeRemainingSort] = useState('none'); // 'none', 'asc', 'desc'

    // Fetch bookmarked elections when component mounts
    useEffect(() => {
        const fetchBookmarkedElections = async () => {
            try {
                setLoading(true);
                setError(null);
                const bookmarkedElections = await electionService.getBookmarkedElections();
                setElections(bookmarkedElections);
                setFilteredElections(bookmarkedElections);
            } catch (err) {
                console.error('Error fetching bookmarked elections:', err);
                setError(err.message || t('bookmarked.error'));
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchBookmarkedElections();
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

    // Filter elections when filter conditions change
    useEffect(() => {
        if (!elections.length) return;
        
        let result = [...elections];
        
        // Apply search term filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(election => 
                election.title.toLowerCase().includes(searchLower) || 
                election.description.toLowerCase().includes(searchLower)
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(election => {
                // Calculate display status using the same function as ElectionCard
                const displayStatus = getStatus(election.startDate, election.endDate, election.status);
                return displayStatus === statusFilter;
            });
        }
        
        // Apply type filter
        if (typeFilter !== 'all') {
            result = result.filter(election => election.electionType === typeFilter);
        }
        
        // Apply date sorting
        if (dateSort !== 'none') {
            result.sort((a, b) => {
                const dateA = new Date(a.startDate);
                const dateB = new Date(b.startDate);
                
                if (dateSort === 'asc') {
                    return dateA - dateB; // Ascending order (oldest first)
                } else {
                    return dateB - dateA; // Descending order (newest first)
                }
            });
        }
        
        // Apply time remaining sorting - but only to active and pending elections
        if (timeRemainingSort !== 'none') {
            result.sort((a, b) => {
                // Skip if either election is completed or cancelled
                if (a.status === 'completed' || a.status === 'cancelled' || 
                    b.status === 'completed' || b.status === 'cancelled') {
                    return 0;
                }
                
                const remainingA = getTimeRemaining(a.endDate);
                const remainingB = getTimeRemaining(b.endDate);
                
                if (timeRemainingSort === 'asc') {
                    return remainingA - remainingB; // Ascending (least time left first)
                } else {
                    return remainingB - remainingA; // Descending (most time left first)
                }
            });
        }
        
        setFilteredElections(result);
    }, [searchTerm, statusFilter, typeFilter, dateSort, timeRemainingSort, elections]);

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

    // Handle bookmark status changes
    const handleBookmarkChange = async (electionId, isBookmarked) => {
        if (!isBookmarked) {
            // Remove from the list if unbookmarked
            const updatedElections = elections.filter(election => election._id !== electionId);
            setElections(updatedElections);
            setFilteredElections(updatedElections.filter(election => {
                // Reapply current filters to the updated elections list
                const matchesSearch = !searchTerm.trim() || 
                    election.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    election.description.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesStatus = statusFilter === 'all' || election.status === statusFilter;
                const matchesType = typeFilter === 'all' || election.electionType === typeFilter;
                
                return matchesSearch && matchesStatus && matchesType;
            }));
        }
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
                    <h1 className={styles.pageTitle}>{t('bookmarked.pageTitle')}</h1>
                    <Link to="/elections" className={styles.browseLink}>
                        {t('bookmarked.browseAllElections')}
                    </Link>
                </div>

                {/* Search and Filter Section */}
                <div className={listStyles.filtersContainer}>
                    <div className={listStyles.searchWrapper}>
                        <input
                            type="text"
                            placeholder={t('bookmarked.searchPlaceholder')}
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
                            disabled={statusFilter === 'all' && typeFilter === 'all' && dateSort === 'none' && timeRemainingSort === 'none' && !searchTerm}
                        >
                            {t('myVotes.filters.clearFilters')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <p className={styles.loadingText}>{t('bookmarked.loading')}</p>
                    </div>
                ) : error ? (
                    <div className={styles.errorContainer}>
                        <p className={styles.errorText}>{error}</p>
                    </div>
                ) : elections.length === 0 ? (
                    <div className={styles.emptyContainer}>
                        <p className={styles.emptyText}>{t('bookmarked.noBookmarks')}</p>
                        <Link to="/elections" className={styles.browseButton}>
                            {t('bookmarked.browseElections')}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className={listStyles.resultsInfo}>
                            {filteredElections.length > 0 ? (
                                <p>
                                    {filteredElections.length === 1 
                                        ? t('bookmarked.showingBookmarks', { count: filteredElections.length })
                                        : t('bookmarked.showingBookmarksPlural', { count: filteredElections.length })}
                                </p>
                            ) : (
                                <p>{t('bookmarked.noMatchingBookmarks')}</p>
                            )}
                        </div>
                        
                        {filteredElections.length > 0 ? (
                            <div className={styles.electionsGrid}>
                                {filteredElections.map(election => (
                                    <ElectionCard
                                        key={election._id}
                                        election={election}
                                        isBookmarked={true}
                                        onBookmarkChange={handleBookmarkChange}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className={listStyles.noResultsContainer}>
                                <p className={listStyles.noResultsText}>{t('bookmarked.noMatchingBookmarks')}</p>
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

export default BookmarkedElectionsPage; 