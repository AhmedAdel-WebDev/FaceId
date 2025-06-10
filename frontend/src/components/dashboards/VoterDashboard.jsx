import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Dashboard.module.css';
import statsService from '../../services/statsService';
import { FaVoteYea, FaUserCircle, FaHistory } from 'react-icons/fa';

function VoterDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await statsService.getVoterStats();
        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.message || t('dashboard.fetchStatsFailed', 'Failed to fetch stats'));
        }
      } catch (err) {
        setError(err.message || t('dashboard.errorFetchingStats', 'An error occurred while fetching stats.'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [t]);

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.dashboardTitle}>{t('dashboard.voterDashboard', 'Voter Dashboard')}</h2>
      <p className={styles.welcomeMessage}>{t('dashboard.voterWelcome', 'View active elections and cast your vote securely. Track your voting history and manage your profile.')}</p>

      {/* Stats Section */}
      <div className={styles.statsGrid}>
        {loading ? (
          <p className={styles.loadingText}>{t('dashboard.loadingStats', 'Loading your voting statistics...')}</p>
        ) : error ? (
          <div className={styles.errorText}>{error}</div>
        ) : (
          <>
            <div className={styles.statCard}>
              <h4>{stats?.electionsVotedIn ?? 0}</h4>
              <p>{t('dashboard.electionsVotedIn', 'Elections Voted In')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats?.activeElectionsCount ?? 0}</h4>
              <p>{t('dashboard.currentActiveElections', 'Current Active Elections')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats?.upcomingElections ?? 0}</h4>
              <p>{t('dashboard.upcomingElections', 'Upcoming Elections')}</p>
            </div>
          </>
        )}
      </div>

      {/* Action Grid */}
      <div className={styles.actionGrid}>
        <Link to="/elections" className={styles.actionCard}>
          <div className={styles.actionIcon}>
            <FaVoteYea />
          </div>
          <h3>{t('dashboard.voteNow', 'Vote Now')}</h3>
          <p>{t('dashboard.voteNowDesc', 'View active elections and cast your vote')}</p>
        </Link>
        
        <Link to="/profile" className={styles.actionCard}>
          <div className={styles.actionIcon}>
            <FaUserCircle />
          </div>
          <h3>{t('dashboard.manageProfile', 'Manage Profile')}</h3>
          <p>{t('dashboard.manageProfileDesc', 'Update your personal information')}</p>
        </Link>
        
        <Link to="/my-votes" className={styles.actionCard}>
          <div className={styles.actionIcon}>
            <FaHistory />
          </div>
          <h3>{t('dashboard.votingHistory', 'Voting History')}</h3>
          <p>{t('dashboard.votingHistoryDesc', 'View your past votes and election results')}</p>
        </Link>
      </div>
    </div>
  );
}

export default VoterDashboard;