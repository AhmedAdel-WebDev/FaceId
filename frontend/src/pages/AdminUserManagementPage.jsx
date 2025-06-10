import React, { useState, useEffect, useCallback, Fragment } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getUsers, approveUser, rejectUser } from '../services/adminService';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './AdminUserManagementPage.module.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

function AdminUserManagementPage() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [approvedUsers, setApprovedUsers] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const { user } = useAuth();
    const [expandedRows, setExpandedRows] = useState({});
    const { t } = useTranslation();

    // Define role priority order for sorting
    const rolePriority = {
        'admin': 1,
        'candidate': 2,
        'voter': 3
    };

    // Sort function based on role priority
    const sortByRole = (a, b) => {
        return (rolePriority[a.role] || 999) - (rolePriority[b.role] || 999);
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const allUsersResponse = await getUsers();
            const pendingUsersResponse = await getUsers(true);
            
            // Filter and sort pending users by role
            const pendingFiltered = pendingUsersResponse.data.filter(u => !u.isApproved && u.role !== 'admin');
            pendingFiltered.sort(sortByRole);
            setPendingUsers(pendingFiltered);
            
            // Filter and sort approved users by role
            const approvedFiltered = allUsersResponse.data.filter(u => u.isApproved && u.role !== 'admin');
            approvedFiltered.sort(sortByRole);
            setApprovedUsers(approvedFiltered);

        } catch (err) {
            setError(err.response?.data?.message || err.message || t('admin.failedToFetchUsers'));
            setPendingUsers([]);
            setApprovedUsers([]);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleRow = (userId) => {
        setExpandedRows(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const handleApprove = async (userId) => {
        setActionLoading(prev => ({ ...prev, [userId]: true }));
        setError('');
        try {
            await approveUser(userId);
            fetchUsers(); 
        } catch (err) {
            setError(err.response?.data?.message || err.message || t('admin.failedToApproveUser'));
        } finally {
            setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleReject = async (userId) => {
        if (window.confirm(t('admin.confirmRejectUser'))) {
            setActionLoading(prev => ({ ...prev, [userId]: true }));
            setError('');
            try {
                await rejectUser(userId);
                fetchUsers();
            } catch (err) {
                setError(err.response?.data?.message || err.message || t('admin.failedToRejectUser'));
            } finally {
                setActionLoading(prev => ({ ...prev, [userId]: false }));
            }
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Navbar />
            <main className={styles.mainContent}>
                <h1 className={styles.title}>{t('admin.userAccountManagement')}</h1>
                {error && <div className={styles.errorContainer}>
                    <p className={styles.errorText}>{error}</p>
                </div>}

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <p className={styles.loadingText}>{t('admin.loadingUserData')}</p>
                    </div>
                ) : (
                    <>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>{t('admin.pendingApproval')} ({pendingUsers.length})</h2>
                            {pendingUsers.length === 0 && 
                                <div className={styles.emptyContainer}>
                                    <p className={styles.emptyText}>{t('admin.noPendingUsers')}</p>
                                </div>
                            }
                            {pendingUsers.length > 0 && (
                                <UserTable
                                    users={pendingUsers}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    actionLoading={actionLoading}
                                    isPendingTable={true}
                                    expandedRows={expandedRows}
                                    onToggleRow={toggleRow}
                                />
                            )}
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>{t('admin.approvedUsers')} ({approvedUsers.length})</h2>
                            {approvedUsers.length === 0 && 
                                <div className={styles.emptyContainer}>
                                    <p className={styles.emptyText}>{t('admin.noApprovedUsers')}</p>
                                </div>
                            }
                            {approvedUsers.length > 0 && (
                                <UserTable
                                    users={approvedUsers}
                                    onReject={handleReject}
                                    actionLoading={actionLoading}
                                    isPendingTable={false}
                                    expandedRows={expandedRows}
                                    onToggleRow={toggleRow}
                                />
                            )}
                        </section>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}

// Sub-component for rendering user tables
function UserTable({ users, onApprove, onReject, actionLoading, isPendingTable, expandedRows, onToggleRow }) {
    const { t } = useTranslation();
    
    if (!users || users.length === 0) {
        return null;
    }

    // Define role priority order for sorting
    const rolePriority = {
        'admin': 1,
        'candidate': 2,
        'voter': 3
    };

    // Sort users by role
    const sortedUsers = [...users].sort((a, b) => {
        return (rolePriority[a.role] || 999) - (rolePriority[b.role] || 999);
    });

    // Group users by role for visual separation
    const groupedUsers = [];
    let currentRole = null;
    
    sortedUsers.forEach(user => {
        if (user.role !== currentRole) {
            currentRole = user.role;
            groupedUsers.push({ isGroupHeader: true, role: user.role });
        }
        groupedUsers.push(user);
    });

    const formatDate = (dateString) => {
        if (!dateString) return t('common.notAvailable');
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return t('common.invalidDate');
            }
            return date.toLocaleDateString();
        } catch (e) {
            return t('common.invalidDate');
        }
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.userTable}>
                <thead>
                    <tr>
                        <th className={styles.expandIconHeader}></th>
                        <th>{t('admin.name')}</th>
                        <th>{t('admin.username')}</th>
                        <th>{t('admin.role')}</th>
                        <th>{t('admin.registeredAt')}</th>
                        <th className={styles.actionsCell}>{t('admin.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedUsers.map((item, index) => 
                        item.isGroupHeader ? (
                            <tr key={`header-${item.role}`} className={styles.roleGroupHeader} data-role={item.role}>
                                <td colSpan="6" className={styles.roleGroupHeaderCell}>
                                    {t(`admin.roles.${item.role}`, item.role)}
                                </td>
                            </tr>
                        ) : (
                            <Fragment key={item._id}>
                                <tr className={expandedRows[item._id] ? styles.activeRow : ''}>
                                    <td onClick={() => onToggleRow(item._id)} className={styles.expandIconCell}>
                                        {expandedRows[item._id] ? <FaChevronUp className={styles.expandIcon} /> : <FaChevronDown className={styles.expandIcon} />}
                                    </td>
                                    <td data-label={t('admin.name')}>{item.name}</td>
                                    <td data-label={t('admin.username')}>{item.username}</td>
                                    <td data-label={t('admin.role')}>
                                        <span className={`${styles.roleBadge} ${styles[item.role]}`}>
                                            {t(`admin.roles.${item.role}`)}
                                        </span>
                                    </td>
                                    <td data-label={t('admin.registeredAt')}>{formatDate(item.createdAt)}</td>
                                    <td className={styles.actionsCell} data-label={t('admin.actions')}>
                                        {isPendingTable && onApprove && (
                                            <button
                                                onClick={() => onApprove(item._id)}
                                                disabled={actionLoading[item._id]}
                                                className={`${styles.actionButton} ${styles.approveButton}`}
                                            >
                                                {actionLoading[item._id] ? t('admin.approving') : t('admin.approve')}
                                            </button>
                                        )}
                                        {onReject && item.role !== 'admin' && (
                                            <button
                                                onClick={() => onReject(item._id)}
                                                disabled={actionLoading[item._id]}
                                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                            >
                                                {actionLoading[item._id] ? t('admin.rejecting') : t('admin.reject')}
                                            </button>
                                        )}
                                        {item.role === 'admin' && !isPendingTable && <span className={styles.adminLabel}>{t('admin.adminUser')}</span>}
                                    </td>
                                </tr>
                                {expandedRows[item._id] && (
                                    <tr className={styles.detailsRow}>
                                        <td colSpan="6">
                                            <div className={styles.userDetails}>
                                                <div className={styles.userDetailsFlex}>
                                                    <div className={styles.profileImageContainer}>
                                                        {item.profileImage ? (
                                                            <img src={item.profileImage} alt={`${item.name}'s profile`} className={styles.profileImage} />
                                                        ) : (
                                                            <div className={styles.profileImagePlaceholder}>
                                                                {item.name?.charAt(0).toUpperCase() || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={styles.detailsGrid}>
                                                        <div className={styles.detailItem}>
                                                            <strong>{t('admin.email')}:</strong> 
                                                            <span>{item.email || t('common.notAvailable')}</span>
                                                        </div>
                                                        <div className={styles.detailItem}>
                                                            <strong>{t('admin.phoneNumber')}:</strong> 
                                                            <span>{item.phoneNumber || t('common.notAvailable')}</span>
                                                        </div>
                                                        <div className={styles.detailItem}>
                                                            <strong>{t('admin.birthDate')}:</strong> 
                                                            <span>{formatDate(item.birthDate)}</span>
                                                        </div>
                                                        <div className={styles.detailItem}>
                                                            <strong>{t('admin.idNumber')}:</strong> 
                                                            <span>{item.idNumber || t('common.notAvailable')}</span>
                                                        </div>
                                                        <div className={styles.detailItem}>
                                                            <strong>{t('admin.address')}:</strong> 
                                                            <span>{item.street ? 
                                                                `${item.street}, ${item.city}, ${item.state}${item.zipCode ? ', ' + item.zipCode : ''}` 
                                                                : t('common.notAvailable')}</span>
                                                        </div>
                                                        {item.cvPath && (
                                                            <div className={styles.detailItem}>
                                                                <strong>{t('admin.cv')}:</strong>
                                                                <a 
                                                                    href={`http://localhost:5000/${item.cvPath}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    download
                                                                    className={styles.downloadLink}
                                                                >
                                                                    {t('admin.downloadCV')}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default AdminUserManagementPage;