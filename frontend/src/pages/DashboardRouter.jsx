// frontend/src/pages/DashboardRouter.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EmployeeDashboard from '../components/employee/EmployeeDashboard';
import ManagerDashboard from '../components/manager/ManagerDashboard';
import AdminDashboard from '../components/admin/AdminDashboard';

function DashboardRouter({ onLogout }) {
    // Récupérer l'utilisateur à chaque rendu
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const roles = user.roles || [];

    console.log('=== DASHBOARD ROUTER ===');
    console.log('Rôles:', roles);

    // Fonction de déconnexion qui notifie App
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (onLogout) onLogout();
        window.location.href = '/login';
    };

    // Déterminer le rôle principal
    let defaultRole = 'employee';
    if (roles.includes('admin')) defaultRole = 'admin';
    else if (roles.includes('manager')) defaultRole = 'manager';
    else if (roles.includes('employe')) defaultRole = 'employee';

    // Passer handleLogout à tous les dashboards
    const commonProps = { onLogout: handleLogout };

    return (
        <Routes>
            <Route path="/employee" element={<EmployeeDashboard {...commonProps} />} />
            <Route path="/manager" element={<ManagerDashboard {...commonProps} />} />
            <Route path="/admin" element={<AdminDashboard {...commonProps} />} />
            <Route path="*" element={<Navigate to={`/${defaultRole}`} replace />} />
        </Routes>
    );
}

export default DashboardRouter;