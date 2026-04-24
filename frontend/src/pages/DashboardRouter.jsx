// frontend/src/pages/DashboardRouter.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EmployeeDashboard from '../components/employee/EmployeeDashboard';
import ManagerDashboard from '../components/manager/ManagerDashboard';
import AdminDashboard from '../components/admin/AdminDashboard';

function DashboardRouter({ onLogout }) {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const roles = user.roles || [];

    console.log('=== DASHBOARD ROUTER ===');
    console.log('Rôles:', roles);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (onLogout) onLogout();
        window.location.href = '/login';
    };

    // Déterminer le rôle principal pour la redirection par défaut
    let defaultRole = 'employee';
    if (roles.includes('admin')) defaultRole = 'admin';
    else if (roles.includes('manager')) defaultRole = 'manager';

    const commonProps = { onLogout: handleLogout };

    return (
        <Routes>
            {/* Routes pour ADMIN - TOUTES les sous-routes sont gérées dans AdminDashboard */}
            <Route path="/admin/*" element={<AdminDashboard {...commonProps} />} />
            
            {/* Routes pour MANAGER */}
            <Route path="/manager/*" element={<ManagerDashboard {...commonProps} />} />
            
            {/* Routes pour EMPLOYÉ */}
            <Route path="/employee/*" element={<EmployeeDashboard {...commonProps} />} />
            
            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to={`/${defaultRole}`} replace />} />
            <Route path="*" element={<Navigate to={`/${defaultRole}`} replace />} />
        </Routes>
    );
}

export default DashboardRouter;