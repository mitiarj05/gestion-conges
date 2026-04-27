// frontend/src/components/common/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar({ role }) {
    const location = useLocation();
    const currentPath = location.pathname;

    const getMenuItems = () => {
        if (role === 'admin') {
            return [
                { path: '/dashboard/admin', label: '📊 Dashboard', key: 'dashboard' },
                { path: '/dashboard/admin/users', label: '👥 Utilisateurs', key: 'users' },
                { path: '/dashboard/admin/codes', label: '🔐 Codes', key: 'codes' },
                { path: '/dashboard/admin/logs', label: '📜 Logs', key: 'logs' },
                { path: '/dashboard/admin/settings', label: '⚙️ Paramètres', key: 'settings' }
            ];
        }
                if (role === 'manager') {
            return [
                { path: '/dashboard/manager', label: '📊 Dashboard', key: 'dashboard' },
                { path: '/dashboard/manager/team', label: '👥 Mon équipe', key: 'team' },
                { path: '/dashboard/manager/validations', label: '✅ Validations', key: 'validations' },
                { path: '/dashboard/manager/statistics', label: '📊 Statistiques', key: 'statistics' },
                { path: '/dashboard/manager/team-calendar', label: '📅 Calendrier équipe', key: 'team-calendar' } // <-- Ce lien
            ];
        }
        return [
            { path: '/dashboard/employee', label: '📊 Dashboard', key: 'dashboard' },
            { path: '/dashboard/employee/balance', label: '💰 Mon solde', key: 'balance' },
            { path: '/dashboard/employee/requests', label: '📋 Mes demandes', key: 'requests' },
            { path: '/dashboard/employee/new-request', label: '➕ Nouvelle demande', key: 'new-request' },
            { path: '/dashboard/employee/permission', label: '⏰ Permission', key: 'permission' },
            { path: '/dashboard/employee/calendar', label: '📅 Calendrier', key: 'calendar' },
            { path: '/dashboard/employee/statistics', label: '📊 Statistiques', key: 'statistics' },
            { path: '/dashboard/employee/manager-profile', label: '👨‍💼 Mon manager', key: 'manager-profile' }
        ];
    };

    const isActive = (path) => {
        if (path === '/dashboard/admin' && currentPath === '/dashboard/admin') return true;
        if (path !== '/dashboard/admin' && currentPath.startsWith(path)) return true;
        if (path === currentPath) return true;
        return false;
    };

    return (
        <aside className="sidebar">
            <nav>
                {getMenuItems().map(item => (
                    <Link 
                        key={item.key} 
                        to={item.path} 
                        className={isActive(item.path) ? 'active' : ''}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;