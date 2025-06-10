import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import electionService from '../services/electionService';
import ViewButton from '../components/ViewButton';
import styles from './CandidateApplicationsPage.module.css';

function CandidateApplicationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await electionService.getMyApplications();
        setApplications(data);
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError(err.message || t('myApplications.fetchError', 'Failed to fetch your applications'));
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'candidate') {
      fetchApplications();
    } else {
      setError(t('myApplications.candidatesOnly', 'Only candidates can view this page'));
      setLoading(false);
    }
  }, [user, t]);

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return styles.approved;
      case 'Pending':
        return styles.pending;
      case 'Rejected / Not Found':
        return styles.rejected;
      default:
        return styles.unknown;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.contentContainer}>
          <header className={styles.pageHeader}>
            <h1>{t('navbar.myApplications', 'My Applications')}</h1>
            <p>{t('myApplications.manageTrack', 'Manage and track your election applications')}</p>
          </header>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loader}></div>
              <p>{t('myApplications.loading', 'Loading your applications...')}</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorMessage}>{error}</p>
              <Link to="/dashboard" className={styles.backLink}>{t('myApplications.returnToDashboard', 'Return to Dashboard')}</Link>
            </div>
          ) : applications.length === 0 ? (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyIcon}>📋</div>
              <h2>{t('myApplications.noApplicationsFound', 'No Applications Found')}</h2>
              <p>{t('myApplications.noApplications', 'You haven\'t applied to any elections yet.')}</p>
              <Link to="/elections" className={styles.actionButton}>{t('myApplications.viewAvailableElections', 'View Available Elections')}</Link>
            </div>
          ) : (
            <div className={styles.applicationsGrid}>
              {applications.map((app, index) => (
                <div key={index} className={styles.applicationCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.electionTitle}>{app.electionTitle}</h3>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(app.applicationStatus)}`}>
                      {t(`myApplications.status.${app.applicationStatus.toLowerCase().replace(/ /g, '')}`, app.applicationStatus)}
                    </span>
                  </div>
                  
                  <div className={styles.cardContent}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>{t('myApplications.electionStatus', 'Election Status')}:</span>
                      <span className={`${styles.infoValue} ${styles[app.electionStatus.toLowerCase()]}`}>
                        {t(`elections.${app.electionStatus.toLowerCase()}`, app.electionStatus)}
                      </span>
                    </div>
                    
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>{t('elections.startDate', 'Start Date')}:</span>
                      <span className={styles.infoValue}>
                        {new Date(app.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>{t('elections.endDate', 'End Date')}:</span>
                      <span className={styles.infoValue}>
                        {new Date(app.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.cardFooter}>
                    <ViewButton 
                      to={`/elections/${app.electionId}`}
                      text={t('myApplications.viewElection', 'View Election')}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default CandidateApplicationsPage; 