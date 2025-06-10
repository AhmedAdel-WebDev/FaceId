import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import electionService from '../services/electionService'; // Import the service
import ElectionCard from '../components/electioncard'; // Import the card component
import { useAuth } from '../context/AuthContext';
import styles from './ListPage.module.css'; // Create and use shared list page styles
import BookmarkButton from '../components/BookmarkButton';
import { getStatus } from '../utils/dateUtils'; // Import getStatus utility
import { useTranslation } from 'react-i18next'; // Import translation hook

function ElectionsListPage() {
  const { t } = useTranslation(); // Initialize translation hook
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [elections, setElections] = useState([]);
  const [filteredElections, setFilteredElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarkedElectionIds, setBookmarkedElectionIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pageKey, setPageKey] = useState(Date.now()); // Force remount when needed
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  // Sort states
  const [dateSort, setDateSort] = useState('none'); // 'none', 'asc', 'desc'
  const [timeRemainingSort, setTimeRemainingSort] = useState('none'); // 'none', 'asc', 'desc'
  
  // Create memoized fetch functions to avoid recreation on each render
  const fetchElections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await electionService.getElections();
      setElections(data || []);
      setFilteredElections(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching elections:", err);
      const message = err.response?.data?.error || err.message || 'Failed to load elections.';
      setError(message);
      setElections([]);
      setFilteredElections([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchBookmarkedElections = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarkedElectionIds([]);
      return;
    }
    
    try {
      const bookmarkedElections = await electionService.getBookmarkedElections();
      // Extract just the IDs from the bookmarked elections
      const bookmarkedIds = bookmarkedElections.map(election => election._id);
      setBookmarkedElectionIds(bookmarkedIds);
    } catch (err) {
      console.error("Error fetching bookmarked elections:", err);
      setBookmarkedElectionIds([]);
    }
  }, [isAuthenticated]);
  
  // Add effect to refresh data when component is focused or mounted
  useEffect(() => {
    const fetchData = async () => {
      await fetchElections();
      if (isAuthenticated) {
        await fetchBookmarkedElections();
      }
    };
    
    fetchData();
    
    // Add event listener for when the window regains focus
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [location.key, isAuthenticated, refreshTrigger, fetchElections, fetchBookmarkedElections]);
  
  // Helper to calculate time remaining for an election
  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    
    // If end date is in the past, return 0
    if (end <= now) return 0;
    
    // Return milliseconds remaining
    return end - now;
  };
  
  // Handle window focus event to refresh data
  const handleWindowFocus = () => {
    fetchBookmarkedElections(); // Immediately fetch bookmarks
    setRefreshTrigger(prev => prev + 1);
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

  // Handle bookmark status change
  const handleBookmarkChange = async (electionId, isBookmarked) => {
    if (isBookmarked) {
      setBookmarkedElectionIds(prev => [...prev, electionId]);
    } else {
      setBookmarkedElectionIds(prev => prev.filter(id => id !== electionId));
    }
    
    // Force immediate refresh of bookmarked elections
    await fetchBookmarkedElections();
    
    // Force component key update to ensure proper re-rendering
    setPageKey(Date.now());
  };

  return (
    <div className={styles.pageContainer} key={pageKey}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.headerSection}>
          <h1 className={styles.title}>{t('elections.availableElections', 'Available Elections')}</h1>
          {isAuthenticated && (
            <BookmarkButton to="/bookmarked" text={t('elections.viewBookmarked', 'View Bookmarked')} />
          )}
        </div>
        
        {/* Search and Filter Section */}
        <div className={styles.filtersContainer}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder={t('elections.searchElections', 'Search elections...')}
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filtersWrapper}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('elections.status', 'Status')}</label>
              <select 
                value={statusFilter} 
                onChange={handleStatusFilterChange}
                className={styles.filterSelect}
              >
                <option value="all">{t('elections.allStatuses', 'All Statuses')}</option>
                <option value="pending">{t('elections.pending', 'Pending')}</option>
                <option value="active">{t('elections.active', 'Active')}</option>
                <option value="completed">{t('elections.completed', 'Completed')}</option>
                <option value="cancelled">{t('elections.statusCancelled', 'Cancelled')}</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('elections.electionType', 'Election Type')}</label>
              <select 
                value={typeFilter} 
                onChange={handleTypeFilterChange}
                className={styles.filterSelect}
              >
                <option value="all">{t('elections.allTypes', 'All Types')}</option>
                <option value="candidate-based">{t('elections.candidateBased', 'Candidate Based')}</option>
                <option value="yes-no">{t('elections.yesNoQuestion', 'Yes/No')}</option>
                <option value="rating">{t('elections.ratingFeedback', 'Rating')}</option>
                <option value="image-based">{t('elections.imageBased', 'Image Based')}</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('myVotes.filters.sortByVoteDate', 'Sort by Date')}</label>
              <select 
                value={dateSort} 
                onChange={handleDateSortChange}
                className={styles.filterSelect}
              >
                <option value="none">{t('elections.noSorting', 'No Sorting')}</option>
                <option value="asc">{t('elections.oldestFirst', 'Oldest First')}</option>
                <option value="desc">{t('elections.newestFirst', 'Newest First')}</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{t('myVotes.filters.sortByTimeLeft', 'Sort by Time Left')}</label>
              <select 
                value={timeRemainingSort} 
                onChange={handleTimeRemainingSortChange}
                className={styles.filterSelect}
              >
                <option value="none">{t('elections.noSorting', 'No Sorting')}</option>
                <option value="asc">{t('elections.endingSoon', 'Ending Soon')}</option>
                <option value="desc">{t('elections.mostTimeLeft', 'Most Time Left')}</option>
              </select>
            </div>
          </div>
          
          <div className={styles.actionWrapper}>
            <button 
              onClick={clearFilters}
              className={styles.clearFiltersBtn}
            >
              {t('elections.clearFilters', 'Clear Filters')}
            </button>
          </div>
        </div>

        {loading && <p className={styles.loadingText}>{t('elections.loadingElections', 'Loading elections...')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}

        {!loading && !error && (
          <>
            <div className={styles.resultsInfo}>
              {filteredElections.length > 0 ? (
                <p>{t('elections.showing', 'Showing')} {filteredElections.length} {filteredElections.length !== 1 ? t('elections.elections', 'elections') : t('elections.election', 'election')}</p>
              ) : (
                <p>{t('elections.noElectionsFound', 'No elections found.')}</p>
              )}
            </div>
            
            <div className={styles.listGrid}>
              {filteredElections.length > 0 ? (
                filteredElections.map(election => (
                  <ElectionCard 
                    key={`${election._id}-${bookmarkedElectionIds.includes(election._id)}`}
                    election={election} 
                    isBookmarked={bookmarkedElectionIds.includes(election._id)}
                    onBookmarkChange={handleBookmarkChange}
                  />
                ))
              ) : (
                searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateSort !== 'none' || timeRemainingSort !== 'none' ? (
                  <div className={styles.noResultsContainer}>
                    <p className={styles.noResultsText}>{t('elections.noElectionsMatchFilters', 'No elections match your search criteria.')}</p>
                    <button onClick={clearFilters} className={styles.resetFiltersBtn}>{t('elections.resetFilters', 'Reset Filters')}</button>
                  </div>
                ) : (
                  <p className={styles.noResultsText}>{t('elections.noElectionsFound', 'No elections found.')}</p>
                )
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default ElectionsListPage;