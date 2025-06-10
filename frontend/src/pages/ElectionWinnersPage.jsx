import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import electionService from '../services/electionService';
import styles from './ElectionWinnersPage.module.css';
import { formatDate } from '../utils/dateUtils';
import { FaMedal, FaTrophy, FaAward, FaFilter, FaTimes, FaSearch } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';

const ElectionWinnersPage = () => {
  const { t } = useTranslation();
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filteredWinners, setFilteredWinners] = useState([]);
  const [filters, setFilters] = useState({
    electionType: 'all',
    dateRange: 'all',
    searchQuery: ''
  });
  
  // UI state
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  useEffect(() => {
    const fetchCompletedElections = async () => {
      try {
        setLoading(true);
        // Fetch all elections
        const elections = await electionService.getElections();
        
        // Filter only completed elections
        const completedElections = elections.filter(
          election => election.status === 'completed'
        );

        // Fetch results for each completed election
        const winnerPromises = completedElections.map(async (election) => {
          try {
            const response = await electionService.getElectionResults(election._id);
            
            // Check if we have valid results data
            const results = response?.results;
            if (!results) {
              console.log(`No results found for election ${election._id}:`, response);
              return null;
            }
            
            // Handle different election types
            if (election.electionType === 'candidate-based' || election.electionType === 'image-based') {
              // Sort results by votes and get the winner
              const sortedResults = [...results].sort((a, b) => b.votes - a.votes);
              const winner = sortedResults[0];
              
              if (!winner) {
                return null;
              }
              
              return {
                election,
                winner,
                totalVotes: sortedResults.reduce((sum, candidate) => sum + candidate.votes, 0)
              };
            } else if (election.electionType === 'yes-no') {
              // For yes/no elections, find the winning choice
              if (!results.choices && !results.proposition) {
                console.log('Invalid yes-no results format:', results);
                return null;
              }
              
              // Make sure we access the data correctly based on response structure
              const choices = results.choices || [];
              if (choices.length === 0) return null;
              
              const sortedChoices = [...choices].sort((a, b) => b.votes - a.votes);
              const winner = sortedChoices[0];
              
              return {
                election,
                winner: {
                  name: winner.choice.toUpperCase(),
                  votes: winner.votes
                },
                totalVotes: sortedChoices.reduce((sum, choice) => sum + choice.votes, 0)
              };
            } else if (election.electionType === 'rating') {
              // For rating elections, use average rating as winner
              if (results.averageRating === undefined && !results.distribution) {
                console.log('Invalid rating results format:', results);
                return null;
              }
              
              // Make sure we access the data correctly based on response structure
              const averageRating = results.averageRating || 0;
              const totalVotes = results.totalVotes || 0;
              
              return {
                election,
                winner: {
                  name: `Rating: ${averageRating}/${election.ratingOptions?.max || 5}`,
                  votes: totalVotes
                },
                totalVotes: totalVotes
              };
            }
            
            return null;
          } catch (error) {
            console.error(`Error fetching results for election ${election._id}:`, error);
            return null;
          }
        });
        
        const winnersData = (await Promise.all(winnerPromises)).filter(data => data !== null);
        
        // Sort winners by election end date (most recent first)
        winnersData.sort((a, b) => new Date(b.election.endDate) - new Date(a.election.endDate));
        
        setWinners(winnersData);
        setFilteredWinners(winnersData); // Initialize filtered winners with all winners
      } catch (error) {
        console.error('Error fetching winners:', error);
        setError(t('winnersGallery.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedElections();
  }, [t]);

  // Apply filters whenever filters change
  useEffect(() => {
    if (winners.length === 0) return;
    
    let result = [...winners];
    
    // Filter by election type
    if (filters.electionType !== 'all') {
      result = result.filter(item => item.election.electionType === filters.electionType);
    }
    
    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 60)); // Already -30, so -60 more to get -90
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      
      result = result.filter(item => {
        const endDate = new Date(item.election.endDate);
        switch (filters.dateRange) {
          case 'last30days':
            return endDate >= thirtyDaysAgo;
          case 'last90days':
            return endDate >= ninetyDaysAgo;
          case 'lastyear':
            return endDate >= oneYearAgo;
          default:
            return true;
        }
      });
    }
    
    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(item => 
        item.election.title.toLowerCase().includes(query) || 
        item.winner.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredWinners(result);
  }, [filters, winners]);

  // Get unique election types for grouping
  const getUniqueElectionTypes = () => {
    if (!filteredWinners.length) return [];
    
    return [...new Set(filteredWinners.map(item => item.election.electionType))];
  };
  
  // Group winners by election type
  const getWinnersByType = (type) => {
    return filteredWinners.filter(item => item.election.electionType === type);
  };
  
  // Custom order for election types - Candidate first, then others
  const getOrderedElectionTypes = () => {
    const types = getUniqueElectionTypes();
    
    // If candidate-based exists, ensure it's first
    if (types.includes('candidate-based')) {
      // Remove candidate-based from its current position
      const filtered = types.filter(type => type !== 'candidate-based');
      // Add it to the beginning
      return ['candidate-based', ...filtered];
    }
    
    return types;
  };
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      electionType: 'all',
      dateRange: 'all',
      searchQuery: ''
    });
  };

  // Render a winner card
  const renderWinnerCard = (data) => (
    <div 
      key={data.election._id} 
      className={styles.winnerCard}
      data-type={data.election.electionType}
    >
      <div className={styles.winnerBadge}>
        <FaTrophy />
      </div>
      
      <div className={styles.electionTypeTag}>
        {data.election.electionType === 'candidate-based' ? t('winnersGallery.candidateBased') : 
         data.election.electionType === 'yes-no' ? t('winnersGallery.yesNo') :
         data.election.electionType === 'rating' ? t('winnersGallery.rating') : t('winnersGallery.imageBased')}
      </div>
      
      <h2 className={styles.electionTitle}>{data.election.title}</h2>
      <div className={styles.electionMeta}>
        <span>{t('winnersGallery.completedOn', { date: formatDate(data.election.endDate) })}</span>
        <span>{t('winnersGallery.totalVotes', { count: data.totalVotes })}</span>
      </div>
      
      <div className={styles.winnerSection}>
        {(data.election.electionType === 'candidate-based' || data.election.electionType === 'image-based') && (
          <div className={styles.winnerImageContainer}>
            <img 
              src={data.winner.profileImage || '/default-avatar.png'} 
              alt={data.winner.name}
              className={styles.winnerImage} 
            />
            <div className={styles.medalIcon}>
              <FaMedal />
            </div>
          </div>
        )}
        
        <div className={styles.winnerInfo}>
          <h3>{data.winner.name}</h3>
          <p className={styles.voteCount}>
            <strong>{data.winner.votes}</strong> {t('elections.votes')}
            {data.totalVotes > 0 && (
              <span className={styles.votePercentage}>
                {t('winnersGallery.votePercentage', { percentage: Math.round((data.winner.votes / data.totalVotes) * 100) })}
              </span>
            )}
          </p>
        </div>
      </div>
      
      <Link to={`/elections/${data.election._id}`} className={styles.detailsButton}>
        {t('winnersGallery.viewFullResults')}
      </Link>
    </div>
  );

  // Helper to get friendly name for election type
  const getElectionTypeName = (type) => {
    switch (type) {
      case 'candidate-based': return t('winnersGallery.electionTypes.candidateBased');
      case 'yes-no': return t('winnersGallery.electionTypes.yesNo');
      case 'rating': return t('winnersGallery.electionTypes.rating');
      case 'image-based': return t('winnersGallery.electionTypes.imageBased');
      default: return t('winnersGallery.electionTypes.unknown');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>{t('winnersGallery.loading')}</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className={styles.errorContainer}>
          <h2>{t('winnersGallery.error')}</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            {t('winnersGallery.tryAgain')}
          </button>
        </div>
      </>
    );
  }

  if (winners.length === 0) {
    return (
      <>
        <Navbar />
        <div className={styles.pageContainer}>
          <h1 className={styles.pageTitle}>{t('elections.results')}</h1>
          <div className={styles.noResultsContainer}>
            <FaTrophy className={styles.noResultsIcon} />
            <h2>{t('winnersGallery.noCompletedElections')}</h2>
            <p>{t('winnersGallery.noCompletedElectionsDesc')}</p>
            <Link to="/elections" className={styles.browseButton}>
              {t('winnersGallery.browseActiveElections')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>{t('winnersGallery.pageTitle')}</h1>
        <p className={styles.pageDescription}>
          {t('winnersGallery.pageDescription')}
        </p>

        {/* Filter Bar */}
        <div className={`${styles.filterBar} ${isFilterExpanded ? styles.expanded : ''}`}>
          <div className={styles.filterHeader} onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
            <div className={styles.filterTitle}>
              <FaFilter /> 
              <span>{t('winnersGallery.filterResults')}</span>
              {filteredWinners.length !== winners.length && (
                <span className={styles.filterCount}>
                  {filteredWinners.length}/{winners.length}
                </span>
              )}
            </div>
            {filters.electionType !== 'all' || filters.dateRange !== 'all' || filters.searchQuery.trim() ? (
              <button 
                className={styles.clearFiltersButton} 
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
              >
                <FaTimes /> {t('winnersGallery.clearFilters')}
              </button>
            ) : null}
          </div>
          
          <div className={styles.filterOptions}>
            <div className={styles.filterGroup}>
              <label>{t('winnersGallery.electionType')}</label>
              <select 
                value={filters.electionType} 
                onChange={(e) => handleFilterChange('electionType', e.target.value)}
              >
                <option value="all">{t('winnersGallery.allTypes')}</option>
                <option value="candidate-based">{t('winnersGallery.candidateBased')}</option>
                <option value="yes-no">{t('winnersGallery.yesNo')}</option>
                <option value="rating">{t('winnersGallery.rating')}</option>
                <option value="image-based">{t('winnersGallery.imageBased')}</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>{t('winnersGallery.timePeriod')}</label>
              <select 
                value={filters.dateRange} 
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="all">{t('winnersGallery.allTime')}</option>
                <option value="last30days">{t('winnersGallery.last30Days')}</option>
                <option value="last90days">{t('winnersGallery.last90Days')}</option>
                <option value="lastyear">{t('winnersGallery.lastYear')}</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>{t('winnersGallery.search')}</label>
              <div className={styles.searchInputContainer}>
                <input 
                  type="text" 
                  value={filters.searchQuery} 
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  placeholder={t('winnersGallery.searchPlaceholder')}
                />
                <FaSearch className={styles.searchIcon} />
              </div>
            </div>
          </div>
        </div>

        {/* Display message when no results match filters */}
        {filteredWinners.length === 0 && (
          <div className={styles.noFilterResultsContainer}>
            <h3>{t('winnersGallery.noMatchingResults')}</h3>
            <p>{t('winnersGallery.adjustFilters')}</p>
            <button onClick={clearFilters} className={styles.clearFilterButton}>
              {t('winnersGallery.clearAllFilters')}
            </button>
          </div>
        )}

        {/* Display sections for each election type */}
        {getOrderedElectionTypes().map(type => {
          const typeWinners = getWinnersByType(type);
          if (typeWinners.length === 0) return null;
          
          return (
            <div key={type} className={styles.electionTypeSection}>
              <h2 className={styles.sectionTitle}>{getElectionTypeName(type)}</h2>
              <div className={styles.winnersGrid}>
                {typeWinners.map(data => renderWinnerCard(data))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ElectionWinnersPage; 