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
    const [balance, setBalance] = useState({ cp_restant: 25 });
    const [loading, setLoading] = useState(true);
    const [periodeFilter, setPeriodeFilter] = useState('all');
    const location = useLocation();
    const navigate = useNavigate();

    const { toasts, removeToast, success } = useToast();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
        const interval = setInterval(() => fetchAllData(), 30000);
        return () => clearInterval(interval);
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
            const response = await axios.get('http://localhost:5000/api/leaves/team-pending', getAuthHeaders());
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
            const response = await axios.get(`http://localhost:5000/api/leaves/team-pending-filtered?periode=${periode}`, getAuthHeaders());
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
            const response = await axios.get('http://localhost:5000/api/users/my-team', getAuthHeaders());
            setTeamMembers(response.data);
        } catch (error) {
            console.error('Erreur fetchTeamMembers:', error);
            setTeamMembers([]);
        }
    };

    const fetchBalance = async () => {
        try {
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

    const DashboardHome = () => (
        <>
            <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>👔 Tableau de bord Manager</p>
            
            <ManagerStats />
            
            <div className="actions-bar" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '15px' }}>
                <h3>📋 Demandes de l'équipe</h3>
                <div className="btn-group">
                    <button className={`btn btn-sm ${periodeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('all')}>Toutes</button>
                    <button className={`btn btn-sm ${periodeFilter === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('month')}>Ce mois</button>
                    <button className={`btn btn-sm ${periodeFilter === 'quarter' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('quarter')}>Ce trimestre</button>
                    <button className={`btn btn-sm ${periodeFilter === 'year' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('year')}>Cette année</button>
                </div>
            </div>
            
            {pendingRequests.length > 0 ? (
                <>
                    <h3>📋 Demandes en attente de validation (1ère étape)</h3>
                    <PendingValidations requests={pendingRequests} onRefresh={refreshData} />
                </>
            ) : (
                <div className="info-box" style={{ background: '#d1fae5', borderLeftColor: '#10b981' }}>
                    ✅ Aucune demande en attente. Toutes les demandes ont été traitées.
                </div>
            )}
            
            <div className="cards-grid mt-20">
                <div className="card">
                    <h3>🏖️ Congés Payés</h3>
                    <div className="value">{balance.cp_restant || 25} jours</div>
                    <div className="small">Mon solde restant</div>
                </div>
            </div>
            
            <div className="btn-group mt-20">
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/team')}>👥 Gérer mon équipe</button>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/validations')}>✅ Valider les demandes</button>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/team-calendar')}>📅 Calendrier équipe</button>
            </div>
            
            {teamMembers.length === 0 && (
                <div className="info-box" style={{ marginTop: '20px', background: '#eff6ff' }}>
                    <strong>💡 Conseil :</strong> Commencez par ajouter des membres à votre équipe dans l'onglet "Mon équipe".
                </div>
            )}
            
            <div className="info-box" style={{ marginTop: '20px', background: '#fef3c7' }}>
                <strong>ℹ️ Processus de validation :</strong><br/>
                1️⃣ Vous validez la demande (1ère étape)<br/>
                2️⃣ L'administrateur valide définitivement (2ème étape)
            </div>
        </>
    );

    const currentPath = location.pathname;

    if (currentPath === '/dashboard/manager/team-calendar' || currentPath.includes('/team-calendar')) {
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container"><Sidebar role="manager" /><main className="main-content"><TeamCalendar /></main></div>
                <Footer /><ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath === '/dashboard/manager/team' || currentPath.includes('/team')) {
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container"><Sidebar role="manager" /><main className="main-content"><TeamList teamMembers={teamMembers} onRefresh={refreshData} /></main></div>
                <Footer /><ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/validations')) {
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container"><Sidebar role="manager" /><main className="main-content"><PendingValidations requests={pendingRequests} onRefresh={refreshData} /></main></div>
                <Footer /><ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/statistics')) {
        return (
            <>
                <Navbar user={user} role="manager" onLogout={onLogout} />
                <div className="app-container"><Sidebar role="manager" /><main className="main-content"><TeamStatistics teamMembers={teamMembers} /></main></div>
                <Footer /><ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    return (
        <>
            <Navbar user={user} role="manager" onLogout={onLogout} />
            <div className="app-container"><Sidebar role="manager" /><main className="main-content"><DashboardHome /></main></div>
            <Footer /><ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default ManagerDashboard;