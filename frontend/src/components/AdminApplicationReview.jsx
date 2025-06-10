import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AdminApplicationReview.module.css';

// Add onViewDetails prop
function AdminApplicationReview({ applications = [], onApprove, onReject, onViewDetails, isLoading }) {
    const { t } = useTranslation();

    // Handle case where applications might be empty or null
    if (!applications || applications.length === 0) {
         // Parent component (ElectionDetailsPage) handles the "No pending applications" message.
         // Return null here to avoid rendering the section title unnecessarily.
         return null;
    }
    
    // Add confirmation before approving a candidate
    const handleApproveWithConfirmation = (candidateId) => {
        if (window.confirm(t('admin.confirmApproveCandidate', 'Are you sure you want to approve this candidate?'))) {
            onApprove(candidateId);
        }
    };
    
    // Add confirmation before rejecting a candidate
    const handleRejectWithConfirmation = (candidateId) => {
        if (window.confirm(t('admin.confirmRejectCandidate', 'Are you sure you want to reject this candidate? This action cannot be undone.'))) {
            onReject(candidateId);
        }
    };

    return (
        <div className={styles.adminSection} dir="ltr">
            <h4 className={styles.sectionTitle}>{t('admin.candidateApplications', 'Candidate Applications')}</h4>
            <ul className={styles.applicationList}>
                {applications.map((app) => {
                    // Ensure candidateId exists before rendering
                    if (!app.candidateId) {
                        console.warn("Application missing candidateId:", app);
                        return null; // Skip rendering this item
                    }
                    
                    // Parse JSON description if available
                    let extendedDetails = {};
                    if (app.description && typeof app.description === 'string') {
                        try {
                            extendedDetails = JSON.parse(app.description);
                        } catch (e) {
                            console.warn('Failed to parse application description as JSON');
                        }
                    }
                    
                    return (
                        <li key={app._id} className={styles.applicationItem}>
                            <div
                                className={styles.applicantInfo}
                                onClick={() => onViewDetails(app)}
                                title={t('admin.clickToViewDetails', 'Click to view application details')}
                            >
                                <img
                                    src={app.candidateId.profileImage || '/default-profile.png'}
                                    alt={app.candidateId.name || t('admin.applicant', 'Applicant')}
                                    className={styles.applicantImage}
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/default-profile.png'; }}
                                />
                                <div className={styles.candidateDetails}>
                                    <span className={styles.candidateName}>
                                        {app.candidateId.name || t('elections.unnamedCandidate', 'Unknown Candidate')}
                                    </span>
                                    <span className={styles.candidateEmail}>
                                        {extendedDetails.idNumber ? `${t('admin.idNumber', 'ID')}: ${extendedDetails.idNumber}` : app.candidateId.email || t('admin.noEmail', 'No Email')}
                                    </span>
                                </div>
                                <div className={styles.viewDetailsIndicator}>
                                    {t('common.viewDetails', 'View Details')}
                                </div>
                            </div>

                            <div className={styles.actionButtons}>
                                <button
                                    onClick={() => handleApproveWithConfirmation(app.candidateId._id)}
                                    disabled={isLoading}
                                    className={`${styles.actionButton} ${styles.approveButton}`}
                                >
                                    {isLoading ? t('common.loading', '...') : `✓ ${t('admin.approve', 'Approve')}`}
                                </button>
                                <button
                                    onClick={() => handleRejectWithConfirmation(app.candidateId._id)}
                                    disabled={isLoading}
                                    className={`${styles.actionButton} ${styles.rejectButton}`}
                                >
                                    {isLoading ? t('common.loading', '...') : `✕ ${t('admin.reject', 'Reject')}`}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default AdminApplicationReview;