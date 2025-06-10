import React from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import styles from './CandidateApplicationDetails.module.css'; // Create this CSS file

// Function to construct the full URL for the CV
const getCvUrl = (cvPath) => {
    // Assuming your backend runs on localhost:5000 and serves /uploads
    // Adjust the base URL according to your actual backend deployment
    const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    // Ensure cvPath starts with a slash if it doesn't already
    const relativePath = cvPath.startsWith('/') ? cvPath : `/${cvPath}`;
    // Construct the full URL
    return `${backendBaseUrl}${relativePath}`;
};


function CandidateApplicationDetails({ application, onClose }) {
    const { t } = useTranslation(); // Initialize translation hook
    
    if (!application || !application.candidateId) {
        return null; // Or some fallback UI
    }

    const cvUrl = application.cvPath ? getCvUrl(application.cvPath) : null;
    
    // Handle different types of description data
    const renderDescription = () => {
        if (!application.description) {
            return <p className={styles.descriptionText}>{t('elections.noDescriptionProvided', 'No description provided.')}</p>;
        }
        
        // If description is a string, render it directly
        if (typeof application.description === 'string') {
            return <p className={styles.descriptionText}>{application.description}</p>;
        }
        
        // If description is an object with structured data
        if (typeof application.description === 'object') {
            const { summary, fullName, idNumber, planPoints, socialMedia } = application.description;
            return (
                <div className={styles.structuredDescription}>
                    {fullName && (
                        <div className={styles.detailField}>
                            <strong>{t('auth.name', 'Full Name')}:</strong> {fullName}
                        </div>
                    )}
                    
                    {idNumber && (
                        <div className={styles.detailField}>
                            <strong>{t('admin.idNumber', 'ID Number')}:</strong> {idNumber}
                        </div>
                    )}
                    
                    {summary && (
                        <div className={styles.detailField}>
                            <strong>{t('elections.personalStatement', 'Personal Statement')}:</strong>
                            <p>{summary}</p>
                        </div>
                    )}
                    
                    {planPoints && planPoints.length > 0 && (
                        <div className={styles.detailField}>
                            <strong>{t('elections.platformPoints', 'Platform Points')}:</strong>
                            <ul className={styles.pointsList}>
                                {planPoints.map((point, index) => (
                                    <li key={index}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {socialMedia && Object.values(socialMedia).some(value => value) && (
                        <div className={styles.detailField}>
                            <strong>{t('elections.socialMedia', 'Social Media')}:</strong>
                            <div className={styles.socialLinks}>
                                {socialMedia.facebook && (
                                    <div>
                                        <strong>Facebook:</strong> 
                                        <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                                            {socialMedia.facebook}
                                        </a>
                                    </div>
                                )}
                                {socialMedia.twitter && (
                                    <div>
                                        <strong>Twitter:</strong> 
                                        <a href={socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                                            {socialMedia.twitter}
                                        </a>
                                    </div>
                                )}
                                {socialMedia.instagram && (
                                    <div>
                                        <strong>Instagram:</strong> 
                                        <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                                            {socialMedia.instagram}
                                        </a>
                                    </div>
                                )}
                                {socialMedia.linkedin && (
                                    <div>
                                        <strong>LinkedIn:</strong> 
                                        <a href={socialMedia.linkedin} target="_blank" rel="noopener noreferrer">
                                            {socialMedia.linkedin}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        
        // Fallback for any other data types
        return <p className={styles.descriptionText}>{t('elections.descriptionFormatNotSupported', 'Description format not supported.')}</p>;
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>
                <h3 className={styles.modalTitle}>{t('elections.candidateApplication', 'Candidate Application')}</h3>
                
                <div className={styles.detailItem}>
                    <strong>{t('elections.candidate', 'Candidate')}</strong> 
                    <div className={styles.candidateInfo}>
                        <span className={styles.candidateName}>{application.candidateId.name}</span>
                        <span className={styles.candidateEmail}>{application.candidateId.email}</span>
                    </div>
                </div>
                
                <div className={styles.detailItem}>
                    <strong>{t('elections.applicationDetails', 'Application Details')}</strong>
                    {renderDescription()}
                </div>
                
                <div className={styles.detailItem}>
                    <strong>{t('auth.cvResume', 'Curriculum Vitae')}</strong>
                    {cvUrl ? (
                        <a href={cvUrl} target="_blank" rel="noopener noreferrer" className={styles.cvLink}>
                            {t('elections.viewCandidateCV', 'View Candidate\'s CV')}
                        </a>
                    ) : (
                        <span className={styles.noCv}>{t('elections.noCVUploaded', 'No CV uploaded by this candidate.')}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CandidateApplicationDetails;