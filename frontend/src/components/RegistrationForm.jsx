import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming useAuth will have a public register method
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import { useLanguage } from '../context/LanguageContext.jsx'; // Import useLanguage hook
import styles from './Form.module.css'; // Shared form styles
import Webcam from 'react-webcam'; // Import react-webcam
// Import icons
import { FaCamera, FaUserShield, FaLightbulb, FaCheck, FaAngleRight, FaSun, FaMoon, FaPortrait, FaStreetView } from 'react-icons/fa';

function RegistrationForm() {
    const { t } = useTranslation(); // Initialize translation function
    const { language } = useLanguage(); // Get current language
    const isRTL = language === 'ar'; // Check if current language is Arabic
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('voter'); // Default role
    const [dedicatedProfilePic, setDedicatedProfilePic] = useState(null); // For the single circular profile picture
    const [faceIdImages, setFaceIdImages] = useState([]); // Array of base64 strings from camera
    const [idNumber, setIdNumber] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { publicRegister: registerUser } = useAuth(); // Use publicRegister and alias it to registerUser for minimal changes in the component
    const navigate = useNavigate();
    const webcamRef = useRef(null);
    const dedicatedProfilePicInputRef = useRef(null); // Ref for dedicated profile pic input
    const cvFileInputRef = useRef(null); // Ref for CV file input

    const handleDedicatedProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDedicatedProfilePic(reader.result);
                setError('');
            };
            reader.onerror = () => {
                setError(t('auth.profilePicError', 'Failed to read profile picture.'));
                setDedicatedProfilePic(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const captureFaceIdImage = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                if (faceIdImages.length < 5) { // Limit to 5 images for example
                    setFaceIdImages(prev => [...prev, imageSrc]);
                    setError('');
                } else {
                    setError(t('auth.maxFaceImages', 'You can capture a maximum of 5 Face ID images.'));
                }
            }
        }
    };

    const removeFaceIdImage = (index) => {
        setFaceIdImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!dedicatedProfilePic) {
            setError(t('auth.profilePicRequired', 'Profile picture is required.'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('auth.passwordsNotMatch', 'Passwords do not match.'));
            return;
        }
        if (faceIdImages.length === 0) {
            setError(t('auth.faceIdRequired', 'At least one Face ID image is required.'));
            return;
        }
        if (!role) {
            setError(t('auth.roleRequired', 'Please select a role.'));
            return;
        }
        if (!cvFile) {
            setError(t('auth.cvRequired', 'CV/Resume file is required.'));
            return;
        }
        if (!phoneNumber) {
            setError(t('auth.phoneRequired', 'Phone number is required.'));
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', `${firstName} ${lastName}`);
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', role);

            // NEW: Append dedicated profile picture and all Face ID images under the 'profileImages' key
            // The backend expects 'profileImages' to be an array of base64 data URLs.
            // The first image in this array will be used as the primary profile picture.
            if (dedicatedProfilePic) { // This check is somewhat redundant due to earlier validation, but good for clarity
                formData.append('profileImages', dedicatedProfilePic);
            }
            faceIdImages.forEach((imgDataUrl) => {
                formData.append('profileImages', imgDataUrl);
            });

            formData.append('idNumber', idNumber);
            if (cvFile) {
                formData.append('cv', cvFile);
            }
            formData.append('birthDate', birthDate);
            formData.append('gender', gender);
            
            // Add address and phone fields (without zipCode)
            formData.append('street', street);
            formData.append('city', city);
            formData.append('state', state);
            formData.append('phoneNumber', phoneNumber);

            const response = await registerUser(formData);
            
            setSuccess(response.message || t('auth.registrationSuccess', 'Registration successful! Your account is pending admin approval.'));
            // Clear form
            setFirstName('');
            setLastName('');
            setUsername('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setRole('voter');
            setDedicatedProfilePic(null);
            setFaceIdImages([]);
            setIdNumber('');
            setCvFile(null);
            setBirthDate('');
            setGender('');
            setStreet('');
            setCity('');
            setState('');
            setPhoneNumber('');
            if (dedicatedProfilePicInputRef.current) {
                dedicatedProfilePicInputRef.current.value = '';
            }
            if (cvFileInputRef.current) {
                cvFileInputRef.current.value = '';
            }
            setShowCamera(false);
            // setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data?.error || err.message || t('auth.registrationFailed', 'Registration failed. Please try again.');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <div className={styles.formContainer}> 
            <form className={styles.form} onSubmit={handleSubmit}>
                <h2>{t('auth.registerTitle')}</h2>
                {error && <div className={`${styles.errorMessage} ${styles.error}`}>{error}</div>}
                {success && <div className={`${styles.successMessage} ${styles.success}`}>{success}</div>}

                <div className={`${styles.formGroup} ${styles.centerItem}`}>
                    <label htmlFor="reg-dedicatedProfilePic" className={styles.profilePicLabel}>
                        {dedicatedProfilePic ? (
                            <img src={dedicatedProfilePic} alt={t('auth.profilePreview', 'Profile Preview')} className={styles.profilePicPreview} />
                        ) : (
                            <div className={styles.profilePicPlaceholder}>{t('auth.uploadProfilePic', 'Click to upload Profile Picture')}</div>
                        )}
                    </label>
                    <input
                        type="file"
                        id="reg-dedicatedProfilePic"
                        accept="image/*"
                        onChange={handleDedicatedProfilePicChange}
                        ref={dedicatedProfilePicInputRef}
                        style={{ display: 'none' }} // Hide the default input
                        disabled={loading}
                    />
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label htmlFor="reg-firstName">{t('auth.firstName', 'First Name')}</label>
                        <input
                            type="text"
                            id="reg-firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            placeholder={t('auth.enterFirstName', 'Enter your first name')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-lastName">{t('auth.lastName', 'Last Name')}</label>
                        <input
                            type="text"
                            id="reg-lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            placeholder={t('auth.enterLastName', 'Enter your last name')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-username">{t('auth.username', 'Username')}</label>
                        <input
                            type="text"
                            id="reg-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.trim())}
                            required
                            placeholder={t('auth.chooseUsername', 'Choose a username')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-email">{t('auth.email')}</label>
                        <input
                            type="email"
                            id="reg-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder={t('auth.enterEmail', 'Enter your email')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-phoneNumber">
                            <span className={styles.labelIcon}>📱</span> {t('auth.phoneNumber', 'Phone Number')}
                        </label>
                        <input
                            type="tel"
                            id="reg-phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                            placeholder="+1 (XXX) XXX-XXXX"
                            disabled={loading}
                            className={styles.phoneInput}
                        />
                        <span className={styles.helperText}>{t('auth.includeCountryCode', 'Include country code (e.g., +1 for USA)')}</span>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-idNumber">{t('auth.idNumber', 'ID Number')}</label>
                        <input
                            type="text"
                            id="reg-idNumber"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            placeholder={t('auth.enterIdNumber', 'Enter your ID number')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-password">{t('auth.password')}</label>
                        <div className={styles.passwordInputContainer}>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="reg-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength="6"
                                placeholder={t('auth.createPassword', 'Create a password (min. 6 characters)')}
                                disabled={loading}
                                className={styles.passwordInput}
                                style={isRTL ? {
                                    paddingRight: '1rem',
                                    paddingLeft: '40px'
                                } : {}}
                            />
                            <button 
                                type="button" 
                                className={styles.passwordToggleBtn}
                                onClick={togglePasswordVisibility}
                                tabIndex="-1"
                                style={isRTL ? {
                                    right: 'auto',
                                    left: '10px'
                                } : {}}
                            >
                                {showPassword ? 
                                    <span className={styles.passwordIcon}>
                                        <svg viewBox="0 0 24 24">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    </span> : 
                                    <span className={styles.passwordIcon}>
                                        <svg viewBox="0 0 24 24">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </span>
                                }
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-confirmPassword">{t('auth.confirmPassword')}</label>
                        <div className={styles.passwordInputContainer}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="reg-confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength="6"
                                placeholder={t('auth.confirmYourPassword', 'Confirm your password')}
                                disabled={loading}
                                className={styles.passwordInput}
                                style={isRTL ? {
                                    paddingRight: '1rem',
                                    paddingLeft: '40px'
                                } : {}}
                            />
                            <button 
                                type="button" 
                                className={styles.passwordToggleBtn}
                                onClick={toggleConfirmPasswordVisibility}
                                tabIndex="-1"
                                style={isRTL ? {
                                    right: 'auto',
                                    left: '10px'
                                } : {}}
                            >
                                {showConfirmPassword ? 
                                    <span className={styles.passwordIcon}>
                                        <svg viewBox="0 0 24 24">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    </span> : 
                                    <span className={styles.passwordIcon}>
                                        <svg viewBox="0 0 24 24">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </span>
                                }
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-birthDate">{t('auth.birthDate', 'Birth Date')}</label>
                        <input
                            type="date"
                            id="reg-birthDate"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            required
                            disabled={loading}
                            className={styles.dateInput}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-gender">{t('auth.gender', 'Gender')}</label>
                        <select
                            id="reg-gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            disabled={loading}
                            className={styles.selectInput}
                        >
                            <option value="">{t('auth.selectGender', 'Select Gender')}</option>
                            <option value="male">{t('auth.male', 'Male')}</option>
                            <option value="female">{t('auth.female', 'Female')}</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-street">{t('auth.streetAddress', 'Street Address')}</label>
                        <input
                            type="text"
                            id="reg-street"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            required
                            placeholder={t('auth.enterStreet', 'Enter your street address')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-city">{t('auth.city', 'City')}</label>
                        <input
                            type="text"
                            id="reg-city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                            placeholder={t('auth.enterCity', 'Enter your city')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-state">{t('auth.state', 'State/Province')}</label>
                        <input
                            type="text"
                            id="reg-state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            required
                            placeholder={t('auth.enterState', 'Enter your state/province')}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-role">{t('auth.registerAs', 'Register as')}</label>
                        <select
                            id="reg-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                            disabled={loading}
                            className={styles.selectInput}
                        >
                            <option value="voter">{t('auth.voter', 'Voter')}</option>
                            <option value="candidate">{t('auth.candidate', 'Candidate')}</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="reg-cvFile">{t('auth.cvResume', 'CV/Resume')} <span style={{ color: '#e53e3e' }}>*</span></label>
                        <div className={styles.fileUploadWrapper}>
                            <div className={styles.fileUploadButton}>
                                <span className={styles.fileIcon}>📄</span> 
                                {cvFile ? t('auth.changeFile', 'Change File') : t('auth.chooseFile', 'Choose File')}
                            </div>
                            <input
                                type="file"
                                id="reg-cvFile"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setCvFile(e.target.files[0])}
                                ref={cvFileInputRef}
                                disabled={loading}
                                className={styles.fileInput}
                                required
                            />
                        </div>
                        {cvFile && (
                            <div className={styles.fileName}>
                                {cvFile.name}
                            </div>
                        )}
                        <span className={styles.helperText}>{t('auth.uploadCV', 'Upload your CV/Resume (.pdf, .doc, .docx)')}</span>
                    </div>
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <div className={styles.faceIdTitle}>
                        <FaUserShield className={styles.faceIdIcon} />
                        {t('auth.faceIdImages', 'Face ID Images (used for facial recognition login)')}
                        {faceIdImages.length > 0 && (
                            <span className={styles.faceIdCounter}>
                                {faceIdImages.length}/5
                            </span>
                        )}
                    </div>
                    
                    {/* Face ID Guide Section */}
                    <div className={styles.faceIdGuide}>
                        <div className={styles.guideTitle}>
                            <FaLightbulb /> {t('auth.faceIdGuideTitle', 'Tips for Better Face Recognition')}
                        </div>
                        <ul className={styles.guideTipsList}>
                            <li className={styles.guideTip}>
                                <FaCheck className={styles.tipIcon} />
                                <div className={styles.tipContent}>
                                    {t('auth.faceIdGuideLighting', 'Capture images in different lighting conditions (bright, medium, low light) for better recognition in various environments.')}
                                </div>
                            </li>
                            <li className={styles.guideTip}>
                                <FaCheck className={styles.tipIcon} />
                                <div className={styles.tipContent}>
                                    {t('auth.faceIdGuideAngles', 'Take photos from slightly different angles (straight, slightly left/right) while keeping your face visible.')}
                                </div>
                            </li>
                            <li className={styles.guideTip}>
                                <FaCheck className={styles.tipIcon} />
                                <div className={styles.tipContent}>
                                    {t('auth.faceIdGuideExpressions', 'Maintain a neutral expression and ensure your face is clearly visible without obstruction.')}
                                </div>
                            </li>
                        </ul>
                        <div className={styles.tipExample}>
                            <div className={styles.exampleItem}>
                                <div className={styles.exampleIcon}><FaSun /></div>
                                <div className={styles.exampleText}>{t('auth.faceIdBrightLight', 'Bright Light')}</div>
                            </div>
                            <div className={styles.exampleItem}>
                                <div className={styles.exampleIcon}><FaMoon /></div>
                                <div className={styles.exampleText}>{t('auth.faceIdLowLight', 'Low Light')}</div>
                            </div>
                            <div className={styles.exampleItem}>
                                <div className={styles.exampleIcon}><FaPortrait /></div>
                                <div className={styles.exampleText}>{t('auth.faceIdFrontal', 'Frontal View')}</div>
                            </div>
                            <div className={styles.exampleItem}>
                                <div className={styles.exampleIcon}><FaStreetView /></div>
                                <div className={styles.exampleText}>{t('auth.faceIdAngled', 'Slight Angle')}</div>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => setShowCamera(!showCamera)}
                        disabled={loading}
                        style={{ marginTop: '1rem' }}
                    >
                        {showCamera ? t('auth.hideCamera', 'Hide Camera') : t('auth.showCamera', 'Show Camera to Capture Face ID')}
                    </button>
                </div>

                {/* Show webcam and captured images */}
                {showCamera && (
                    <div className={styles.webcamSection}>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className={styles.webcam}
                            mirrored={true}
                            videoConstraints={{
                                width: 1280,
                                height: 720,
                                facingMode: "user"
                            }}
                        />
                        <div className={styles.webcamHint}>
                            {t('auth.positionFace', 'Position your face in the center of the frame')}
                        </div>
                        <button
                            type="button"
                            className={styles.captureButton}
                            onClick={captureFaceIdImage}
                            disabled={loading || faceIdImages.length >= 5}
                        >
                            <FaCamera style={{ marginRight: '8px' }} />
                            {t('auth.captureImage', 'Capture Image')}
                        </button>
                    </div>
                )}

                {/* Display captured face ID images */}
                {faceIdImages.length > 0 && (
                    <div className={styles.capturedImagesGrid}>
                        {faceIdImages.map((img, index) => (
                            <div key={index} className={styles.capturedImageContainer}>
                                <img src={img} alt={`Face ID ${index + 1}`} className={styles.capturedImage} />
                                <button
                                    type="button"
                                    className={styles.removeImageButton}
                                    onClick={() => removeFaceIdImage(index)}
                                    disabled={loading}
                                    aria-label="Remove image"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                >
                    {loading ? t('common.loading', 'Loading...') : t('auth.registerButton')}
                </button>
            </form>
        </div>
    );
}

export default RegistrationForm;