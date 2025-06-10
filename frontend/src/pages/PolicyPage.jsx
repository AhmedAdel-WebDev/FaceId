import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './PolicyPage.module.css';
import { FaUserShield, FaVoteYea, FaClipboardCheck, FaLock, FaFileContract } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

function PolicyPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('user-conduct');
  const [showDebug, setShowDebug] = useState(false);

  // Enable debug mode with double click on page title
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  // Helper function to safely render list items from translations
  const renderListItems = (translationKey) => {
    const items = t(translationKey, { returnObjects: true });
    // Check if items is an array before mapping
    if (Array.isArray(items)) {
      return items.map((item, index) => (
        <li key={index}>{item}</li>
      ));
    }
    // Fallback if not an array
    return <li>{items}</li>;
  };

  // Track scroll position to update active section
  useEffect(() => {
    const sections = ['user-conduct', 'election-rules', 'voting-guidelines', 'privacy-policy', 'terms-of-service'];
    
    const handleScroll = () => {
      // Get all section elements with their positions
      const sectionElements = sections
        .map(id => {
          const element = document.getElementById(id);
          if (!element) return null;
          
          const rect = element.getBoundingClientRect();
          return {
            id,
            element,
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height
          };
        })
        .filter(Boolean); // Remove any null entries
      
      if (sectionElements.length === 0) return;
      
      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      
      // Use a position 30% down from the top of the viewport as our detection point
      const detectionPoint = viewportHeight * 0.3;
      
      // Find which section is at the detection point
      let activeId = null;
      
      // First check if any section is exactly at our detection point
      for (const section of sectionElements) {
        // If the section top is close to our detection point, or if
        // the detection point is within the top half of the section
        if (
          Math.abs(section.top - detectionPoint) < 50 || 
          (section.top < detectionPoint && detectionPoint < section.top + section.height/2)
        ) {
          activeId = section.id;
          break;
        }
      }
      
      // If no section was found at the detection point, find the section
      // that takes up the most viewport space
      if (!activeId) {
        let maxVisibleHeight = 0;
        
        for (const section of sectionElements) {
          // Calculate how much of the section is visible
          const visibleTop = Math.max(0, section.top);
          const visibleBottom = Math.min(viewportHeight, section.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          
          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            activeId = section.id;
          }
        }
      }
      
      // Only update if we found an active section
      if (activeId) {
        setActiveSection(activeId);
      }
    };
    
    // Add debounce to avoid excessive calculations
    let scrollTimeout;
    const debouncedHandleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 50);
    };
    
    window.addEventListener('scroll', debouncedHandleScroll);
    // Run once on mount with a delay to ensure the DOM is fully rendered
    setTimeout(handleScroll, 300);
    
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Handle click on navigation items
  const handleNavClick = (sectionId, event) => {
    setActiveSection(sectionId);
    
    // Smooth scroll with offset
    const element = document.getElementById(sectionId);
    if (element) {
      // Prevent default anchor behavior
      event.preventDefault();
      
      // Get the element's position
      const elementPosition = element.getBoundingClientRect().top;
      
      // Calculate the target position
      // Position the section about 1/4 of the way down from the top of the viewport
      // This ensures the section header is visible and the content is readable
      const viewportHeight = window.innerHeight;
      const offset = viewportHeight / 4;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      // Scroll to the element
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.sectionNav}>
          <a 
            href="#user-conduct" 
            className={`${styles.navItem} ${activeSection === 'user-conduct' ? styles.activeNav : ''}`}
            onClick={(event) => handleNavClick('user-conduct', event)}
          >
            <FaUserShield className={styles.navIcon} /> {t('policy.userConduct')}
          </a>
          <a 
            href="#election-rules" 
            className={`${styles.navItem} ${activeSection === 'election-rules' ? styles.activeNav : ''}`}
            onClick={(event) => handleNavClick('election-rules', event)}
          >
            <FaVoteYea className={styles.navIcon} /> {t('policy.electionRules')}
          </a>
          <a 
            href="#voting-guidelines" 
            className={`${styles.navItem} ${activeSection === 'voting-guidelines' ? styles.activeNav : ''}`}
            onClick={(event) => handleNavClick('voting-guidelines', event)}
          >
            <FaClipboardCheck className={styles.navIcon} /> {t('policy.votingGuidelines')}
          </a>
          <a 
            href="#privacy-policy" 
            className={`${styles.navItem} ${activeSection === 'privacy-policy' ? styles.activeNav : ''}`}
            onClick={(event) => handleNavClick('privacy-policy', event)}
          >
            <FaLock className={styles.navIcon} /> {t('policy.privacyPolicy')}
          </a>
          <a 
            href="#terms-of-service" 
            className={`${styles.navItem} ${activeSection === 'terms-of-service' ? styles.activeNav : ''}`}
            onClick={(event) => handleNavClick('terms-of-service', event)}
          >
            <FaFileContract className={styles.navIcon} /> {t('policy.termsOfService')}
          </a>
        </div>
        
        <div className={styles.policyContainer}>
          <h1 className={styles.pageTitle} onDoubleClick={toggleDebug}>{t('policy.pageTitle')}</h1>
          
          {showDebug && (
            <div className={styles.debugInfo}>
              Active section: <strong>{activeSection}</strong>
            </div>
          )}
          
          <section 
            id="user-conduct" 
            className={`${styles.policySection} ${activeSection === 'user-conduct' ? styles.sectionHighlight : ''}`}
          >
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><FaUserShield /></span>
              {t('policy.sections.userConduct.title')}
            </h2>
            <div className={styles.sectionContent}>
              <p>{t('policy.sections.userConduct.description')}</p>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.userConduct.respectfulBehavior')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.userConduct.respectfulBehaviorItems')}
              </ul>

              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.userConduct.accountSecurity')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.userConduct.accountSecurityItems')}
              </ul>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.userConduct.contentGuidelines')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.userConduct.contentGuidelinesItems')}
              </ul>
            </div>
          </section>
          
          <section 
            id="election-rules" 
            className={`${styles.policySection} ${activeSection === 'election-rules' ? styles.sectionHighlight : ''}`}
          >
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><FaVoteYea /></span>
              {t('policy.sections.electionRules.title')}
            </h2>
            <div className={styles.sectionContent}>
              <p>{t('policy.sections.electionRules.description')}</p>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.electionRules.electionCreation')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.electionRules.electionCreationItems')}
              </ul>

              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.electionRules.candidateRequirements')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.electionRules.candidateRequirementsItems')}
              </ul>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.electionRules.electionTypes')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.electionRules.electionTypesItems')}
              </ul>
            </div>
          </section>
          
          <section 
            id="voting-guidelines" 
            className={`${styles.policySection} ${activeSection === 'voting-guidelines' ? styles.sectionHighlight : ''}`}
          >
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><FaClipboardCheck /></span>
              {t('policy.sections.votingGuidelines.title')}
            </h2>
            <div className={styles.sectionContent}>
              <p>{t('policy.sections.votingGuidelines.description')}</p>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.votingGuidelines.voterEligibility')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.votingGuidelines.voterEligibilityItems')}
              </ul>

              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.votingGuidelines.votingProcess')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.votingGuidelines.votingProcessItems')}
              </ul>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.votingGuidelines.voteSecurity')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.votingGuidelines.voteSecurityItems')}
              </ul>
            </div>
          </section>
          
          <section 
            id="privacy-policy" 
            className={`${styles.policySection} ${activeSection === 'privacy-policy' ? styles.sectionHighlight : ''}`}
          >
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><FaLock /></span>
              {t('policy.sections.privacyPolicy.title')}
            </h2>
            <div className={styles.sectionContent}>
              <p>{t('policy.sections.privacyPolicy.description')}</p>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.privacyPolicy.dataCollection')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.privacyPolicy.dataCollectionItems')}
              </ul>

              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.privacyPolicy.dataSecurity')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.privacyPolicy.dataSecurityItems')}
              </ul>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.privacyPolicy.userRights')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.privacyPolicy.userRightsItems')}
              </ul>
            </div>
          </section>
          
          <section 
            id="terms-of-service" 
            className={`${styles.policySection} ${activeSection === 'terms-of-service' ? styles.sectionHighlight : ''}`}
          >
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><FaFileContract /></span>
              {t('policy.sections.termsOfService.title')}
            </h2>
            <div className={styles.sectionContent}>
              <p>{t('policy.sections.termsOfService.description')}</p>
              
              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.termsOfService.platformUse')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.termsOfService.platformUseItems')}
              </ul>

              <h3 className={styles.subSectionTitle}>
                {t('policy.sections.termsOfService.limitations')}
              </h3>
              <ul className={styles.policyList}>
                {renderListItems('policy.sections.termsOfService.limitationsItems')}
              </ul>
            </div>
          </section>
          
          <div className={styles.contactSection}>
            <h2>{t('policy.contact.title')}</h2>
            <p>{t('policy.contact.description')} <a href="mailto:support@votechain.com" className={styles.contactLink}>{t('policy.contact.email')}</a></p>
            <Link to="/" className={styles.returnButton}>{t('policy.contact.returnHome')}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default PolicyPage; 