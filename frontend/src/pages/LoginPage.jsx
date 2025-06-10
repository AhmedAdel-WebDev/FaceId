import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginForm from '../components/LoginForm'; // Import the form
import styles from './AuthPage.module.css'; // Create and use shared auth page styles

function LoginPage() {
  const { t } = useTranslation(); // Initialize translation function

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.formWrapper}> {/* Wrapper for centering/styling */}
          <h1 className={styles.title}>{t('auth.login')}</h1>
          <p className={styles.subtitle}>{t('auth.accessAccount', 'Access your VoteChain account.')}</p>
          <LoginForm />
          <p className={styles.linkText}>
            {t('auth.dontHaveAccount')} <Link to="/register">{t('auth.registerHere')}</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default LoginPage;