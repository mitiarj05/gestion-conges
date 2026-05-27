// frontend/src/components/common/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import axios from 'axios';
import { API_URL, getBaseUrl } from '../../config/api';

console.log('📁 [Navbar] Chargement du module');

function Navbar({ user: initialUser, role, onLogout }) {
    const [user, setUser] = useState(initialUser || {});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [imageError, setImageError] = useState(false);
    const navigate = useNavigate();
    
    const isMounted = useRef(true);
    const fetchTimeoutRef = useRef(null);
    const intervalRef = useRef(null);

    console.log(`🔧 [Navbar] Initialisation - role: ${role}`);

    useEffect(() => {
        console.log('📦 [Navbar] Montage');
        isMounted.current = true;
        
        const handleResize = () => {
            if (isMounted.current) {
                setIsMobile(window.innerWidth <= 768);
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            console.log('🗑️ [Navbar] Démontage - nettoyage des timers');
            isMounted.current = false;
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Mise à jour de l'utilisateur depuis le localStorage
    const updateUserFromStorage = useCallback(() => {
        if (!isMounted.current) return;
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        setImageError(false);
        
        if (storedUser.photo_url) {
            const baseUrl = getBaseUrl();
            const fullUrl = storedUser.photo_url.startsWith('http') 
                ? storedUser.photo_url 
                : `${baseUrl}${storedUser.photo_url}`;
            setPhotoPreview(fullUrl);
        } else {
            setPhotoPreview(null);
        }
    }, []);

    useEffect(() => {
        updateUserFromStorage();
        
        const handleProfileUpdated = () => {
            updateUserFromStorage();
        };
        
        window.addEventListener('profileUpdated', handleProfileUpdated);
        
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdated);
        };
    }, [updateUserFromStorage]);

    // Gestion des notifications
    useEffect(() => {
        const safeFetchNotifications = async () => {
            if (!isMounted.current) {
                console.log('⚠️ [Navbar] Composant démonté, fetch annulé');
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                if (!token || !isMounted.current) return;

                let endpoint = '';
                if (role === 'admin') {
                    endpoint = `${API_URL}/admin/notifications`;
                } else {
                    endpoint = `${API_URL}/leaves/notifications`;
                }

                console.log(`📡 [Navbar] Fetch notifications: ${endpoint}`);
                
                const response = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 10000
                });
                
                if (!isMounted.current) {
                    console.log('⚠️ [Navbar] Composant démonté après fetch');
                    return;
                }
                
                let filteredNotifications = response.data;
                
                if (role === 'employee') {
                    filteredNotifications = response.data.filter(n => 
                        n.type === 'approuve_final' || 
                        n.type === 'refus_admin' || 
                        n.type === 'pre_approuve' ||
                        n.type === 'refus_manager' ||
                        n.type === 'annulation_confirme' ||
                        n.type === 'annulation_conge' ||
                        n.type === 'bulletin_paie' ||
                        n.type === 'demande_recue' ||
                        n.type === 'team_added'
                    );
                } else if (role === 'manager') {
                    filteredNotifications = response.data.filter(n => 
                        n.type === 'demande_attente' ||
                        n.type === 'ma_demande_attente' ||
                        n.type === 'approuve_final' ||
                        n.type === 'refus_admin' ||
                        n.type === 'pre_approuve' ||
                        n.type === 'refus_manager' ||
                        n.type === 'annulation_confirme' ||
                        n.type === 'annulation_conge' ||
                        n.type === 'bulletin_paie' ||
                        n.type === 'demande_modifiee' ||
                        n.type === 'validation_requise'
                    );
                } else if (role === 'admin') {
                    filteredNotifications = response.data;
                }
                
                if (!isMounted.current) return;
                
                const notificationsWithId = filteredNotifications.map((notif, index) => {
                    if (!notif.id) {
                        return { ...notif, id: `temp_${notif.type}_${index}_${Date.now()}` };
                    }
                    return notif;
                });
                
                setNotifications(notificationsWithId);
                setUnreadCount(notificationsWithId.filter(n => !n.est_lu).length);
            } catch (error) {
                console.error('Erreur chargement notifications:', error.message);
                if (isMounted.current) {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            }
        };

        safeFetchNotifications();
        
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            if (isMounted.current) {
                safeFetchNotifications();
            }
        }, 30000);
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [role]);

    const markAsRead = async (id, event) => {
        if (event) {
            event.stopPropagation();
        }
        
        if (!isMounted.current) return;
        
        if (typeof id === 'string' && id.startsWith('temp_')) {
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === id ? { ...notif, est_lu: true } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            return;
        }
        
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === id ? { ...notif, est_lu: true } : notif
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        try {
            const token = localStorage.getItem('token');
            let endpoint = `${API_URL}/leaves/notifications/${id}/read`;

            if (role === 'admin') {
                endpoint = `${API_URL}/admin/notifications/${id}/read`;
            }

            await axios.put(endpoint, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
        } catch (error) {
            console.error(`❌ Erreur lors du marquage comme lu:`, error);
            if (isMounted.current) {
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === id ? { ...notif, est_lu: false } : notif
                    )
                );
                setUnreadCount(prev => prev + 1);
            }
        }
    };

    const markAllAsRead = async () => {
        if (!isMounted.current) return;
        
        const realIds = notifications.filter(n => !n.est_lu && n.id && !String(n.id).startsWith('temp_')).map(n => n.id);
        
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, est_lu: true }))
        );
        setUnreadCount(0);
        
        for (const id of realIds) {
            try {
                const token = localStorage.getItem('token');
                let endpoint = `${API_URL}/leaves/notifications/${id}/read`;
                if (role === 'admin') {
                    endpoint = `${API_URL}/admin/notifications/${id}/read`;
                }
                await axios.put(endpoint, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error(`❌ Erreur pour notification ${id}:`, error);
            }
        }
    };

    const handleNotificationClick = (notif) => {
        if (!isMounted.current) return;
        
        if (notif.id && !notif.est_lu && !String(notif.id).startsWith('temp_')) {
            markAsRead(notif.id);
        }
        
        setShowNotifications(false);
        const link = getNotificationLink(notif);
        if (link) navigate(link);
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
            case 'ma_demande_attente':
                return '/dashboard/manager/my-requests';
            case 'approuve_final':
            case 'refus_admin':
            case 'pre_approuve':
            case 'refus_manager':
            case 'annulation_confirme':
            case 'annulation_conge':
                return '/dashboard/employee/requests';
            case 'bulletin_paie':
                return '/dashboard/employee/payroll';
            case 'team_added':
                return '/dashboard/employee';
            default:
                if (role === 'admin') return '/dashboard/admin';
                if (role === 'manager') return '/dashboard/manager';
                return '/dashboard/employee';
        }
    };

    // Composant Avatar - Version CORRIGÉE
    const NavbarAvatar = () => {
        if (photoPreview && !imageError) {
            return (
                <img 
                    src={photoPreview} 
                    alt="Avatar" 
                    className="navbar-avatar"
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #667eea'
                    }}
                    onError={() => {
                        if (isMounted.current) {
                            setImageError(true);
                        }
                    }}
                />
            );
        }
        
        const initials = `${user?.prenom?.charAt(0) || ''}${user?.nom?.charAt(0) || ''}`;
        return (
            <div className="navbar-avatar-placeholder" style={{
                width: '32px',
                height: '32px',
                background: '#667eea',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px'
            }}>
                {initials || '?'}
            </div>
        );
    };

    return (
        <header className="app-header">
            <div className="logo-container">
                <div className="logo-icon">🏢</div>
                <h2>Gestion des Congés</h2>
            </div>
            <div className="user-info">
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
                                        >
                                            <div 
                                                className="notification-content"
                                                onClick={() => handleNotificationClick(notif)}
                                            >
                                                <strong>{notif.titre || 'Notification'}</strong>
                                                <span>{notif.message}</span>
                                                <small>{formatDateTime(notif.cree_le)}</small>
                                            </div>
                                            {!notif.est_lu && (
                                                <button 
                                                    className="mark-read-btn"
                                                    onClick={(e) => markAsRead(notif.id, e)}
                                                    title="Marquer comme lu"
                                                >
                                                    ✓
                                                </button>
                                            )}
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
                <NavbarAvatar />
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