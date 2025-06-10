import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const AdminRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>; // Or a spinner component
    }

    if (!isAuthenticated) {
        // Not logged in, redirect to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role !== 'admin') {
        // Logged in but not an admin, redirect to dashboard or a 'not authorized' page
        // Redirecting to dashboard is often friendlier than a stark error page.
        console.warn('AdminRoute: User is not an admin. Redirecting.');
        return <Navigate to="/dashboard" replace />;
        // Or: return <Navigate to="/unauthorized" replace />; (if you create such a page)
    }

    // User is authenticated and is an admin
    return children;
};

export default AdminRoute;