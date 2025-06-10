import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ElectionForm from '../components/ElectionForm'; // Import the form component
import styles from './FormPage.module.css'; // Use shared form page styles
import { useTranslation } from 'react-i18next';

function CreateElectionPage() {
  // This page should be protected by an AdminRoute in App.jsx
  const { t } = useTranslation();

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <h1 className={styles.title}>{t('dashboard.createNewElection')}</h1>
        <p className={styles.subtitle}>{t('admin.fillElectionDetails')}</p>
        {/* Render the ElectionForm component */}
        <ElectionForm />
      </main>
      <Footer />
    </div>
  );
}

export default CreateElectionPage;