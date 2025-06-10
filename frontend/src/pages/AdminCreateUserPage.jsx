import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AdminCreateUserForm from '../components/AdminCreateUserForm'; // We will create this next
import styles from './AuthPage.module.css'; // Reuse auth page styles for consistency

function AdminCreateUserPage() {
  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
         <div className={styles.formWrapper}> {/* Wrapper for centering/styling */}
            <h1 className={styles.title}>Create New User</h1>
            <p className={styles.subtitle}>Register a new user account with a specific role.</p>
            <AdminCreateUserForm />
         </div>
      </main>
      <Footer />
    </div>
  );
}

export default AdminCreateUserPage;