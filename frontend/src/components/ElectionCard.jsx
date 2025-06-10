import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, getStatus } from '../utils/dateUtils.js'; // Import getStatus
import electionService from '../services/electionService';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import styles from './ElectionCard.module.css';

// Remove the local formatDate helper function
// const formatDate = (dateString) => { ... };

// Remove the local getStatus helper function
// const getStatus = (startDate, endDate) => { ... };

function ElectionCard({ election, isBookmarked: initialIsBookmarked = false, onBookmarkChange }) {
    const { t } = useTranslation(); // Initialize translation function
    const { isAuthenticated } = useAuth();
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
    const [bookmarkLoading, setBookmarkLoading] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');

    // Update local state whenever the prop changes
    useEffect(() => {
        setIsBookmarked(initialIsBookmarked);
    }, [initialIsBookmarked]);

    // Calculate and update time remaining
    useEffect(() => {
        if (!election) return;

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

        // Update timer every minute
        const timer = setInterval(() => {
            setTimeRemaining(calculateTimeRemaining());
        }, 60000);

        return () => clearInterval(timer);
    }, [election, t]);

    if (!election) {
        return null; // Don't render if no election data
    }

    // Pass election.status as the third argument to the imported getStatus
    const status = getStatus(election.startDate, election.endDate, election.status);
    const statusClass = styles[status.toLowerCase()] || styles.defaultStatus; // e.g., styles.active, styles.upcoming

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

    const handleBookmarkToggle = async (e) => {
        e.preventDefault(); // Prevent navigating to details page
        
        if (!isAuthenticated) {
            alert(t('auth.loginRequired', 'Please log in to bookmark elections'));
            return;
        }

        try {
            setBookmarkLoading(true);
            
            const newBookmarkState = !isBookmarked;
            
            if (isBookmarked) {
                await electionService.removeBookmark(election._id);
            } else {
                await electionService.bookmarkElection(election._id);
            }
            
            // Update local state immediately
            setIsBookmarked(newBookmarkState);
            
            // Notify parent component if callback provided
            if (onBookmarkChange) {
                onBookmarkChange(election._id, newBookmarkState);
            }
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
            alert(error.message || t('elections.bookmarkFailed', 'Failed to update bookmark'));
        } finally {
            setBookmarkLoading(false);
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
                <h3 className={styles.title}>{election.title || t('elections.untitledElection', 'Untitled Election')}</h3>
                {isAuthenticated && (
                    <button 
                        className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
                        onClick={handleBookmarkToggle}
                        disabled={bookmarkLoading}
                        title={isBookmarked ? t('elections.unbookmark') : t('elections.bookmark')}
                        aria-label={isBookmarked ? t('elections.unbookmark') : t('elections.bookmark')}
                    >
                        {bookmarkLoading ? "..." : (isBookmarked ? "★" : "☆")}
                    </button>
                )}
            </div>
            <p className={styles.description}>
                {truncateDescription(election.description)}
            </p>
            <div className={styles.details}>
                {/* Use the imported formatDate */}
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
                 <span className={`${styles.status} ${statusClass}`}>{t(`elections.${status.toLowerCase()}`, status)}</span>
                 <Link to={`/elections/${election._id}`} className={styles.detailsButton}>
                    {t('elections.details')}
                 </Link>
            </div>
        </div>
    );
}

export default ElectionCard;