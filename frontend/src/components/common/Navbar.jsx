// frontend/src/components/common/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import axios from 'axios';
import { API_URL } from '../../config/api';

function Navbar({ user, role, onLogout }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [role]);

    const fetchNotifications = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        let endpoint = '';
        if (role === 'admin') {
            endpoint = `${API_URL}/admin/notifications`;
        } else {
            endpoint = `${API_URL}/leaves/notifications`;
        }

        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000  // Ajouter un timeout
        });
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.est_lu).length);
    } catch (error) {
        console.error('Erreur chargement notifications:', error.message);
        // Ne pas bloquer l'application
        setNotifications([]);
    }
};

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            let endpoint = `${API_URL}/leaves/notifications/${id}/read`;

            if (role === 'admin') {
                endpoint = `${API_URL}/admin/notifications/${id}/read`;
            }

            await axios.put(endpoint, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const unreadIds = notifications.filter(n => !n.est_lu && n.id).map(n => n.id);
            for (const id of unreadIds) {
                let endpoint = `${API_URL}/leaves/notifications/${id}/read`;
                if (role === 'admin') {
                    endpoint = `${API_URL}/admin/notifications/${id}/read`;
                }
                await axios.put(endpoint, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchNotifications();
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleLabel = () => {
        if (role === 'admin') return 'Administrateur';
        if (role === 'manager') return 'Manager';
        return 'Employé';
    };

    const getNotificationLink = (notif) => {
        if (notif.lien) return notif.lien;

        switch (notif.type) {
            case 'validation_requise':
                return '/dashboard/admin';
            case 'demande_attente':
                return '/dashboard/manager/validations';
            case 'approuve_final':
            case 'refus_admin':
            case 'pre_approuve':
                return '/dashboard/employee/requests';
            default:
                if (role === 'admin') return '/dashboard/admin';
                if (role === 'manager') return '/dashboard/manager';
                return '/dashboard/employee';
        }
    };

    return (
        <header className="app-header">
            <div className="logo-container">
                <div className="logo-icon">🏢</div>
                <h2>Gestion des Congés</h2>
            </div>
            <div className="user-info">
                {/* Bouton Notifications */}
                <div className="notifications-wrapper">
                    <button
                        className="notifications-btn"
                        onClick={() => setShowNotifications(!showNotifications)}
                        title="Notifications"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        {unreadCount > 0 && (
                            <span className="notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                    </button>

                    {/* Dropdown Notifications */}
                    {showNotifications && (
                        <div className="notifications-dropdown">
                            <div className="notifications-header">
                                <span>Notifications</span>
                                {unreadCount > 0 && (
                                    <button onClick={markAllAsRead} className="mark-all-read">
                                        Tout marquer comme lu
                                    </button>
                                )}
                            </div>
                            <div className="notifications-list">
                                {notifications.length === 0 ? (
                                    <div className="notifications-empty">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                        </svg>
                                        <p>Aucune notification</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 10).map((notif, index) => (
                                        <div
                                            key={notif.id || index}
                                            className={`notification-item ${!notif.est_lu ? 'unread' : ''}`}
                                            onClick={() => {
                                                if (!notif.est_lu && notif.id) markAsRead(notif.id);
                                                setShowNotifications(false);
                                                const link = getNotificationLink(notif);
                                                if (link) navigate(link);
                                            }}
                                        >
                                            <div className="notification-content">
                                                <strong>{notif.titre || 'Notification'}</strong>
                                                <span>{notif.message}</span>
                                                <small>{formatDateTime(notif.cree_le)}</small>
                                            </div>
                                            {!notif.est_lu && <div className="notification-dot"></div>}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="notifications-footer">
                                <button onClick={() => setShowNotifications(false)}>
                                    Fermer
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ThemeToggle />
                <span className="role-badge">
                    {getRoleLabel()}
                </span>
                {!isMobile && (
                    <span className="user-name">
                        {user?.prenom || ''} {user?.nom || ''}
                    </span>
                )}
            </div>
            {isMobile && (
                <div className="mobile-user-name">
                    {user?.prenom || ''} {user?.nom || ''}
                </div>
            )}
        </header>
    );
}

export default Navbar;