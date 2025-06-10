import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Assuming new functions will be added here
import styles from '../components/Form.module.css'; // Reuse form styles
// Removed: import authService from '../services/authService.js'; // Assuming new service functions

function ForgotPasswordPage() {
    const [step, setStep] = useState('verifyFace'); // 'verifyFace', 'resetPassword'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [faceVerified, setFaceVerified] = useState(false); // To control UI flow
    const [resetToken, setResetToken] = useState(null); // Store token from face verification
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showWebcam, setShowWebcam] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const navigate = useNavigate();
    const { requestPasswordResetFaceVerify, resetPasswordWithToken } = useAuth(); // Use functions from AuthContext

    // Toggle password visibility functions
    const toggleNewPasswordVisibility = () => {
        setShowNewPassword(!showNewPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
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
            setError('Could not access webcam. Please ensure permission is granted.');
            setShowWebcam(false);
        }
    }, []);

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
            return canvas.toDataURL('image/jpeg');
        }
        return null;
    }, []);

    const handleFaceVerification = async () => {
        if (!showWebcam) {
            await startWebcam();
            return; // Wait for user to be ready for capture
        }

        if (!videoRef.current || !videoRef.current.srcObject) {
            setError('Webcam is not active. Please enable it.');
            return;
        }

        setLoading(true);
        setError('');
        const imageBase64 = captureImage();

        if (!imageBase64) {
            setError('Failed to capture image.');
            setLoading(false);
            return;
        }

        try {
            // Placeholder for actual API call
            // const response = await requestPasswordResetWithFaceId(imageBase64);
            // For now, simulate success and move to next step
            console.log('Simulating face verification for password reset with image:', imageBase64.substring(0,30) + '...');
            // Simulate receiving a reset token from backend
            const simulatedResponse = await requestPasswordResetFaceVerify(imageBase64); // Use context function
            
            if (simulatedResponse.success && simulatedResponse.resetToken) {
                setResetToken(simulatedResponse.resetToken);
                setFaceVerified(true);
                setStep('resetPassword');
                stopWebcam();
                setError('');
            } else {
                setError(simulatedResponse.message || 'Face verification failed. Please try again.');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'An error occurred during face verification.';
            setError(message);
            // Optionally stop webcam on failure or allow retry
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordResetSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!resetToken) {
            setError('Verification token is missing. Please verify with Face ID again.');
            setStep('verifyFace'); // Go back to face verification
            setFaceVerified(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            // Placeholder for actual API call
            // await resetPasswordWithToken(resetToken, newPassword);
            console.log('Simulating password reset with token:', resetToken, 'and new password:', newPassword);
            const simulatedResponse = await resetPasswordWithToken(resetToken, newPassword); // Use context function

            if (simulatedResponse.success) {
                alert('Password has been reset successfully! Please login with your new password.');
                navigate('/login');
            } else {
                setError(simulatedResponse.message || 'Failed to reset password.');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'An error occurred while resetting your password.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    // Cleanup webcam on component unmount
    React.useEffect(() => {
        return () => {
            if (showWebcam) {
                stopWebcam();
            }
        };
    }, [stopWebcam, showWebcam]);

    return (
        <div className={styles.formContainer}>
            {step === 'verifyFace' && (
                <div className={styles.form}>
                    <h3>Forgot Password - Step 1: Face Verification</h3>
                    <p>Please use your Face ID to verify your identity before resetting your password.</p>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    {showWebcam && (
                        <div className={styles.webcamContainer}>
                            <video ref={videoRef} autoPlay playsInline className={styles.webcamVideo}></video>
                            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                        </div>
                    )}
                    <button 
                        type="button" 
                        onClick={handleFaceVerification}
                        className={`${styles.submitButton} ${styles.faceLoginButton}`}
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : (showWebcam ? 'Capture & Verify Face' : 'Start Face Verification')}
                    </button>
                    {showWebcam && (
                        <button 
                            type="button" 
                            onClick={() => { stopWebcam(); setError(''); }}
                            className={`${styles.submitButton} ${styles.cancelButton}`}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    )}
                     <button 
                        type="button" 
                        onClick={() => navigate('/login')}
                        className={`${styles.submitButton} ${styles.cancelButton}`} // Or a different style for 'back'
                        style={{marginTop: '0.5rem'}}
                        disabled={loading}
                    >
                        Back to Login
                    </button>
                </div>
            )}

            {step === 'resetPassword' && faceVerified && (
                <form className={styles.form} onSubmit={handlePasswordResetSubmit}>
                    <h3>Forgot Password - Step 2: Set New Password</h3>
                    <p>Face verification successful. Please enter your new password.</p>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    <div className={styles.formGroup}>
                        <label htmlFor="newPassword">New Password</label>
                        <div className={styles.passwordInputContainer}>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                disabled={loading}
                                className={styles.passwordInput}
                            />
                            <button 
                                type="button" 
                                className={styles.passwordToggleBtn}
                                onClick={toggleNewPasswordVisibility}
                                tabIndex="-1"
                            >
                                {showNewPassword ? 
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
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div className={styles.passwordInputContainer}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
                                disabled={loading}
                                className={styles.passwordInput}
                            />
                            <button 
                                type="button" 
                                className={styles.passwordToggleBtn}
                                onClick={toggleConfirmPasswordVisibility}
                                tabIndex="-1"
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
                    <button 
                        type="submit" 
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { 
                            setStep('verifyFace'); 
                            setFaceVerified(false); 
                            setResetToken(null); 
                            setError(''); 
                            setNewPassword(''); 
                            setConfirmPassword(''); 
                        }}
                        className={`${styles.submitButton} ${styles.cancelButton}`}
                        style={{marginTop: '0.5rem'}}
                        disabled={loading}
                    >
                        Back to Face Verification
                    </button>
                </form>
            )}
        </div>
    );
}

export default ForgotPasswordPage;