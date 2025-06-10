import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ElectionCard.module.css';

/**
 * Example component for displaying an election card
 * This is a demonstration component that shows the styled election card
 */
function ExampleElectionCard() {
  const { t } = useTranslation();
  // Add state for timer
  const [timeRemaining, setTimeRemaining] = useState('');
  
  // Mock election data
  const election = {
    _id: 'example-election-id',
    title: 'Annual Board Member Selection',
    description: 'Vote for new board members who will represent our community for the next fiscal year. Each voter may select up to three candidates from the approved list.',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    status: 'active',
    electionType: 'candidate-based',
    candidates: [{ name: 'John Doe' }, { name: 'Jane Smith' }]
  };
  
  // Calculate and update time remaining
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(election.endDate);
      
      // If election is already over or cancelled
      if (election.status === 'completed' || 
          election.status === 'cancelled' || 
          now > endDate) {
        return t('myVotes.completed');
      }
      
      // If election hasn't started yet
      const startDate = new Date(election.startDate);
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

    // Set initial time remaining
    setTimeRemaining(calculateTimeRemaining());

    // Update timer every minute for demo
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 60000);

    return () => clearInterval(timer);
  }, [election, t]);
  
  // Format date to display in card
  const formatDate = (date) => {
    if (!date) return t('common.notAvailable', 'N/A');
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status based on dates
  const getStatus = () => {
    const now = new Date();
    if (election.status === 'cancelled') return 'cancelled';
    if (election.status === 'completed') return 'completed';
    if (now < new Date(election.startDate)) return 'upcoming';
    if (now > new Date(election.endDate)) return 'completed';
    return 'active';
  };

  const status = getStatus();
  const statusClass = styles[status.toLowerCase()] || styles.defaultStatus;

  // Display election type in a user-friendly format
  const getElectionTypeDisplay = (type) => {
    switch (type) {
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
  };

  // Truncate description with ellipsis if longer than 100 chars
  const truncateDescription = (text, maxLength = 100) => {
    if (!text) return t('elections.noDescription', 'No description available.');
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>{election.title}</h3>
        <button 
          className={`${styles.bookmarkButton}`}
          title={t('elections.bookmark', 'Add to bookmarks')}
          aria-label={t('elections.bookmark', 'Add to bookmarks')}
        >
          ☆
        </button>
      </div>
      <p className={styles.description}>
        {truncateDescription(election.description)}
      </p>
      <div className={styles.details}>
        <span>{t('elections.startDate')}: {formatDate(election.startDate)}</span>
        <span>{t('elections.endDate')}: {formatDate(election.endDate)}</span>
      </div>
      <div className={styles.countdownTimer}>
        <div className={styles.timerIcon}></div>
        <span>{timeRemaining}</span>
      </div>
      <div className={styles.typeDisplay}>
        {t('elections.electionType')}: {getElectionTypeDisplay(election.electionType)}
      </div>
      <div className={styles.footer}>
        <span className={`${styles.status} ${statusClass}`}>{t(`elections.${status}`, status)}</span>
        <Link to={`/elections/example`} className={styles.detailsButton}>
          {t('elections.details', 'View Details')}
        </Link>
      </div>
    </div>
  );
}

export default ExampleElectionCard; 