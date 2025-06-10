import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSafeImageUrl } from '../utils/imageUtils.js'; // Import the image utility
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import styles from './ProfilePage.module.css'; // Import styles
import formStyles from '../components/Form.module.css'; // For webcam and form elements
import { useTranslation } from 'react-i18next';

function ProfilePage() {
  const { t } = useTranslation();
  // Use the hook to get user and loading state
  const { 
    user, 
    loading: authLoading, 
    verifyFaceForProfileUpdate, 
    updateProfile 
  } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileStep, setEditProfileStep] = useState('initiate'); // 'initiate', 'verifyFace', 'editDetails'
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [showEditProfileWebcam, setShowEditProfileWebcam] = useState(false);
  const [profileUpdateToken, setProfileUpdateToken] = useState(null);
  
  // Form state for editable fields
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: ''
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        street: user.street || '',
        city: user.city || '',
        state: user.state || ''
      });
    }
  }, [user]);

  const startWebcam = useCallback(async () => {
    setEditProfileError('');
    setShowEditProfileWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      setEditProfileError(t('auth.webcamError'));
      setShowEditProfileWebcam(false);
    }
  }, [t]);

  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowEditProfileWebcam(false);
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

  useEffect(() => {
    // Cleanup webcam when component unmounts or when isEditingProfile becomes false
    return () => {
      if (showEditProfileWebcam) {
        stopWebcam();
      }
    };
  }, [showEditProfileWebcam, stopWebcam]);

  const handleEditProfileClick = () => {
    setIsEditingProfile(true);
    setEditProfileStep('verifyFace');
    setEditProfileError('');
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setEditProfileStep('initiate');
    setEditProfileError('');
    setProfileUpdateToken(null);
    if (showEditProfileWebcam) {
      stopWebcam();
    }
    // Reset form data to original user values
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        street: user.street || '',
        city: user.city || '',
        state: user.state || ''
      });
    }
  };

  const handleFaceVerificationForProfileEdit = async () => {
    if (!showEditProfileWebcam) {
      await startWebcam();
      return; 
    }

    if (!videoRef.current || !videoRef.current.srcObject) {
      setEditProfileError(t('auth.webcamNotActive'));
      return;
    }

    setEditProfileLoading(true);
    setEditProfileError('');
    const imageBase64 = captureImage();

    if (!imageBase64) {
      setEditProfileError(t('auth.captureError'));
      setEditProfileLoading(false);
      return;
    }

    try {
      const response = await verifyFaceForProfileUpdate(imageBase64);
      
      if (response.success && response.updateToken) {
        setProfileUpdateToken(response.updateToken);
        setEditProfileStep('editDetails');
        stopWebcam();
        setEditProfileError('');
      } else {
        setEditProfileError(response.message || t('profile.faceVerificationFailed'));
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || t('profile.faceVerificationError');
      setEditProfileError(message);
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdateSubmit = async (e) => {
    e.preventDefault();
    
    if (!profileUpdateToken) {
      setEditProfileError(t('profile.verificationTokenMissing'));
      setEditProfileStep('verifyFace');
      return;
    }

    setEditProfileLoading(true);
    setEditProfileError('');
    
    try {
      const response = await updateProfile(profileUpdateToken, formData);
      
      if (response.success) {
        alert(t('profile.updateSuccess'));
        handleCancelEditProfile(); // Reset state
      } else {
        setEditProfileError(response.message || t('profile.updateFailed'));
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || t('profile.updateError');
      setEditProfileError(message);
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Display loading message while auth state is being determined
  if (authLoading) {
    return (
      <div className={styles.pageContainer}>
        <Navbar />
        <main className={styles.mainContent}>
          <p className={styles.loadingText}>{t('profile.loading')}</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle case where user is not logged in (should be caught by PrivateRoute, but good practice)
  if (!user) {
     return (
      <div className={styles.pageContainer}>
        <Navbar />
        <main className={styles.mainContent}>
          <p className={styles.errorText}>{t('profile.loginRequired')}</p>
          {/* Optionally add a link to login */}
        </main>
        <Footer />
      </div>
    );
  }

  // Render profile details once user is loaded
  return (
    <div className={styles.pageContainer}>
      <Navbar />
      <main className={styles.mainContent}>
        <h1 className={styles.title}>{t('profile.title')}</h1>
        <div className={styles.profileCard}>
          <div className={styles.profileImage}>
            <img
              src={getSafeImageUrl(user.profileImage) || '/placeholder-image.svg'} 
              alt={user.name || t('common.user')}
              onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.svg'; }}
            />
          </div>
          
          <h2 className={styles.userName}>{user?.name || t('common.user')}</h2>
          <span className={styles.roleBadge}>{user?.role ? t(`admin.roles.${user.role}`) : t('common.notAvailable')}</span>
          
          <div className={styles.profileDetails}>
            <p>
              <strong>{t('auth.username')}</strong>
              <span>{user?.username || t('common.notAvailable')}</span>
            </p>
            <p>
              <strong>{t('auth.email')}</strong>
              <span>{user?.email || t('common.notAvailable')}</span>
            </p>
            <p>
              <strong>{t('auth.idNumber')}</strong>
              <span>{user?.idNumber || t('common.notAvailable')}</span>
            </p>
            <p>
              <strong>{t('auth.birthDate')}</strong>
              <span>{user?.birthDate ? new Date(user.birthDate).toLocaleDateString() : t('common.notAvailable')}</span>
            </p>
            <p>
              <strong>{t('auth.phoneNumber')}</strong>
              <span>{user?.phoneNumber || t('common.notAvailable')}</span>
            </p>
            {user?.gender && (
              <p>
                <strong>{t('auth.gender')}</strong>
                <span>{t(`auth.${user.gender.toLowerCase()}`)}</span>
              </p>
            )}
            {user?.city && user?.state && (
              <p>
                <strong>{t('profile.location')}</strong>
                <span>{`${user.city}, ${user.state}`}</span>
              </p>
            )}
            {user?.street && (
              <p>
                <strong>{t('auth.streetAddress')}</strong>
                <span>{user.street}</span>
              </p>
            )}
          </div>
          
          <div className={styles.buttonGroup}>
            {!isEditingProfile && (
                <button 
                    className={styles.actionButton}
                onClick={handleEditProfileClick}
                >
                {t('profile.editProfileWithFaceId')}
                </button>
            )}
          </div>
        </div>

        {isEditingProfile && (
          <div className={`${formStyles.formContainer} ${styles.editProfileSection}`}>
            {editProfileStep === 'verifyFace' && (
              <div className={formStyles.form}>
                <h3>{t('profile.editProfileStep1')}</h3>
                <p>{t('profile.useFaceIdToVerify')}</p>
                {editProfileError && <div className={formStyles.errorMessage}>{editProfileError}</div>}
                {showEditProfileWebcam && (
                  <div className={formStyles.webcamContainer}>
                    <video ref={videoRef} autoPlay playsInline className={formStyles.webcamVideo}></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={handleFaceVerificationForProfileEdit}
                  className={`${formStyles.submitButton} ${formStyles.faceLoginButton}`}
                  disabled={editProfileLoading}
                >
                  {editProfileLoading ? t('profile.verifying') : (showEditProfileWebcam ? t('profile.captureAndVerify') : t('profile.startFaceVerification'))}
                </button>
                {showEditProfileWebcam && (
                  <button 
                    type="button" 
                    onClick={() => { stopWebcam(); setEditProfileError(''); }}
                    className={`${formStyles.submitButton} ${formStyles.cancelButton}`}
                    disabled={editProfileLoading}
                  >
                    {t('profile.cancelWebcam')}
                  </button>
                )}
                <button 
                    type="button" 
                  onClick={handleCancelEditProfile}
                    className={`${formStyles.submitButton} ${formStyles.cancelButton}`}
                    style={{marginTop: '0.5rem'}}
                  disabled={editProfileLoading}
                >
                  {t('profile.cancelProfileEdit')}
                </button>
              </div>
            )}

            {editProfileStep === 'editDetails' && (
              <form className={formStyles.form} onSubmit={handleProfileUpdateSubmit}>
                <h3>{t('profile.editProfileStep2')}</h3>
                <p>{t('profile.faceVerificationSuccessful')}</p>
                {editProfileError && <div className={formStyles.errorMessage}>{editProfileError}</div>}
                
                <div className={formStyles.formGroup}>
                  <label htmlFor="name">{t('auth.name')}</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    placeholder={t('auth.enterName')}
                    disabled={editProfileLoading}
                  />
                </div>
                
                <div className={formStyles.formGroup}>
                  <label htmlFor="phoneNumber">{t('auth.phoneNumber')}</label>
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleFormChange}
                    required
                    placeholder={t('auth.includeCountryCode')}
                    disabled={editProfileLoading}
                  />
                </div>
                
                <div className={formStyles.formGroup}>
                  <label htmlFor="street">{t('auth.streetAddress')}</label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleFormChange}
                    required
                    placeholder={t('auth.enterStreet')}
                    disabled={editProfileLoading}
                  />
                </div>
                
                <div className={formStyles.formRow}>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="city">{t('auth.city')}</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleFormChange}
                      required
                      placeholder={t('auth.enterCity')}
                      disabled={editProfileLoading}
                    />
                  </div>
                  
                  <div className={formStyles.formGroup}>
                    <label htmlFor="state">{t('auth.state')}</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleFormChange}
                      required
                      placeholder={t('auth.enterState')}
                      disabled={editProfileLoading}
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className={formStyles.submitButton}
                  disabled={editProfileLoading}
                >
                  {editProfileLoading ? t('profile.updatingProfile') : t('profile.updateProfile')}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancelEditProfile}
                  className={`${formStyles.submitButton} ${formStyles.cancelButton}`}
                  style={{marginTop: '0.5rem'}}
                  disabled={editProfileLoading}
                >
                  {t('common.cancel')}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default ProfilePage;