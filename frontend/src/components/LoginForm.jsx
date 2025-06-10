import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook
import { useLanguage } from '../context/LanguageContext.jsx'; // Import useLanguage hook
import styles from './Form.module.css'; // Shared form styles
// Import icons
import { FaCamera, FaSpinner, FaArrowLeft, FaUserShield } from 'react-icons/fa';

function LoginForm() {
    const { t } = useTranslation(); // Initialize translation function
    const { language } = useLanguage(); // Get current language
    const isRTL = language === 'ar'; // Check if current language is Arabic
    const [authStage, setAuthStage] = useState('password'); // 'password', 'faceId'
    const [stageOneToken, setStageOneToken] = useState(null);
    const [usernameForFaceId, setUsernameForFaceId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [faceLoading, setFaceLoading] = useState(false); // Loading state for face login (2FA)
    const [showWebcam, setShowWebcam] = useState(false); // Controlled by authStage === 'faceId' for 2FA
    // Removed: showSingleFactorWebcam, singleFactorFaceLoading
    const { login, verifyFaceAndLogin } = useAuth(); // Removed: singleFactorFaceLogin
    const navigate = useNavigate();
    const location = useLocation();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Get the path the user was trying to access, or default to dashboard
    const from = location.state?.from?.pathname || '/dashboard';

    // Toggle password visibility function
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await login(email, password); // login service now returns { success, message, stageOneToken, username }
            if (response.success && response.stageOneToken && response.username) {
                setStageOneToken(response.stageOneToken);
                setUsernameForFaceId(response.username);
                setAuthStage('faceId');
                setError(''); // Clear previous errors
                startWebcam(); // Automatically start webcam for face ID step
            } else {
                // Handle cases where stageOneToken is not returned, though backend should ensure this on success
                setError(response.message || t('auth.faceIdInitError', 'Password verification succeeded, but failed to initiate Face ID step.'));
            }
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data?.error || err.message || t('auth.loginFailed', 'Login failed. Please check your credentials.');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const startWebcam = useCallback(async () => {
        setError('');
        setShowWebcam(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing webcam: ", err);
            setError(t('auth.webcamError', 'Could not access webcam. Please ensure permission is granted.'));
            setShowWebcam(false);
        }
    }, [t]);

    const stopWebcam = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setShowWebcam(false);
    }, []);

    const captureImage = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg'); // Or 'image/png'
        }
        return null;
    }, []);

    // This function is now for the SECOND FACTOR of 2FA
    const handleVerifyFaceSubmit = async () => {
        // Webcam should already be started if authStage is 'faceId'
        if (!videoRef.current || !videoRef.current.srcObject) {
            setError(t('auth.webcamNotActive', 'Webcam is not active. Please enable it.'));
            setFaceLoading(false);
            return;
        }

        setError('');
        setFaceLoading(true);
        const imageBase64 = captureImage();

        if (!imageBase64) {
            setError(t('auth.captureError', 'Failed to capture image.'));
            setFaceLoading(false);
            return;
        }

        try {
            // Use verifyFaceAndLogin from AuthContext with stageOneToken and username
            await verifyFaceAndLogin(stageOneToken, usernameForFaceId, imageBase64);
            stopWebcam();
            setAuthStage('password'); // Reset stage
            setStageOneToken(null);
            setUsernameForFaceId('');
            navigate(from, { replace: true });
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data?.error || err.message || t('auth.faceLoginFailed', 'Face login failed.');
            setError(message);
            // Optionally stop webcam on failure or allow retry?
            // stopWebcam();
        } finally {
            setFaceLoading(false);
        }
    };

    // Removed handleSingleFactorFaceLoginAttempt function

    // Cleanup webcam on component unmount or when authStage changes from 'faceId'
    React.useEffect(() => {
        return () => {
            // This cleanup is for the 2FA webcam.
            if (showWebcam) { 
                stopWebcam();
            }
            // Removed cleanup for showSingleFactorWebcam
        };
    }, [stopWebcam, showWebcam]);

    // Effect to manage webcam based on authStage (for 2FA)
    React.useEffect(() => {
        if (authStage === 'faceId' && !showWebcam) {
            startWebcam();
        } else if (authStage !== 'faceId' && showWebcam) {
            stopWebcam();
        }
    }, [authStage, showWebcam, startWebcam, stopWebcam]);

    if (authStage === 'password') {
        return (
            <div className={styles.formContainer}>
                {/* Password Login Form */}
            <form className={styles.form} onSubmit={handlePasswordSubmit}>
                <h3>{t('auth.loginTitle')}</h3>
                {error && <div className={styles.errorMessage}>{error}</div>}
                
                <div className={styles.formGroup}>
                    <label htmlFor="email">{t('auth.email')}</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder={t('auth.email')}
                        disabled={loading || faceLoading}
                    />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="password">{t('auth.password')}</label>
                    <div className={styles.passwordInputContainer}>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder={t('auth.password')}
                            disabled={loading || faceLoading}
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
                
                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={loading || faceLoading}
                >
                    {loading ? t('common.loading') : t('auth.loginButton')}
                </button>
                <div className={styles.forgotPasswordContainer}>
                    <button 
                        type="button" 
                        onClick={() => navigate('/forgot-password')}
                        className={styles.linkButton}
                        disabled={loading || faceLoading}
                    >
                        {t('auth.forgotPassword')}
                    </button>
                </div>
            </form>
            {/* Removed Divider and Single Factor Face Login Section */}
        </div>
        );
    } else if (authStage === 'faceId') {
        return (
            <div className={styles.faceVerificationContainer}>
                <h3>
                    <FaUserShield style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    {t('auth.verifyWithFaceId', 'Step 2: Verify with Face ID')}
                </h3>
                
                <p>
                    {t('auth.lookIntoCamera', 'Please look into the camera for verification.')}
                    <br />
                    {t('auth.username')}: <strong>{usernameForFaceId}</strong>
                </p>
                
                {error && (
                    <div className={`${styles.verificationStatus} ${styles.errorStatus}`}>
                        <span className={styles.statusText}>{error}</span>
                    </div>
                )}
                
                {faceLoading && (
                    <div className={`${styles.verificationStatus} ${styles.verifyingStatus}`}>
                        <FaSpinner className={`${styles.statusIcon} ${styles.spinning}`} />
                        <span className={styles.statusText}>{t('auth.verifyingFace', 'Verifying Face...')}</span>
                    </div>
                )}
                
                {showWebcam && (
                    <div className={styles.webcamContainer}>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className={styles.webcamVideo}
                        ></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    </div>
                )}
                
                <button 
                    type="button" 
                    onClick={handleVerifyFaceSubmit}
                    className={styles.faceLoginButton}
                    disabled={faceLoading || !showWebcam}
                >
                    <FaCamera style={{ marginRight: '0.8rem' }} />
                    {t('auth.captureAndLogin', 'Capture & Complete Login')}
                </button>
                
                <button 
                    type="button" 
                    onClick={() => {
                        stopWebcam();
                        setAuthStage('password');
                        setError('');
                        setStageOneToken(null);
                        setUsernameForFaceId('');
                    }}
                    className={styles.cancelButton}
                    disabled={faceLoading}
                >
                    <FaArrowLeft style={{ marginRight: '0.5rem' }} />
                    {t('auth.backToPassword', 'Back to Password')}
                </button>
            </div>
        );
    }

    return null; // Should not happen
}

export default LoginForm;