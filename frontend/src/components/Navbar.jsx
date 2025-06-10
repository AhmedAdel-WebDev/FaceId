import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Use .jsx extension
import { useLanguage } from '../context/LanguageContext.jsx'; // Import useLanguage hook
import { FaBars, FaTimes, FaChevronDown, FaUserCog, FaGlobe } from 'react-icons/fa'; // Added FaGlobe for language icon
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import styles from './Navbar.module.css';

function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const { language, changeLanguage } = useLanguage(); // Get language and changeLanguage function
    const { t } = useTranslation(); // Initialize translation function
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isElectionsDropdownOpen, setIsElectionsDropdownOpen] = useState(false);
    const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false); // Add state for language dropdown
    const electionsDropdownRef = useRef(null);
    const adminDropdownRef = useRef(null);
    const languageDropdownRef = useRef(null); // Add ref for language dropdown
    const mobileMenuRef = useRef(null); // Add ref for mobile menu
    const mobileMenuButtonRef = useRef(null); // Add ref for mobile menu button

    useEffect(() => {
        // Handle clicks outside of dropdowns
        function handleClickOutside(event) {
            if (electionsDropdownRef.current && !electionsDropdownRef.current.contains(event.target)) {
                setIsElectionsDropdownOpen(false);
            }
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
                setIsAdminDropdownOpen(false);
            }
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
                setIsLanguageDropdownOpen(false);
            }
            // Close mobile menu when clicking outside
            if (
                isMobileMenuOpen && 
                mobileMenuRef.current && 
                !mobileMenuRef.current.contains(event.target) &&
                mobileMenuButtonRef.current && 
                !mobileMenuButtonRef.current.contains(event.target)
            ) {
                setIsMobileMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMobileMenuOpen]);

    // Close mobile menu on window resize (if screen becomes larger)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isMobileMenuOpen]);

    const handleLogout = () => {
        logout();
        setIsMobileMenuOpen(false); // Close mobile menu on logout
        navigate('/login'); // Redirect to login page after logout
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
        // Close the dropdowns if mobile menu is toggled
        if (!isMobileMenuOpen) {
            setIsElectionsDropdownOpen(false);
            setIsAdminDropdownOpen(false);
            setIsLanguageDropdownOpen(false);
        }
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    }

    const toggleElectionsDropdown = (e) => {
        e.preventDefault(); // Prevent navigation
        setIsElectionsDropdownOpen(!isElectionsDropdownOpen);
        setIsAdminDropdownOpen(false); // Close admin dropdown when opening elections dropdown
        setIsLanguageDropdownOpen(false); // Close language dropdown
    };

    const toggleAdminDropdown = (e) => {
        e.preventDefault(); // Prevent navigation
        setIsAdminDropdownOpen(!isAdminDropdownOpen);
        setIsElectionsDropdownOpen(false); // Close elections dropdown when opening admin dropdown
        setIsLanguageDropdownOpen(false); // Close language dropdown
    };

    const toggleLanguageDropdown = (e) => {
        e.preventDefault(); // Prevent navigation
        setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
        setIsElectionsDropdownOpen(false); // Close elections dropdown
        setIsAdminDropdownOpen(false); // Close admin dropdown
    };

    // Helper function to render links, closing mobile menu on click
    const renderNavLink = (to, text) => (
        <NavLink
            to={to}
            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
            onClick={closeMobileMenu} // Close menu on navigation
        >
            {text}
        </NavLink>
    );

    // Render elections dropdown items
    const renderElectionsDropdownItems = () => (
        <div 
            ref={electionsDropdownRef}
            className={`${styles.dropdown} ${isElectionsDropdownOpen ? styles.show : ''}`}
        >
            <div className={styles.dropdownContent}>
                <NavLink 
                    to="/elections" 
                    className={styles.dropdownLink}
                    onClick={() => {
                        closeMobileMenu();
                        setIsElectionsDropdownOpen(false);
                    }}
                >
                    {t('navbar.allElections')}
                </NavLink>
                <NavLink 
                    to="/election-winners" 
                    className={styles.dropdownLink}
                    onClick={() => {
                        closeMobileMenu();
                        setIsElectionsDropdownOpen(false);
                    }}
                >
                    {t('navbar.winnersGallery')}
                </NavLink>
            </div>
        </div>
    );

    // Render admin dropdown items
    const renderAdminDropdownItems = () => (
        <div 
            ref={adminDropdownRef}
            className={`${styles.dropdown} ${isAdminDropdownOpen ? styles.show : ''}`}
        >
            <div className={styles.dropdownContent}>
                <NavLink 
                    to="/create-election" 
                    className={styles.dropdownLink}
                    onClick={() => {
                        closeMobileMenu();
                        setIsAdminDropdownOpen(false);
                    }}
                >
                    {t('navbar.createElection')}
                </NavLink>
                <NavLink 
                    to="/admin/user-management" 
                    className={styles.dropdownLink}
                    onClick={() => {
                        closeMobileMenu();
                        setIsAdminDropdownOpen(false);
                    }}
                >
                    {t('navbar.userManagement')}
                </NavLink>
            </div>
        </div>
    );

    // Render language dropdown items
    const renderLanguageDropdownItems = () => (
        <div 
            ref={languageDropdownRef}
            className={`${styles.dropdown} ${isLanguageDropdownOpen ? styles.show : ''}`}
        >
            <div className={styles.dropdownContent}>
                <button 
                    className={`${styles.dropdownLink} ${styles.languageButton} ${language === 'en' ? styles.activeLanguage : ''}`}
                    onClick={() => {
                        changeLanguage('en');
                        setIsLanguageDropdownOpen(false);
                        closeMobileMenu();
                    }}
                >
                    {t('language.english')}
                </button>
                <button 
                    className={`${styles.dropdownLink} ${styles.languageButton} ${language === 'ar' ? styles.activeLanguage : ''}`}
                    onClick={() => {
                        changeLanguage('ar');
                        setIsLanguageDropdownOpen(false);
                        closeMobileMenu();
                    }}
                >
                    {t('language.arabic')}
                </button>
            </div>
        </div>
    );

    return (
        <header className={styles.header}>
            <div className={styles.navContainer}>
                <Link to="/" className={styles.logo} onClick={closeMobileMenu}>
                    VoteChain
                </Link>

                {/* Mobile Menu Toggle Button */}
                <button ref={mobileMenuButtonRef} className={styles.mobileMenuButton} onClick={toggleMobileMenu}>
                    {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>

                {/* Navigation Links - Conditional Rendering */}
                <nav ref={mobileMenuRef} className={`${styles.nav} ${isMobileMenuOpen ? styles.navMobileOpen : ''}`}>
                    {/* Elections Dropdown */}
                    <div className={styles.dropdownContainer}>
                        <button 
                            className={`${styles.navLink} ${styles.dropdownTrigger}`}
                            onClick={toggleElectionsDropdown}
                        >
                            {t('navbar.elections')} <FaChevronDown className={styles.dropdownIcon} />
                        </button>
                        {renderElectionsDropdownItems()}
                    </div>

                    {renderNavLink("/policy", t('navbar.policy'))}

                    {/* Conditional Links based on Auth and Role */}
                    {!isAuthenticated ? (
                        <>
                            {renderNavLink("/login", t('navbar.login'))}
                            {renderNavLink("/register", t('navbar.register'))}
                        </>
                    ) : (
                        <>
                            {renderNavLink("/bookmarked", t('navbar.bookmarked'))}
                            {renderNavLink("/my-votes", t('navbar.myVotes'))}
                            {renderNavLink("/dashboard", t('navbar.dashboard'))}
                            {user?.role === 'candidate' && renderNavLink("/my-applications", t('navbar.myApplications'))}

                            {/* Admin Dropdown - only visible to admins */}
                            {user?.role === 'admin' && (
                                <div className={styles.dropdownContainer}>
                                    <button 
                                        className={`${styles.navLink} ${styles.dropdownTrigger} ${styles.adminButton}`}
                                        onClick={toggleAdminDropdown}
                                    >
                                        <FaUserCog className={styles.adminIcon} /> {t('navbar.admin')} <FaChevronDown className={styles.dropdownIcon} />
                                    </button>
                                    {renderAdminDropdownItems()}
                                </div>
                            )}
                            
                            {renderNavLink("/profile", t('navbar.profile'))}
                            <button onClick={handleLogout} className={styles.logoutButton}>
                                {t('navbar.logout')} ({user?.name})
                            </button>
                        </>
                    )}

                    {/* Language Dropdown */}
                    <div className={styles.dropdownContainer}>
                        <button 
                            className={`${styles.navLink} ${styles.dropdownTrigger} ${styles.languageSelector}`}
                            onClick={toggleLanguageDropdown}
                        >
                            <FaGlobe className={styles.languageIcon} /> {language === 'en' ? 'EN' : 'AR'} <FaChevronDown className={styles.dropdownIcon} />
                        </button>
                        {renderLanguageDropdownItems()}
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Navbar;