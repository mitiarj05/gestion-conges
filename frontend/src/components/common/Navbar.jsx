// frontend/src/components/common/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import axios from 'axios';
import { API_URL, getBaseUrl } from '../../config/api';

function Navbar({ user, role, onLogout }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [photoPreview, setPhotoPreview] = useState(null);
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

    useEffect(() => {
        if (user?.photo_url) {
            const baseUrl = getBaseUrl();
            setPhotoPreview(`${baseUrl}${user.photo_url}`);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            console.log('=== RÉCUPÉRATION NOTIFICATIONS ===');
            console.log('Rôle:', role);
            console.log('User ID:', user?.id);
            console.log('Timestamp:', new Date().toISOString());

            let endpoint = '';
            if (role === 'admin') {
                endpoint = `${API_URL}/admin/notifications`;
            } else {
                endpoint = `${API_URL}/leaves/notifications`;
            }

            console.log('Endpoint:', endpoint);

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            
            console.log(`📥 Notifications reçues du backend: ${response.data.length}`);
            
            // Log détaillé de chaque notification
            response.data.forEach((n, i) => {
                console.log(`   ${i+1}. ID: ${n.id}, Type: ${n.type}, Titre: ${n.titre}, est_lu: ${n.est_lu}`);
            });
            
            let filteredNotifications = response.data;
            
            // Filtrer selon le rôle
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
                console.log(`📊 Filtre employé - notifications gardées: ${filteredNotifications.length}`);
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
                console.log(`📊 Filtre manager - notifications gardées: ${filteredNotifications.length}`);
            } else if (role === 'admin') {
                filteredNotifications = response.data;
                console.log(`📊 Filtre admin - toutes notifications gardées: ${filteredNotifications.length}`);
            }
            
            // Ajouter un identifiant unique pour les notifications sans id
            const notificationsWithId = filteredNotifications.map((notif, index) => {
                if (!notif.id) {
                    const tempId = `temp_${notif.type}_${index}_${Date.now()}`;
                    console.log(`🔧 Génération ID temporaire pour notification sans ID: ${tempId}`);
                    return { ...notif, id: tempId };
                }
                return notif;
            });
            
            console.log(`📋 Notifications finales avec IDs: ${notificationsWithId.length}`);
            notificationsWithId.forEach(n => {
                console.log(`   - ID: ${n.id}, est_lu: ${n.est_lu}, type: ${n.type}`);
            });
            
            setNotifications(notificationsWithId);
            const newUnreadCount = notificationsWithId.filter(n => !n.est_lu).length;
            setUnreadCount(newUnreadCount);
            console.log(`🔔 Compte non lues: ${newUnreadCount}`);
            console.log('=== FIN RÉCUPÉRATION NOTIFICATIONS ===');
        } catch (error) {
            console.error('Erreur chargement notifications:', error.message);
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    const markAsRead = async (id, event) => {
        if (event) {
            event.stopPropagation();
        }
        
        console.log(`🔔 MARK AS READ - Notification ID: ${id}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        
        // Vérifier si c'est un ID temporaire
        if (typeof id === 'string' && id.startsWith('temp_')) {
            console.log(`📝 Notification temporaire, mise à jour locale uniquement`);
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === id ? { ...notif, est_lu: true } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            console.log(`✅ Notification temporaire marquée comme lue localement`);
            return;
        }
        
        // Mise à jour locale immédiate
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === id ? { ...notif, est_lu: true } : notif
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        console.log(`📝 Mise à jour locale effectuée pour ID: ${id}`);
        
        try {
            const token = localStorage.getItem('token');
            let endpoint = `${API_URL}/leaves/notifications/${id}/read`;

            if (role === 'admin') {
                endpoint = `${API_URL}/admin/notifications/${id}/read`;
            }

            console.log(`📡 Appel API: PUT ${endpoint}`);
            
            const response = await axios.put(endpoint, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log(`✅ API Response:`, response.data);
            console.log(`✅ Notification ${id} marquée comme lue avec succès en base`);
            
            // Rafraîchir les notifications pour s'assurer que l'état est cohérent
            setTimeout(() => {
                console.log(`🔄 Rafraîchissement des notifications après marquage...`);
                fetchNotifications();
            }, 500);
            
        } catch (error) {
            console.error(`❌ Erreur lors du marquage comme lu:`, error);
            console.error(`Status:`, error.response?.status);
            console.error(`Data:`, error.response?.data);
        }
    };

    const markAllAsRead = async () => {
        console.log(`🔔 MARK ALL AS READ`);
        
        const realIds = notifications.filter(n => !n.est_lu && n.id && !String(n.id).startsWith('temp_')).map(n => n.id);
        const tempIds = notifications.filter(n => !n.est_lu && String(n.id).startsWith('temp_')).map(n => n.id);
        
        console.log(`IDs réels à marquer: ${realIds.length}, IDs temporaires: ${tempIds.length}`);
        
        // Mise à jour locale immédiate
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
                console.log(`✅ Notification ${id} marquée comme lue`);
            } catch (error) {
                console.error(`❌ Erreur pour notification ${id}:`, error);
            }
        }
        
        // Rafraîchir après marquage
        setTimeout(() => {
            fetchNotifications();
        }, 500);
    };

    const handleNotificationClick = (notif) => {
        console.log(`🔔 Clic sur notification: ID: ${notif.id}, Type: ${notif.type}, est_lu: ${notif.est_lu}`);
        
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

    const NavbarAvatar = () => {
        if (photoPreview) {
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
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="navbar-avatar-placeholder" style="width: 32px; height: 32px; background: #667eea; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">${user?.prenom?.charAt(0) || ''}${user?.nom?.charAt(0) || ''}</div>`;
                    }}
                />
            );
        }
        
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
                {user?.prenom?.charAt(0) || ''}{user?.nom?.charAt(0) || ''}
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