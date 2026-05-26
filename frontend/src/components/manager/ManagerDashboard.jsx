// frontend/src/components/manager/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import TeamList from './TeamList';
import PendingValidations from './PendingValidations';
import TeamStatistics from './TeamStatistics';
import TeamCalendar from './TeamCalendar';
import LeaveRequest from '../employee/LeaveRequest';
import ManagerMyRequests from './MyRequests';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';
import Profile from '../common/Profile';

console.log('📁 [ManagerDashboard] Chargement du module');

function ManagerDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [pendingRequests, setPendingRequests] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [balance, setBalance] = useState({ cp_restant: 25 });
    const [loading, setLoading] = useState(true);
    const [periodeFilter, setPeriodeFilter] = useState('all');
    const location = useLocation();
    const navigate = useNavigate();

    const { toasts, removeToast, success } = useToast();

    console.log(`🔧 [ManagerDashboard] Initialisation - path: ${location.pathname}`);

    useEffect(() => {
        console.log('📦 [ManagerDashboard] Montage');
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
        const interval = setInterval(() => fetchAllData(), 30000);
        return () => {
            console.log('🗑️ [ManagerDashboard] Démontage');
            clearInterval(interval);
        };
    }, []);

    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchAllData = async () => {
        await Promise.all([fetchPendingRequests(), fetchTeamMembers(), fetchBalance()]);
        setLoading(false);
    };

    const refreshAllData = () => fetchAllData();

    const fetchPendingRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            const response = await axios.get(`${API_URL}/leaves/team-pending`, getAuthHeaders());
            setPendingRequests(response.data);
        } catch (error) {
            console.error('Erreur fetchPendingRequests:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
    };

    const fetchFilteredTeamRequests = async (periode) => {
        try {
            const response = await axios.get(`${API_URL}/leaves/team-pending-filtered?periode=${periode}`, getAuthHeaders());
            setPendingRequests(response.data);
        } catch (error) {
            console.error('Erreur fetch filtered:', error);
        }
    };

    const handlePeriodeChange = (periode) => {
        setPeriodeFilter(periode);
        fetchFilteredTeamRequests(periode);
    };

    const fetchTeamMembers = async () => {
        try {
            const response = await axios.get(`${API_URL}/users/my-team`, getAuthHeaders());
            setTeamMembers(response.data);
        } catch (error) {
            console.error('Erreur fetchTeamMembers:', error);
            setTeamMembers([]);
        }
    };

    const fetchBalance = async () => {
        try {
            const response = await axios.get(`${API_URL}/leaves/balance`, getAuthHeaders());
            setBalance(response.data);
        } catch (error) {
            console.error('Erreur fetchBalance:', error);
        }
    };

    const refreshData = () => {
        fetchAllData();
        success('Données actualisées');
    };

    const handleRequestSuccess = () => {
        refreshAllData();
        success('Demande de congé envoyée !');
        navigate('/dashboard/manager');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement...</div>
            </div>
        );
    }

    const currentPath = location.pathname;

    // Fonction pour déterminer le contenu à afficher selon la route
    const renderContent = () => {
        console.log(`🎨 [ManagerDashboard] Rendu du contenu pour: ${currentPath}`);

        // Page Mon profil
        if (currentPath === '/dashboard/manager/profile') {
            return (
                <Profile user={user} role="manager" onLogout={onLogout} onProfileUpdate={(updatedUser) => {
                    setUser(updatedUser);
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedUser }));
                }} />
            );
        }

        // Route pour Mes demandes
        if (currentPath === '/dashboard/manager/my-requests') {
            return <ManagerMyRequests />;
        }

        // Nouvelle demande
        if (currentPath === '/dashboard/manager/new-request') {
            return <LeaveRequest onSuccess={handleRequestSuccess} />;
        }

        // Calendrier équipe
        if (currentPath === '/dashboard/manager/team-calendar' || currentPath.includes('/team-calendar')) {
            return <TeamCalendar />;
        }

        // Gestion de l'équipe
        if (currentPath === '/dashboard/manager/team' || currentPath.includes('/team')) {
            return <TeamList teamMembers={teamMembers} onRefresh={refreshData} />;
        }

        // Validations
        if (currentPath.includes('/validations')) {
            return <PendingValidations requests={pendingRequests} onRefresh={refreshData} />;
        }

        // Statistiques
        if (currentPath.includes('/stats')) {
            return <TeamStatistics teamMembers={teamMembers} />;
        }

        // Dashboard principal par défaut
        return (
            <>
                <div className="dashboard-header">
                    <div className="dashboard-header-content">
                        <h1 className="dashboard-title">Tableau de bord Manager</h1>
                        <p className="dashboard-subtitle">Bonjour {user.prenom} {user.nom} · Gérez les demandes de votre équipe</p>
                    </div>
                    <div className="dashboard-header-actions">
                        <button className="btn-refresh" onClick={refreshData}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                            Actualiser
                        </button>
                    </div>
                </div>
                
                <div className="kpi-grid">
                    <div className="kpi-card-modern">
                        <div className="kpi-card-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div className="kpi-card-info">
                            <div className="kpi-card-value">{teamMembers.length}</div>
                            <div className="kpi-card-label">Mon équipe</div>
                            <div className="kpi-card-sub">membres</div>
                        </div>
                    </div>

                    <div className="kpi-card-modern">
                        <div className="kpi-card-icon orange">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                        </div>
                        <div className="kpi-card-info">
                            <div className="kpi-card-value">{pendingRequests.length}</div>
                            <div className="kpi-card-label">Demandes en attente</div>
                            <div className="kpi-card-sub">à valider</div>
                        </div>
                    </div>

                    <div className="kpi-card-modern">
                        <div className="kpi-card-icon green">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                            </svg>
                        </div>
                        <div className="kpi-card-info">
                            <div className="kpi-card-value">{balance.cp_restant || 25} jours</div>
                            <div className="kpi-card-label">Mon solde CP</div>
                            <div className="kpi-card-sub">restants</div>
                        </div>
                    </div>
                </div>
                
                <div className="filter-bar">
                    <div className="filter-bar-label">Période :</div>
                    <div className="filter-buttons">
                        <button className={`filter-btn ${periodeFilter === 'all' ? 'active' : ''}`} onClick={() => handlePeriodeChange('all')}>Toutes</button>
                        <button className={`filter-btn ${periodeFilter === 'month' ? 'active' : ''}`} onClick={() => handlePeriodeChange('month')}>Ce mois</button>
                        <button className={`filter-btn ${periodeFilter === 'quarter' ? 'active' : ''}`} onClick={() => handlePeriodeChange('quarter')}>Ce trimestre</button>
                        <button className={`filter-btn ${periodeFilter === 'year' ? 'active' : ''}`} onClick={() => handlePeriodeChange('year')}>Cette année</button>
                    </div>
                </div>
                
                <div className="pending-section">
                    <div className="section-header">
                        <h3>Demandes à valider</h3>
                        {pendingRequests.length > 0 && <span className="pending-count">{pendingRequests.length}</span>}
                    </div>
                    {pendingRequests.length > 0 ? (
                        <PendingValidations requests={pendingRequests} onRefresh={refreshData} />
                    ) : (
                        <div className="empty-state-card">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            <p>Aucune demande en attente</p>
                            <span>Toutes les demandes ont été traitées</span>
                        </div>
                    )}
                </div>
                
                <div className="quick-actions">
                    <h3>Actions rapides</h3>
                    <div className="quick-actions-grid">
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/manager/profile')}>
                            <span className="quick-action-icon">👤</span>
                            <span>Mon profil</span>
                        </button>
                        <button className="quick-action-btn primary" onClick={() => navigate('/dashboard/manager/new-request')}>
                            <span className="quick-action-icon">📝</span>
                            <span>Faire une demande de congé</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/manager/team')}>
                            <span className="quick-action-icon">👥</span>
                            <span>Gérer mon équipe</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/manager/validations')}>
                            <span className="quick-action-icon">✅</span>
                            <span>Toutes les validations</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/manager/team-calendar')}>
                            <span className="quick-action-icon">📅</span>
                            <span>Calendrier équipe</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/manager/stats')}>
                            <span className="quick-action-icon">📊</span>
                            <span>Statistiques</span>
                        </button>
                    </div>
                </div>
                
                {teamMembers.length === 0 && (
                    <div className="info-card-tip">
                        <div className="tip-icon">💡</div>
                        <div className="tip-content">
                            <strong>Conseil :</strong> Ajoutez des membres à votre équipe dans l'onglet "Mon équipe" pour commencer à gérer leurs demandes.
                        </div>
                    </div>
                )}
            </>
        );
    };

    // Layout commun avec un seul return
    return (
        <>
            <Navbar user={user} role="manager" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="manager" onLogout={onLogout} />
                <main className="main-content">
                    {renderContent()}
                    <Footer />
                </main>
            </div>
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default ManagerDashboard;