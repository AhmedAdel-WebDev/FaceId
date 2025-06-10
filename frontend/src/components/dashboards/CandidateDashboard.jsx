import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import styles from './Dashboard.module.css';
import statsService from '../../services/statsService'; // Import the service

function CandidateDashboard() {
  const { t } = useTranslation(); // Initialize translation function
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await statsService.getCandidateStats();
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
      <h2 className={styles.dashboardTitle}>{t('dashboard.candidateDashboard', 'Candidate Dashboard')}</h2>
      <p className={styles.welcomeMessage}>{t('dashboard.candidateWelcome', 'Track your campaigns and view election results.')}</p>

      {/* Stats Section */}
      <div className={styles.statsGrid}>
        {loading && <p>{t('common.loading', 'Loading stats...')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}
        {stats && !loading && !error && (
          <>
            <div className={styles.statCard}>
              <h4>{stats.electionsAppliedTo ?? 'N/A'}</h4>
              <p>{t('dashboard.applicationsSubmitted', 'Applications Submitted')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.electionsApprovedFor ?? 'N/A'}</h4>
              <p>{t('dashboard.approvedCampaigns', 'Approved Campaigns')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.activeCampaigns ?? 'N/A'}</h4>
              <p>{t('dashboard.activeCampaigns', 'Active Campaigns')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.totalVotesReceived ?? 'N/A'}</h4>
              <p>{t('dashboard.totalVotesReceived', 'Total Votes Received')}</p>
            </div>
          </>
        )}
      </div>

      {/* Action Grid */}
      <div className={styles.actionGrid}>
         <Link to="/my-applications" className={styles.actionCard}>
            <h3>{t('dashboard.myApplications', 'My Applications')}</h3>
            <p>{t('dashboard.myApplicationsDesc', 'View and track all your election applications.')}</p>
         </Link>
         <Link to="/elections" className={styles.actionCard}>
            <h3>{t('dashboard.viewElections', 'View Elections')}</h3>
            <p>{t('dashboard.viewElectionsDesc', 'See elections you can apply to or are participating in.')}</p>
         </Link>
         <Link to="/profile" className={styles.actionCard}>
             <h3>{t('dashboard.yourProfile', 'Your Profile')}</h3>
             <p>{t('dashboard.yourProfileDesc', 'View and manage your candidate profile.')}</p>
         </Link>
         <Link to="/my-votes" className={styles.actionCard}>
            <h3>{t('dashboard.myVotingHistory', 'My Voting History')}</h3>
            <p>{t('dashboard.myVotingHistoryDesc', 'View elections you\'ve voted in and your choices.')}</p>
         </Link>
         {/* Add more candidate-specific links/info here */}
         <div className={`${styles.actionCard} ${styles.placeholderCard}`}>
            <h3>{t('dashboard.campaignPerformance', 'Campaign Performance')}</h3>
            <p>{t('dashboard.campaignPerformanceDesc', '(Coming Soon) View results and statistics per election.')}</p>
         </div>
      </div>
    </div>
  );
}

export default CandidateDashboard;