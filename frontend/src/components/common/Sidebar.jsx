// frontend/src/components/common/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';

function Sidebar({ role, onLogout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // État des notifications par menu
    const [notificationCounts, setNotificationCounts] = useState({
        pendingRequests: 0,
        pendingValidations: 0,
        pendingAdminValidations: 0,
        unreadNotifications: 0
    });

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

        fetchNotificationCounts();

        const interval = setInterval(fetchNotificationCounts, 30000);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, [role]);

    const fetchNotificationCounts = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            let counts = {
                pendingRequests: 0,
                pendingValidations: 0,
                pendingAdminValidations: 0,
                unreadNotifications: 0
            };

            if (role === 'admin') {
                const pendingRes = await axios.get(`${API_URL}/admin/pending-approvals`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                counts.pendingAdminValidations = pendingRes.data.length;
                counts.pendingValidations = pendingRes.data.length;

            } else if (role === 'manager') {
                const pendingRes = await axios.get(`${API_URL}/leaves/team-pending`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                counts.pendingValidations = pendingRes.data.length;

                const teamRes = await axios.get(`${API_URL}/users/my-team`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                counts.teamCount = teamRes.data.length;

            } else if (role === 'employee') {
                const requestsRes = await axios.get(`${API_URL}/leaves/my-requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const pendingCount = requestsRes.data.filter(r =>
                    r.statut === 'pending_manager' || r.statut === 'pending_admin'
                ).length;
                counts.pendingRequests = pendingCount;
            }

            setNotificationCounts(counts);
        } catch (error) {
            console.error('Erreur chargement notifications sidebar:', error);
        }
    };

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    // Composant Badge - Cercle rouge
    const Badge = ({ count }) => {
        if (!count || count === 0) return null;
        const countStr = String(count);
        const badgeClass = countStr.length === 1 ? 'single-digit' : (countStr.length === 2 ? 'two-digits' : 'three-digits');
        return (
            <span className={`sidebar-badge ${badgeClass}`}>
                {count > 99 ? '99+' : count}
            </span>
        );
    };

    const getMenuItems = () => {
        if (role === 'admin') {
            return [
                {
                    path: '/dashboard/admin',
                    label: 'Tableau de bord',
                    key: 'dashboard',
                    badge: notificationCounts.pendingAdminValidations,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/admin/users',
                    label: 'Utilisateurs',
                    key: 'users',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/admin/payroll',
                    label: 'Gestion de la paie',
                    key: 'payroll',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/admin/calendar',
                    label: 'Calendrier',
                    key: 'calendar',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/admin/logs',
                    label: 'Historique',
                    key: 'logs',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/admin/settings',
                    label: 'Paramètres',
                    key: 'settings',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.07.08A10 10 0 0 0 12 18a10 10 0 0 0 6.26-2.22z"/>
                            <path d="M4.6 9a1.65 1.65 0 0 0-.33 1.82c.26.61.79 1 1.51 1h12.44c.72 0 1.25-.39 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.07-.08A10 10 0 0 0 12 6a10 10 0 0 0-6.26 2.22z"/>
                        </svg>
                    )
                }
            ];
        }

        if (role === 'manager') {
            return [
                {
                    path: '/dashboard/manager',
                    label: 'Tableau de bord',
                    key: 'dashboard',
                    badge: notificationCounts.pendingValidations,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/manager/team',
                    label: 'Mon équipe',
                    key: 'team',
                    badge: notificationCounts.teamCount || 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/manager/validations',
                    label: 'Validations',
                    key: 'validations',
                    badge: notificationCounts.pendingValidations,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/manager/statistics',
                    label: 'Statistiques',
                    key: 'statistics',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <line x1="18" y1="20" x2="18" y2="10"/>
                            <line x1="12" y1="20" x2="12" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                    )
                },
                {
                    path: '/dashboard/manager/team-calendar',
                    label: 'Calendrier équipe',
                    key: 'team-calendar',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    )
                },
                // NOUVEAU MENU - Faire une demande de congé pour manager
                {
                    path: '/dashboard/employee/new-request',
                    label: 'Ma demande de congé',
                    key: 'my-request',
                    badge: 0,
                    icon: (active) => (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="16"/>
                            <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                    )
                }
            ];
        }

        // Employé
        return [
            {
                path: '/dashboard/employee',
                label: 'Tableau de bord',
                key: 'dashboard',
                badge: notificationCounts.pendingRequests,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/balance',
                label: 'Mon solde',
                key: 'balance',
                badge: 0,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/requests',
                label: 'Mes demandes',
                key: 'requests',
                badge: notificationCounts.pendingRequests,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 4v16h16V4H4z"/>
                        <line x1="8" y1="9" x2="16" y2="9"/>
                        <line x1="8" y1="13" x2="16" y2="13"/>
                        <line x1="8" y1="17" x2="12" y2="17"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/new-request',
                label: 'Nouvelle demande',
                key: 'new-request',
                badge: 0,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/calendar',
                label: 'Calendrier',
                key: 'calendar',
                badge: 0,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/statistics',
                label: 'Statistiques',
                key: 'statistics',
                badge: 0,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/payroll',
                label: 'Mes bulletins',
                key: 'payroll',
                badge: 0,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                )
            },
            {
                path: '/dashboard/employee/manager-profile',
                label: 'Mon manager',
                key: 'manager-profile',
                badge: 0,
                icon: (active) => (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                )
            }
        ];
    };

    const isActive = (path) => {
        if (path === '/dashboard/admin' && currentPath === '/dashboard/admin') return true;
        if (path === '/dashboard/manager' && currentPath === '/dashboard/manager') return true;
        if (path === '/dashboard/employee' && currentPath === '/dashboard/employee') return true;
        if (path !== '/dashboard/admin' && path !== '/dashboard/manager' && path !== '/dashboard/employee' && currentPath.startsWith(path)) return true;
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
                    style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        fontWeight: '500'
                    }}
                >
                    {isOpen ? '✖ Fermer le menu' : '☰ Menu'}
                </button>
                {isOpen && (
                    <nav style={{ marginTop: '16px' }}>
                        {getMenuItems().map(item => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.key}
                                    to={item.path}
                                    className={active ? 'active' : ''}
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        color: active ? '#667eea' : '#475569',
                                        background: active ? '#eff6ff' : 'transparent',
                                        fontWeight: active ? '600' : '500'
                                    }}
                                >
                                    <span className="menu-icon">{item.icon(active)}</span>
                                    <span style={{ flex: 1 }}>{item.label}</span>
                                    <Badge count={item.badge} />
                                </Link>
                            );
                        })}
                        <div className="menu-divider" style={{ height: '1px', background: '#e2e8f0', margin: '12px 0' }}></div>
                        <button
                            onClick={handleLogout}
                            className="logout-menu-btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                width: '100%',
                                border: 'none',
                                background: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                color: '#ef4444',
                                fontWeight: '500'
                            }}
                        >
                            <span className="menu-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                    <polyline points="16 17 21 12 16 7"/>
                                    <line x1="21" y1="12" x2="9" y2="12"/>
                                </svg>
                            </span>
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
            <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 16px 16px' }}>
                <button
                    onClick={toggleSidebar}
                    className="collapse-btn"
                    title={isCollapsed ? 'Agrandir' : 'Réduire'}
                    style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#475569'
                    }}
                >
                    {isCollapsed ? '→' : '←'}
                </button>
            </div>
            <nav>
                {getMenuItems().map(item => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={active ? 'active' : ''}
                            title={isCollapsed ? `${item.label}${item.badge > 0 ? ` (${item.badge})` : ''}` : ''}
                        >
                            <span className="menu-icon">{item.icon(active)}</span>
                            {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                            {!isCollapsed && <Badge count={item.badge} />}
                        </Link>
                    );
                })}
                <div className="menu-divider"></div>
                <button onClick={handleLogout} className="logout-menu-btn" title={isCollapsed ? 'Déconnexion' : ''}>
                    <span className="menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                    </span>
                    {!isCollapsed && <span>Déconnexion</span>}
                </button>
            </nav>
        </aside>
    );
}

export default Sidebar;