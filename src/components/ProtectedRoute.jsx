import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, token, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect based on their actual role to avoid getting stuck
        if (user.role === 'Super Admin' || user.role === 'Admin') {
            return <Navigate to="/dashboard" replace />;
        } else {
            return <Navigate to="/employee-dashboard" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
