import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        // Show a loading indicator while checking auth status
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If a specific role is required, check if the user has that role
    if (requiredRole && user?.role !== requiredRole) {
        // Redirect to dashboard if user doesn't have the required role
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute; 