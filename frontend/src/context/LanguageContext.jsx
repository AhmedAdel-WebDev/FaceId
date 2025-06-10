import React, { createContext, useState, useContext, useEffect } from 'react';
import i18n from '../i18n';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  // Function to apply all direction-specific changes
  const applyDirectionChanges = (lang) => {
    const isRtl = lang === 'ar';
    // Set HTML dir attribute
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    // Add/remove RTL class
    if (isRtl) {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
    
    // Add inline style for critical direction-specific elements as a fallback
    // This helps when CSS classes aren't applied properly
    const style = document.getElementById('direction-critical-css') || document.createElement('style');
    style.id = 'direction-critical-css';
    style.textContent = `
      .filtersContainer { 
        display: flex !important; 
        flex-wrap: wrap !important;
        background-color: #1f2937 !important;
      }
      ${isRtl ? '[dir="rtl"]' : '[dir="ltr"]'} { display: block !important; }
    `;
    if (!document.getElementById('direction-critical-css')) {
      document.head.appendChild(style);
    }
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    localStorage.setItem('language', lang);
    applyDirectionChanges(lang);
  };

  useEffect(() => {
    // Initialize language from localStorage or browser preference
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      changeLanguage(savedLanguage);
    } else {
      // Apply direction changes even for default language
      applyDirectionChanges(language);
    }
    
    // Add an extra check after a slight delay to ensure direction is applied
    const timer = setTimeout(() => {
      if (!document.documentElement.dir) {
        applyDirectionChanges(language);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext; 