import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ViewButton.module.css';

/**
 * A reusable button component for viewing items (elections, applications, etc.)
 * 
 * @param {Object} props Component props
 * @param {string} props.to Link destination
 * @param {string} props.text Button text (default: will use translation key common.viewDetails)
 * @param {string} props.translationKey Optional translation key to override default
 * @param {string} props.className Additional class names
 * @param {Object} props.rest Additional props to pass to the Link component
 * @returns {JSX.Element} A Link styled as a button
 */
function ViewButton({ to, text, translationKey = "common.viewDetails", className = "", ...rest }) {
  const { t } = useTranslation();
  
  const buttonText = text || t(translationKey);
  
  return (
    <Link 
      to={to} 
      className={`${styles.viewButton} ${className}`}
      {...rest}
    >
      {buttonText}
    </Link>
  );
}

export default ViewButton; 