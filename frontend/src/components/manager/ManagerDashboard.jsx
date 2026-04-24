// frontend/src/components/manager/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import TeamList from './TeamList';
import PendingValidations from './PendingValidations';

function ManagerDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [pendingRequests, setPendingRequests] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [balance, setBalance] = useState({ paid: 15, rtt: 6, permission: 1 });
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

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
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement...</div>
            </div>
        );
    }

    // Dashboard Home
    const DashboardHome = () => (
        <>
            <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
            
            <div className="manager-section">
                <h3>👥 SECTION MANAGER - 1ère validation</h3>
                <div className="cards-grid">
                    <div className="stat-card blue">
                        <div className="number">{teamMembers.length}</div>
                        <div className="label">👥 Membres dans mon équipe</div>
                    </div>
                    <div className="stat-card orange">
                        <div className="number">{pendingRequests.length}</div>
                        <div className="label">⏳ Demandes à valider (1ère étape)</div>
                    </div>
                </div>
                <div className="btn-group mt-20">
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/team')}>
                        👥 Gérer mon équipe
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard/manager/validations')}>
                        ✅ Valider les demandes
                    </button>
                </div>
            </div>
            
            {pendingRequests.length > 0 && (
                <>
                    <h3>📋 Demandes en attente de validation</h3>
                    <PendingValidations requests={pendingRequests} onRefresh={refreshData} />
                </>
            )}
            
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
            
            <div className="cards-grid mt-20">
                <div className="card">
                    <h3>🏖️ Congés Payés</h3>
                    <div className="value">{balance.paid || 15} jours</div>
                    <div className="small">Mon solde restant</div>
                </div>
                <div className="card">
                    <h3>📅 Réduction du Temps de Travail (RTT)</h3>
                    <div className="value">{balance.rtt || 6} jours</div>
                    <div className="small">Mon solde restant</div>
                </div>
                <div className="card">
                    <h3>⏰ Permissions</h3>
                    <div className="value">{balance.permission || 1}h</div>
                    <div className="small">Utilisées ce mois</div>
                </div>
            </div>
        </>
    );

    const currentPath = location.pathname;

    if (currentPath.includes('/team')) {
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
            </>
        );
    }

    if (currentPath.includes('/validations')) {
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
            </>
        );
    }

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
        </>
    );
}

export default ManagerDashboard;