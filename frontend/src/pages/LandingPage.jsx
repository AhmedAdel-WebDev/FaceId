import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
// --- EDIT: Update icons if needed, FaLock might be more relevant ---
import { FaLock, FaUsers, FaChartBar, FaUserCheck } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './LandingPage.module.css';
import useIntersectionObserver from '../hooks/useIntersectionObserver';

function LandingPage() {
  const { t, i18n } = useTranslation(); // Initialize translation function and i18n
  const navigate = useNavigate();
  const [heroRef, isHeroVisible] = useIntersectionObserver();
  const [featuresRef, isFeaturesVisible] = useIntersectionObserver();
  const [aboutRef, isAboutVisible] = useIntersectionObserver();
  const [developersRef, isDevelopersVisible] = useIntersectionObserver();

  // Updated image URLs
  const heroImageUrl = "/images/digital-voting.jpg";
  const aboutImageUrl = "/images/facial-recognition-woman.jpg";

  // Placeholder developer data
  const developers = [
    { id: 1, name: "Ahmed Adel", description: "Leader of the team and Full Stack Developer Mainly Backend", imageUrl: "/images/Formal me.png" },
    { id: 2, name: "Abdelhameed Mohamed", description: "Specialist in Backend Development using Express.js", imageUrl: "/images/WhatsApp Image 2025-06-08 at 12.06.06_11999efe.jpg" },
    // --- EDIT: Update developer description ---
    { id: 3, name: "Beshoy Basem", description: "Specialist in Frontend Development using React", imageUrl: "/images/image.png" },
    { id: 4, name: "Eman Atif", description: "UI/UX Designer expert and Frontend Developer", imageUrl: "/images/WhatsApp Image 2025-06-08 at 12.17.19_6c417383.jpg" },
    { id: 5, name: "Essameldien Mohamed", description: "AI Engineer specializing in facial recognition algorithms and computer vision", imageUrl: "/images/team-member-5.jpg" },
    { id: 6, name: "Dana Ahmed", description: "Machine Learning Expert focused on biometric authentication systems", imageUrl: "/images/team-member-6.jpg" },
    { id: 7, name: "Mohamed Gamal", description: "AI Security Specialist and Deep Learning Researcher", imageUrl: "/images/team-member-7.jpg" },
  ];

  // Function to handle button click
  const handleExploreClick = () => {
    navigate('/elections'); // Navigate to the login page
  };

  // Check if current language is RTL
  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className={styles.landingPage}>
      <Navbar />
      <main>
        <section 
          ref={heroRef} 
          className={`${styles.hero} ${isHeroVisible ? styles.visible : ''}`}
        >
          {/* Add animated shapes */}
          <div className={`${styles.animatedShape} ${styles.shape1}`}></div>
          <div className={`${styles.animatedShape} ${styles.shape2}`}></div>
          <div className={`${styles.animatedShape} ${styles.shape3}`}></div>
          
          {/* Existing hero content */}
          <div className={styles.heroContent}>
            {/* --- EDIT: Update heading and paragraph --- */}
            <h1>{t('landing.welcome')}</h1>
            <p>
              {t('landing.subtitle')}
            </p>
            {/* Note: Using ctaButton and large classes from LandingPage.module.css */}
            {/* --- EDIT START --- */}
            {/* Add onClick handler */}
            <button
              className={`${styles.ctaButton} ${styles.large}`}
              onClick={handleExploreClick}
              dir="ltr"
            >
              {t('landing.viewAll')}
            </button>
            {/* --- EDIT END --- */}
          </div>
          <div className={styles.heroImageContainer}>
            {/* Digital voting image */}
            <img src={heroImageUrl} alt={t('landing.heroImageAlt', 'Secure Digital Voting')} className={styles.heroImage} />
          </div>
        </section>

        {/* Updated Features Section */}
        <section 
          ref={featuresRef} 
          className={`${styles.features} ${isFeaturesVisible ? styles.visible : ''}`}
        >
          {/* --- EDIT: Update section title and subtitle --- */}
          <h2>{t('landing.whyChooseUs', 'Why Choose VoteChain?')}</h2>
          <p className={styles.subtitle}> {/* Added subtitle class */}
            {t('landing.featureSubtitle', 'Log in faster and more securely with cutting-edge biometric authentication.')}
          </p>
          <div className={styles.featureList}>
            {/* Feature Item 1 */}
            <div className={styles.featureItem}>
              <div className={styles.featureIconWrapper}>
                {/* --- EDIT: Update icon --- */}
                <FaLock className={styles.featureIcon} />
              </div>
              {/* --- EDIT: Update feature title and description --- */}
              <h3>{t('landing.feature1Title', 'Secure Biometric Login')}</h3>
              <p>{t('landing.feature1Desc', 'Your unique facial features provide robust security against unauthorized access.')}</p>
            </div>
            {/* Feature Item 2 */}
            <div className={styles.featureItem}>
              <div className={styles.featureIconWrapper}>
                <FaUsers className={styles.featureIcon} />
              </div>
              {/* --- EDIT: Update feature description slightly --- */}
              <h3>{t('landing.feature2Title', 'Accessible & User-Friendly')}</h3>
              <p>{t('landing.feature2Desc', 'Intuitive interface designed for quick and easy authentication across devices.')}</p>
            </div>
            {/* Feature Item 3 */}
            <div className={styles.featureItem}>
              <div className={styles.featureIconWrapper}>
                {/* --- EDIT: Update icon and feature --- */}
                <FaUserCheck className={styles.featureIcon} />
              </div>
              <h3>{t('landing.feature3Title', 'Change Password easily')}</h3>
              <p>{t('landing.feature3Desc', 'Change password in seconds with your unique facial features.')}</p>
            </div>
             {/* Feature Item 4 (Example) */}
            <div className={styles.featureItem}>
              <div className={styles.featureIconWrapper}>
                {/* --- EDIT: Update icon and feature --- */}
                <FaChartBar className={styles.featureIcon} /> {/* Or another relevant icon */}
              </div>
              <h3>{t('landing.feature4Title', 'Reliable Performance')}</h3>
              <p>{t('landing.feature4Desc', 'Built with advanced algorithms for accurate and dependable face recognition.')}</p>
            </div>
          </div>
        </section>

        {/* Updated About Section */}
        <section 
          ref={aboutRef} 
          className={`${styles.about} ${isAboutVisible ? styles.visible : ''}`}
        >
           {/* --- EDIT: Update section title --- */}
           <h2>{t('landing.aboutTitle', 'About Our Face ID System')}</h2>
           <div className={styles.aboutContent}>
             <div className={styles.aboutText}>
               <p>
                 {/* --- EDIT: Update paragraph --- */}
                 {t('landing.aboutPara1', 'Our platform was founded on the principle that user authentication deserves the highest level of security and convenience. We believe technology can empower users and build trust in digital interactions.')}
               </p>
               <p>
                 {/* --- EDIT: Update paragraph --- */}
                 {t('landing.aboutPara2', 'Our system utilizes cutting-edge facial recognition and security techniques to create an authentication process that is not only secure but also fast and easy to use. We are committed to continuous improvement and protecting user privacy.')}
               </p>
             </div>
             <div className={styles.aboutImageContainer}>
               {/* Use the woman face recognition image */}
               <img src={aboutImageUrl} alt={t('landing.teamImageAlt', 'Facial Recognition Technology')} className={styles.aboutImage} />
             </div>
           </div>
        </section>

        {/* --- START NEW SECTION --- */}
        <section 
          ref={developersRef} 
          className={`${styles.developers} ${isDevelopersVisible ? styles.visible : ''}`}
        >
          {/* --- EDIT: Update section title and subtitle --- */}
          <h2>{t('landing.teamTitle', 'Meet the Team')}</h2>
          <p className={styles.subtitle}>{t('landing.teamSubtitle', 'The minds behind the secure Face ID login system.')}</p>
          <div className={styles.developerList}>
            {developers.map(dev => (
              <div key={dev.id} className={styles.developerCard}>
                <img src={dev.imageUrl} alt={`${t('landing.developer')} ${dev.name}`} className={styles.developerImage} />
                <h4 className={styles.developerName}>{dev.name}</h4>
                <p className={styles.developerDescription}>{dev.description}</p>
              </div>
            ))}
          </div>
        </section>
        {/* --- END NEW SECTION --- */}

      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;