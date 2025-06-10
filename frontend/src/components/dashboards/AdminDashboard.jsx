import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import styles from './Dashboard.module.css'; // Shared dashboard styles
import statsService from '../../services/statsService'; // Import the service

function AdminDashboard() {
  const { t } = useTranslation(); // Initialize translation function
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await statsService.getAdminStats();
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
      <h2 className={styles.dashboardTitle}>{t('dashboard.adminDashboard', 'Admin Dashboard')}</h2>
      <p className={styles.welcomeMessage}>{t('dashboard.adminWelcome', 'Manage elections, users, and system settings.')}</p>

      {/* Stats Section */}
      <div className={styles.statsGrid}>
        {loading && <p>{t('common.loading', 'Loading stats...')}</p>}
        {error && <p className={styles.errorText}>{error}</p>}
        {stats && !loading && !error && (
          <>
            <div className={styles.statCard}>
              <h4>{stats.totalElections ?? 'N/A'}</h4>
              <p>{t('dashboard.totalElections', 'Total Elections')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.activeElections ?? 'N/A'}</h4>
              <p>{t('dashboard.activeElections', 'Active Elections')}</p>
            </div>
             <div className={styles.statCard}>
              <h4>{stats.pendingElections ?? 'N/A'}</h4>
              <p>{t('dashboard.pendingElections', 'Pending Elections')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.totalPendingApplications ?? 'N/A'}</h4>
              <p>{t('dashboard.pendingApplications', 'Pending Applications')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.totalUsers ?? 'N/A'}</h4>
              <p>{t('dashboard.totalUsers', 'Total Users')}</p>
            </div>
            <div className={styles.statCard}>
              <h4>{stats.totalVoters ?? 'N/A'}</h4>
              <p>{t('dashboard.voters', 'Voters')}</p>
            </div>
             <div className={styles.statCard}>
              <h4>{stats.totalCandidates ?? 'N/A'}</h4>
              <p>{t('dashboard.candidates', 'Candidates')}</p>
            </div>
             <div className={styles.statCard}>
              <h4>{stats.totalAdmins ?? 'N/A'}</h4>
              <p>{t('dashboard.admins', 'Admins')}</p>
            </div>
          </>
        )}
      </div>

      {/* Action Grid */}
      <div className={styles.actionGrid}>
         <Link to="/create-election" className={styles.actionCard}>
            <h3>{t('dashboard.createNewElection', 'Create New Election')}</h3>
            <p>{t('dashboard.createNewElectionDesc', 'Set up a new election process.')}</p>
         </Link>
         <Link to="/elections" className={styles.actionCard}>
             <h3>{t('dashboard.manageElections', 'Manage Elections')}</h3>
             <p>{t('dashboard.manageElectionsDesc', 'View, edit, or monitor existing elections.')}</p>
         </Link>
          <Link to="/profile" className={styles.actionCard}>
             <h3>{t('dashboard.yourProfile', 'Your Profile')}</h3>
             <p>{t('dashboard.adminProfileDesc', 'View and manage your admin profile.')}</p>
         </Link>
         {/* Replace placeholder with link to create user page */}
         <Link to="/admin/create-user" className={styles.actionCard}>
            <h3>{t('dashboard.createUser', 'Create User')}</h3>
            <p>{t('dashboard.createUserDesc', 'Register a new user account (voter, candidate, admin).')}</p>
         </Link>
         <Link to="/admin/user-management" className={styles.actionCard}>
            <h3>{t('dashboard.userManagement', 'User Management')}</h3>
            <p>{t('dashboard.userManagementDesc', 'View and manage all user accounts.')}</p>
         </Link>
          <div className={`${styles.actionCard} ${styles.placeholderCard}`}>
            <h3>{t('dashboard.systemSettings', 'System Settings')}</h3>
            <p>{t('dashboard.systemSettingsDesc', '(Coming Soon) Configure application settings.')}</p>
         </div>
      </div>
    </div>
  );
}

export default AdminDashboard;