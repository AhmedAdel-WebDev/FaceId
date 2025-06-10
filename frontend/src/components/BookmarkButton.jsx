import React from 'react';
import { Link } from 'react-router-dom';
import styles from './BookmarkButton.module.css';

/**
 * A reusable button component for bookmarked content links
 * 
 * @param {Object} props Component props
 * @param {string} props.to Link destination
 * @param {string} props.text Button text (default: "View Bookmarked")
 * @param {string} props.className Additional class names
 * @param {Object} props.rest Additional props to pass to the Link component
 * @returns {JSX.Element} A Link styled as a bookmark button
 */
function BookmarkButton({ to, text = "View Bookmarked", className = "", ...rest }) {
  return (
    <Link 
      to={to} 
      className={`${styles.bookmarkButton} ${className}`}
      {...rest}
    >
      {text}
    </Link>
  );
}

export default BookmarkButton; 