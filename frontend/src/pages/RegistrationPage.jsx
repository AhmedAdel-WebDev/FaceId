import React from 'react';
import Navbar from '../components/Navbar'; // Import Navbar
import RegistrationForm from '../components/RegistrationForm';
import styles from './AuthPage.module.css'; // Reusing styles from AuthPage for container

function RegistrationPage() {
    return (
        <>
            <Navbar />
        <div className={styles.authPageContainer}>
            <div className={styles.authFormWrapper}>
                {/* <h1>Register</h1> // Title is inside the form component */}
                <RegistrationForm />
            </div>
        </div>
        </>
    );
}

export default RegistrationPage;