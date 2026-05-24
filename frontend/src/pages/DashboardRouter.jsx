// frontend/src/pages/DashboardRouter.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import des composants employé
import EmployeeDashboard from '../components/employee/EmployeeDashboard';

// Import des composants manager
import ManagerDashboard from '../components/manager/ManagerDashboard';

// Import des composants admin
import AdminDashboard from '../components/admin/AdminDashboard';

function DashboardRouter({ onLogout }) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const roles = user.roles || [];

    const isAdmin = roles.includes('admin');
    const isManager = roles.includes('manager');
    const isEmployee = roles.includes('employe');

    // Routes pour employé
    if (isEmployee && !isManager && !isAdmin) {
        return (
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard/employee" replace />} />
                <Route path="/employee/*" element={<EmployeeDashboard onLogout={onLogout} />} />
                <Route path="*" element={<Navigate to="/dashboard/employee" replace />} />
            </Routes>
        );
    }

    // Routes pour manager - Toutes les routes sont gérées par ManagerDashboard
    if (isManager && !isAdmin) {
        return (
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard/manager" replace />} />
                <Route path="/manager/*" element={<ManagerDashboard onLogout={onLogout} />} />
                <Route path="*" element={<Navigate to="/dashboard/manager" replace />} />
            </Routes>
        );
    }

    // Routes pour admin
    if (isAdmin) {
        return (
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard/admin" replace />} />
                <Route path="/admin/*" element={<AdminDashboard onLogout={onLogout} />} />
                <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
            </Routes>
        );
    }

    return <Navigate to="/login" replace />;
}

export default DashboardRouter;