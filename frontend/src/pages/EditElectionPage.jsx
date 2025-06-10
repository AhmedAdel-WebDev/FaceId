import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ElectionForm from '../components/ElectionForm.jsx';
import electionService from '../services/electionService';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import styles from './DetailsPage.module.css';

function EditElectionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [electionData, setElectionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchElectionData = useCallback(async () => {
        if (!id) {
            setError("No election ID provided.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await electionService.getElectionById(id);
            if (!data) {
                setError(`Election with ID ${id} not found.`);
                setTimeout(() => navigate('/elections'), 3000); // Redirect if not found
            } else {
                setElectionData(data);
                setError(null);
            }
        } catch (err) {
            console.error(`Error fetching election ${id} for edit:`, err);
            setError(err.message || 'Failed to load election data.');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchElectionData();
    }, [fetchElectionData]);

    const handleDeleteElection = async () => {
        if (!window.confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
            return;
        }

        try {
            setDeleteLoading(true);
            await electionService.deleteElection(id);
            navigate('/elections', { 
                replace: true,
                state: { message: 'Election deleted successfully' }
            });
        } catch (err) {
            console.error('Error deleting election:', err);
            setError(err.message || 'Failed to delete election');
            setDeleteLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <main className={styles.mainContent}>
                {loading && <p className={styles.loadingText}>Loading election data...</p>}
                {error && <p className={styles.errorText}>{error}</p>}
                {!loading && !error && electionData && (
                    <div style={{ position: 'relative', width: '100%' }}>
                        <button
                            className={`${styles.deleteButton} ${deleteLoading ? styles.loading : ''}`}
                            onClick={handleDeleteElection}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete Election'}
                        </button>
                        <div style={{ clear: 'both' }}>
                            <ElectionForm electionData={electionData} isEditMode={true} />
                        </div>
                    </div>
                )}
                {!loading && !error && !electionData && !error && (
                    <p className={styles.infoText}>Election data could not be loaded.</p>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default EditElectionPage;