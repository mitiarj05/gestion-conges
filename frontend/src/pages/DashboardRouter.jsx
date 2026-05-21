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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (onLogout) onLogout();
        window.location.href = '/login';
    };

    let defaultRole = 'employee';
    if (roles.includes('admin')) defaultRole = 'admin';
    else if (roles.includes('manager')) defaultRole = 'manager';

    const commonProps = { onLogout: handleLogout };

    return (
        <Routes>
            <Route path="/admin/*" element={<AdminDashboard {...commonProps} />} />
            <Route path="/manager/*" element={<ManagerDashboard {...commonProps} />} />
            <Route path="/employee/*" element={<EmployeeDashboard {...commonProps} />} />
            <Route path="/" element={<Navigate to={`/${defaultRole}`} replace />} />
            <Route path="*" element={<Navigate to={`/${defaultRole}`} replace />} />
        </Routes>
    );
}

export default DashboardRouter;