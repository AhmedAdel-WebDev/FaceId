import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import electionService from '../services/electionService';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import styles from './ApplicationForm.module.css';

const ApplicationForm = () => {
    const { t } = useTranslation();
    const { id: electionId } = useParams();  // Get election ID from URL params
    const { user } = useAuth(); // Get user from context
    const [electionTitle, setElectionTitle] = useState('');
    
    // Basic Fields
    const [fullName, setFullName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [description, setDescription] = useState('');
    
    // Plan points as an array
    const [planPoints, setPlanPoints] = useState(['']);
    
    // Social Media Links
    const [facebook, setFacebook] = useState('');
    const [twitter, setTwitter] = useState('');
    const [instagram, setInstagram] = useState('');
    const [linkedin, setLinkedin] = useState('');
    
    const [cvFile, setCvFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Fetch election details to show title
    useEffect(() => {
        const fetchElectionDetails = async () => {
            try {
                const response = await electionService.getElectionById(electionId);
                setElectionTitle(response.title || t('application.electionApplication', 'Election Application'));
                
                // Pre-populate full name from user data if available
                if (user && user.name) {
                    setFullName(user.name);
                }
            } catch (err) {
                console.error('Error fetching election details:', err);
            }
        };
        
        fetchElectionDetails();
    }, [electionId, user, t]);

    // Handle adding a new plan point
    const handleAddPlanPoint = () => {
        setPlanPoints([...planPoints, '']);
    };

    // Handle updating a specific plan point
    const handlePlanPointChange = (index, value) => {
        const newPlanPoints = [...planPoints];
        newPlanPoints[index] = value;
        setPlanPoints(newPlanPoints);
    };

    // Handle removing a plan point
    const handleRemovePlanPoint = (index) => {
        const newPlanPoints = [...planPoints];
        newPlanPoints.splice(index, 1);
        setPlanPoints(newPlanPoints.length ? newPlanPoints : ['']);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!fullName || !idNumber || !description || !cvFile) {
            setError(t('application.fillRequiredFields', 'Please fill all required fields'));
            return;
        }

        // Filter out empty plan points
        const filteredPlanPoints = planPoints.filter(point => point.trim() !== '');
        
        // Create extended description with plans and social media
        const extendedDescription = {
            summary: description,
            fullName: fullName,
            idNumber: idNumber,
            planPoints: filteredPlanPoints,
            socialMedia: {
                facebook: facebook || null,
                twitter: twitter || null,
                instagram: instagram || null,
                linkedin: linkedin || null
            }
        };

        const formData = new FormData();
        // Always stringify the extendedDescription object to ensure it's treated as a JSON string
        formData.append('description', JSON.stringify(extendedDescription));
        formData.append('cv', cvFile);

        try {
            setLoading(true);
            await electionService.applyForElection(electionId, formData);
            navigate(`/elections/${electionId}`, { state: { success: t('application.submittedSuccessfully', 'Application submitted successfully') } });
        } catch (err) {
            setError(err.message || t('application.applicationFailed', 'Application failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <main className={styles.mainContent}>
                <div className={styles.formContainer}>
                    <h2>{t('application.candidateApplication', 'Candidate Application')}: {electionTitle}</h2>
                    
                    {error && <p className={styles.error}>{error}</p>}
                    
                    <form onSubmit={handleSubmit}>
                        <h3 className={styles.sectionTitle}>{t('application.personalInfo', 'Personal Information')}</h3>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="fullName">{t('auth.name', 'Full Name')} <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                placeholder={t('application.enterFullLegalName', 'Enter your full legal name')}
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="idNumber">{t('admin.idNumber', 'ID Number')} <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                id="idNumber"
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                required
                                placeholder={t('application.enterIdNumber', 'Enter your national ID or passport number')}
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="description">{t('elections.personalStatement', 'Personal Statement')} <span className={styles.required}>*</span></label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                placeholder={t('application.tellVotersAboutYourself', 'Tell voters about yourself and why they should vote for you')}
                            />
                        </div>
                        
                        <h3 className={styles.sectionTitle}>{t('application.yourPlans', 'Your Plans')}</h3>
                        <p className={styles.sectionDescription}>{t('application.listKeyPoints', 'List the key points of your platform')}</p>
                        
                        {planPoints.map((point, index) => (
                            <div key={index} className={styles.planPointContainer}>
                                <div className={styles.planPointRow}>
                                    <input
                                        type="text"
                                        value={point}
                                        onChange={(e) => handlePlanPointChange(index, e.target.value)}
                                        placeholder={t('application.planPoint', 'Plan point') + ` ${index + 1}`}
                                        className={styles.planPointInput}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemovePlanPoint(index)}
                                        className={styles.removeButton}
                                        title={t('application.removePoint', 'Remove this point')}
                                        disabled={planPoints.length === 1 && !point}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            type="button" 
                            onClick={handleAddPlanPoint}
                            className={styles.addButton}
                        >
                            + {t('application.addPlanPoint', 'Add Plan Point')}
                        </button>
                        
                        <h3 className={styles.sectionTitle}>{t('elections.socialMedia', 'Social Media')} ({t('common.optional', 'Optional')})</h3>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="facebook">Facebook</label>
                            <input
                                type="url"
                                id="facebook"
                                value={facebook}
                                onChange={(e) => setFacebook(e.target.value)}
                                placeholder="https://facebook.com/your.profile"
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="twitter">Twitter / X</label>
                            <input
                                type="url"
                                id="twitter"
                                value={twitter}
                                onChange={(e) => setTwitter(e.target.value)}
                                placeholder="https://twitter.com/your.handle"
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="instagram">Instagram</label>
                            <input
                                type="url"
                                id="instagram"
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="https://instagram.com/your.profile"
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="linkedin">LinkedIn</label>
                            <input
                                type="url"
                                id="linkedin"
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                                placeholder="https://linkedin.com/in/your.profile"
                            />
                        </div>
                        
                        <h3 className={styles.sectionTitle}>{t('application.supportingDocuments', 'Supporting Documents')}</h3>
                        
                        <div className={styles.formGroup}>
                            <label htmlFor="cvFile">{t('application.uploadCV', 'Upload your CV (PDF only)')} <span className={styles.required}>*</span></label>
                            <div className={styles.fileUploadWrapper}>
                                <div className={styles.fileUploadButton}>
                                    <span className={styles.fileIcon}>📄</span> 
                                    {cvFile ? t('auth.changeFile', 'Change File') : t('auth.chooseFile', 'Choose File')}
                                </div>
                                <input
                                    type="file"
                                    id="cvFile"
                                    accept=".pdf"
                                    onChange={(e) => setCvFile(e.target.files[0])}
                                    required
                                    className={styles.fileInput}
                                    disabled={loading}
                                />
                            </div>
                            {cvFile && (
                                <div className={styles.fileName}>
                                    {cvFile.name}
                                </div>
                            )}
                            <p className={styles.helperText}>{t('application.maxFileSize', 'Max file size: 5MB')}</p>
                        </div>

                        <div className={styles.buttonContainer}>
                            <button 
                                type="submit" 
                                className={styles.submitButton} 
                                disabled={loading}
                            >
                                {loading ? t('common.submitting', 'Submitting...') : t('application.submitApplication', 'Submit Application')}
                            </button>
                            <button 
                                type="button" 
                                className={styles.cancelButton}
                                onClick={() => navigate(`/elections/${electionId}`)} 
                                disabled={loading}
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ApplicationForm;