import React from 'react';
import { Link } from 'react-router-dom';
import { FaGithub, FaLinkedin, FaEnvelope, FaPhone } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <h3>{t('footer.about')}</h3>
          <p>{t('footer.description')}</p>
        </div>

        <div className={styles.footerSection}>
          <h3>{t('footer.quickLinks')}</h3>
          <ul>
            <li><Link to="/">{t('navbar.home')}</Link></li>
            <li><Link to="/elections">{t('navbar.elections')}</Link></li>
            <li><Link to="/policy">{t('footer.policy')}</Link></li>
            <li><Link to="/help">{t('footer.helpCenter')}</Link></li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3>{t('footer.contactUs')}</h3>
          <ul className={styles.contactList}>
            <li><FaEnvelope /> support@votechain.com</li>
            <li><FaPhone /> +1 (555) 123-4567</li>
          </ul>
        </div>

        <div className={styles.footerSection}>
          <h3>{t('footer.connectWithUs')}</h3>
          <div className={styles.socialLinks}>
            <a href="https://github.com/votechain" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub />
            </a>
            <a href="https://linkedin.com/company/votechain" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin />
            </a>
          </div>
        </div>
      </div>
      
      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} {t('footer.copyright')}</p>
        <div className={styles.footerLinks}>
          <Link to="/privacy">{t('footer.privacyPolicy')}</Link>
          <Link to="/terms">{t('footer.termsOfService')}</Link>
          <Link to="/policy">{t('footer.platformPolicy')}</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;