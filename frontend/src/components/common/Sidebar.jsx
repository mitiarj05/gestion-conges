// frontend/src/components/common/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Sidebar({ role, onLogout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setIsOpen(true);
                setIsCollapsed(false);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    const getMenuItems = () => {
        if (role === 'admin') {
            return [
                { path: '/dashboard/admin', label: 'Tableau de bord', key: 'dashboard', icon: '📊' },
                { path: '/dashboard/admin/users', label: 'Utilisateurs', key: 'users', icon: '👥' },
                { path: '/dashboard/admin/payroll', label: 'Gestion de la paie', key: 'payroll', icon: '💰' },
                { path: '/dashboard/admin/calendar', label: 'Calendrier', key: 'calendar', icon: '📅' },
                { path: '/dashboard/admin/logs', label: 'Historique', key: 'logs', icon: '📜' },
                { path: '/dashboard/admin/settings', label: 'Paramètres', key: 'settings', icon: '⚙️' }
            ];
        }
        if (role === 'manager') {
            return [
                { path: '/dashboard/manager', label: 'Tableau de bord', key: 'dashboard', icon: '📊' },
                { path: '/dashboard/manager/team', label: 'Mon équipe', key: 'team', icon: '👥' },
                { path: '/dashboard/manager/validations', label: 'Validations', key: 'validations', icon: '✅' },
                { path: '/dashboard/manager/statistics', label: 'Statistiques', key: 'statistics', icon: '📈' },
                { path: '/dashboard/manager/team-calendar', label: 'Calendrier équipe', key: 'team-calendar', icon: '📅' }
            ];
        }
        return [
            { path: '/dashboard/employee', label: 'Tableau de bord', key: 'dashboard', icon: '📊' },
            { path: '/dashboard/employee/balance', label: 'Mon solde', key: 'balance', icon: '💰' },
            { path: '/dashboard/employee/requests', label: 'Mes demandes', key: 'requests', icon: '📋' },
            { path: '/dashboard/employee/new-request', label: 'Nouvelle demande', key: 'new-request', icon: '➕' },
            { path: '/dashboard/employee/calendar', label: 'Calendrier', key: 'calendar', icon: '📅' },
            { path: '/dashboard/employee/statistics', label: 'Statistiques', key: 'statistics', icon: '📈' },
            { path: '/dashboard/employee/payroll', label: 'Mes bulletins', key: 'payroll', icon: '💰' },
            { path: '/dashboard/employee/manager-profile', label: 'Mon manager', key: 'manager-profile', icon: '👨‍💼' }
        ];
    };

    const isActive = (path) => {
        if (path === '/dashboard/admin' && currentPath === '/dashboard/admin') return true;
        if (path !== '/dashboard/admin' && currentPath.startsWith(path)) return true;
        return currentPath === path;
    };

    const toggleSidebar = () => {
        if (isMobile) {
            setIsOpen(!isOpen);
        } else {
            setIsCollapsed(!isCollapsed);
        }
    };

    // Version mobile
    if (isMobile) {
        return (
            <aside className="sidebar" style={{ padding: '16px' }}>
                <button 
                    onClick={toggleSidebar} 
                    className="sidebar-toggle-btn"
                >
                    {isOpen ? '✖ Fermer le menu' : '☰ Menu'}
                </button>
                {isOpen && (
                    <nav style={{ marginTop: '16px' }}>
                        {getMenuItems().map(item => (
                            <Link 
                                key={item.key} 
                                to={item.path} 
                                className={isActive(item.path) ? 'active' : ''}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="menu-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        <div className="menu-divider"></div>
                        <button onClick={handleLogout} className="logout-menu-btn">
                            <span className="menu-icon">🔒</span>
                            <span>Déconnexion</span>
                        </button>
                    </nav>
                )}
            </aside>
        );
    }

    // Version desktop avec réduction
    return (
        <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="sidebar-header">
                <button onClick={toggleSidebar} className="collapse-btn" title={isCollapsed ? 'Agrandir' : 'Réduire'}>
                    {isCollapsed ? '→' : '←'}
                </button>
            </div>
            <nav>
                {getMenuItems().map(item => (
                    <Link 
                        key={item.key} 
                        to={item.path} 
                        className={isActive(item.path) ? 'active' : ''}
                        title={isCollapsed ? item.label : ''}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                ))}
                <div className="menu-divider"></div>
                <button onClick={handleLogout} className="logout-menu-btn" title={isCollapsed ? 'Déconnexion' : ''}>
                    <span className="menu-icon">🔒</span>
                    {!isCollapsed && <span>Déconnexion</span>}
                </button>
            </nav>
        </aside>
    );
}

export default Sidebar;