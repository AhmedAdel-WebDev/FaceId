import React from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext.jsx'; // Use .jsx extension
import VoterDashboard from '../components/dashboards/VoterDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import CandidateDashboard from '../components/dashboards/CandidateDashboard'; // Assuming you have this role
import styles from './DashboardPage.module.css'; // Add styles for the page container

function DashboardPage() {
  const { t } = useTranslation(); // Initialize translation function
  const { user } = useAuth();

  const renderDashboard = () => {
    if (!user) {
      // This shouldn't happen if PrivateRoute is working, but good to handle
      return <p>{t('dashboard.loading', 'Loading user data or not logged in...')}</p>;
    }

    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'voter':
        return <VoterDashboard />;
      case 'candidate': // Add other roles as needed
         return <CandidateDashboard />;
      default:
        // Fallback for unknown roles or if role is not set
        return <p>{t('dashboard.unknownRole', 'Welcome, {{name}}! Your role is not recognized for a specific dashboard.', { name: user.name })}</p>;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <h1 className={styles.pageTitle}>{t('dashboard.title', 'Dashboard')}</h1>
        <p className={styles.welcomeUser}>{t('dashboard.welcome', 'Welcome back, {{name}}!', { name: user?.name || t('common.user', 'User') })}</p>
        {renderDashboard()}
      </main>
      <Footer />
    </div>
  );
}

export default DashboardPage;