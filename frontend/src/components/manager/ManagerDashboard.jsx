// frontend/src/components/manager/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import TeamList from './TeamList';
import PendingValidations from './PendingValidations';
import TeamStatistics from './TeamStatistics';
import TeamCalendar from './TeamCalendar';
import ManagerStats from './ManagerStats';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';

function ManagerDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [pendingRequests, setPendingRequests] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [balance, setBalance] = useState({ cp_restant: 15, rtt_restant: 6, permission: 1 });
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    const { toasts, removeToast, success, error, warning, info } = useToast();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
        
        const interval = setInterval(() => {
            fetchAllData();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    const getAuthHeaders = () => ({ 
        headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}` 
        } 
    });

    const fetchAllData = async () => {
        await Promise.all([fetchPendingRequests(), fetchTeamMembers(), fetchBalance()]);
        setLoading(false);
    };

    const refreshAllData = () => {
        fetchAllData();
    };

    const fetchPendingRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await axios.get('http://localhost:5000/api/leaves/team-pending', getAuthHeaders());
            setPendingRequests(response.data);
            console.log(`📋 ${response.data.length} demandes en attente de validation`);
        } catch (error) {
            console.error('Erreur fetchPendingRequests:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/users/my-team', getAuthHeaders());
            setTeamMembers(response.data);
            console.log(`👥 Équipe: ${response.data.length} membres`);
        } catch (error) {
            console.error('Erreur fetchTeamMembers:', error);
            setTeamMembers([]);
        }
    };

    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/leaves/balance', getAuthHeaders());
            setBalance(response.data);
        } catch (error) {
            console.error('Erreur fetchBalance:', error);
        }
    };

    const refreshData = () => {
        fetchAllData();
        success('Données actualisées');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement...</div>
            </div>
        );
    }

    // Dashboard Home avec statistiques améliorées
    const DashboardHome = () => (
        <>
            <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
            
            {/* Statistiques améliorées */}
            <ManagerStats />
            
            {/* Demandes en attente */}
            {pendingRequests.length > 0 && (
                <>
                    <h3 style={{ marginTop: '30px' }}>📋 Demandes en attente de validation (1ère étape)</h3>
                    <PendingValidations requests={pendingRequests} onRefresh={refreshData} />
                </>
            )}
            
            {pendingRequests.length === 0 && (
                <div className="info-box" style={{ marginTop: '20px', background: '#d4edda' }}>
                    ✅ Aucune demande en attente. Toutes les demandes ont été traitées.
                </div>
            )}
            
            {/* Mon solde */}
            <div className="cards-grid mt-20">
                <div className="card">
                    <h3>🏖️ Congés Payés</h3>
                    <div className="value">{balance.cp_restant || 15} jours</div>
                    <div className="small">Mon solde restant</div>
                </div>
                <div className="card">
                    <h3>📅 RTT</h3>
                    <div className="value">{balance.rtt_restant || 6} jours</div>
                    <div className="small">Mon solde restant</div>
                </div>
                <div className="card">
                    <h3>⏰ Permissions</h3>
                    <div className="value">{balance.permission || 1}h</div>
                    <div className="small">Utilisées ce mois</div>
                </div>
            </div>
            
            {/* Boutons d'action rapide */}
            <div className="btn-group mt-20">
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/team')}>
                    👥 Gérer mon équipe
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/validations')}>
                    ✅ Valider les demandes
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/team-calendar')}>
                    📅 Calendrier équipe
                </button>
            </div>
            
            {teamMembers.length === 0 && (
                <div className="info-box" style={{ marginTop: '20px', background: '#e8f4fd' }}>
                    <strong>💡 Conseil :</strong> Commencez par ajouter des membres à votre équipe dans l'onglet "Mon équipe" 
                    pour pouvoir gérer leurs demandes de congé.
                </div>
            )}
            
            <div className="info-box" style={{ marginTop: '20px', background: '#fff3cd' }}>
                <strong>ℹ️ Processus de validation :</strong><br/>
                1️⃣ Vous validez la demande (1ère étape) → L'employé est notifié<br/>
                2️⃣ L'administrateur valide définitivement (2ème étape) → L'employé est notifié
            </div>
        </>
    );

    const currentPath = location.pathname;
    console.log('🔍 Current path in ManagerDashboard:', currentPath);

    // Route pour Calendrier équipe
    if (currentPath === '/dashboard/manager/team-calendar' || currentPath.includes('/team-calendar')) {
        console.log('✅ Affichage de TeamCalendar');
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="manager" />
                    <main className="main-content">
                        <TeamCalendar />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route pour Mon équipe (TeamList)
    if (currentPath === '/dashboard/manager/team' || currentPath.includes('/team')) {
        console.log('✅ Affichage de TeamList');
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="manager" />
                    <main className="main-content">
                        <TeamList teamMembers={teamMembers} onRefresh={refreshData} />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route pour Validations
    if (currentPath.includes('/validations')) {
        console.log('✅ Affichage de PendingValidations');
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="manager" />
                    <main className="main-content">
                        <PendingValidations requests={pendingRequests} onRefresh={refreshData} />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route pour Statistiques
    if (currentPath.includes('/statistics')) {
        console.log('✅ Affichage de TeamStatistics');
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="manager" />
                    <main className="main-content">
                        <TeamStatistics teamMembers={teamMembers} />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Dashboard par défaut
    console.log('✅ Affichage du Dashboard par défaut avec statistiques améliorées');
    return (
        <>
            <Navbar user={user} role="manager" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="manager" />
                <main className="main-content">
                    <DashboardHome />
                </main>
            </div>
            <Footer />
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default ManagerDashboard;