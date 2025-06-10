import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
// Import styles if needed
// import styles from './NotFoundPage.module.css';

function NotFoundPage() {
  return (
    <div /* className={styles.pageContainer} */ >
      <Navbar />
      <main style={{ padding: '2rem 6%', textAlign: 'center' }}> {/* Basic padding and centering */}
        <h1>404 - Page Not Found</h1>
        <p>Oops! The page you are looking for does not exist.</p>
        <Link to="/">Go back to Home</Link>
      </main>
      <Footer />
    </div>
  );
}

export default NotFoundPage;