// frontend/src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import UserManagement from './UserManagement';
import CodeManagement from './CodeManagement';
import Settings from './Settings';

function AdminDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [stats, setStats] = useState({ employees: 0, managers: 0, pendingRequests: 0, alerts: 0, services: 0 });
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    const API_URL = 'http://localhost:5000/api';
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([fetchStats(), fetchLeaveRequests(), fetchPendingApprovals(), fetchLogs()]);
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/stats`, getAuthHeaders());
            setStats(response.data);
        } catch (error) { console.error('Erreur stats:', error); }
    };

    const fetchLeaveRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/leave-requests`, getAuthHeaders());
            setLeaveRequests(response.data);
        } catch (error) { console.error('Erreur:', error); }
    };

    const fetchPendingApprovals = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/pending-approvals`, getAuthHeaders());
            setPendingApprovals(response.data);
        } catch (error) { console.error('Erreur:', error); }
    };

    const fetchLogs = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/logs`, getAuthHeaders());
            setLogs(response.data);
        } catch (error) { console.error('Erreur:', error); }
    };

    const handleFinalApprove = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        if (window.confirm(`✅ Valider définitivement cette demande de ${typeLabel} ?`)) {
            try {
                await axios.put(`${API_URL}/admin/final-approve/${id}`, 
                    { request_type },
                    getAuthHeaders()
                );
                alert(`✅ Demande de ${typeLabel} définitivement approuvée !`);
                fetchPendingApprovals();
                fetchLeaveRequests();
            } catch (error) { 
                console.error('Erreur:', error);
                alert('Erreur lors de l\'approbation'); 
            }
        }
    };

    const handleFinalReject = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        const motif = prompt(`❌ Motif du refus de la ${typeLabel} :`);
        if (motif !== null) {
            try {
                await axios.put(`${API_URL}/admin/final-reject/${id}`, 
                    { motif, request_type },
                    getAuthHeaders()
                );
                alert(`❌ Demande de ${typeLabel} définitivement refusée.`);
                fetchPendingApprovals();
                fetchLeaveRequests();
            } catch (error) { 
                console.error('Erreur:', error);
                alert('Erreur lors du refus'); 
            }
        }
    };

    const getDisplayInfo = (req) => {
        if (req.request_type === 'permission') {
            return {
                dates: `${req.date_permission || req.date_debut}`,
                duration: `${req.duree_heures || req.nombre_jours} heures`,
                type: '⏰ Permission',
                managerName: `${req.manager_prenom || ''} ${req.manager_nom || ''}`.trim() || 'Manager'
            };
        }
        return {
            dates: `${req.date_debut} - ${req.date_fin}`,
            duration: `${req.nombre_jours} jours`,
            type: req.type_name,
            managerName: `${req.manager_prenom || ''} ${req.manager_nom || ''}`.trim() || 'Manager'
        };
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'pending_manager': return <span className="status status-pending">⏳ En attente manager</span>;
            case 'pending_admin': return <span className="status status-pending">🕐 En attente admin</span>;
            case 'approved': return <span className="status status-approved">✅ Approuvé</span>;
            case 'rejected': return <span className="status status-rejected">❌ Refusé</span>;
            default: return <span className="status">{status}</span>;
        }
    };

    const getTypeLabel = (typeName) => {
        if (typeName === 'RTT') {
            return 'Réduction du Temps de Travail (RTT)';
        }
        return typeName;
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
            <div className="cards-grid">
                <div className="stat-card"><div className="number">{stats.employees + stats.managers}</div><div className="label">Total utilisateurs</div></div>
                <div className="stat-card blue"><div className="number">{stats.employees}</div><div className="label">Employés</div></div>
                <div className="stat-card orange"><div className="number">{stats.managers}</div><div className="label">Managers</div></div>
                <div className="stat-card red"><div className="number">{pendingApprovals.length}</div><div className="label">À valider (Admin)</div></div>
                <div className="stat-card green"><div className="number">{stats.services}</div><div className="label">Services</div></div>
            </div>
            
            <div className="admin-section">
                <h3>⚙️ Actions Administrateur</h3>
                <div className="btn-group">
                    <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard/admin/users'}>➕ Gérer utilisateurs</button>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard/admin/codes'}>🔐 Gérer codes</button>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard/admin/settings'}>⚙️ Paramètres</button>
                </div>
            </div>
            
            {pendingApprovals.length > 0 && (
                <div className="admin-section">
                    <h3>✅ Demandes pré-approuvées (à valider définitivement)</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Dates</th>
                                    <th>Type</th>
                                    <th>Durée</th>
                                    <th>Validé par</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingApprovals.map((req) => {
                                    const info = getDisplayInfo(req);
                                    return (
                                        <tr key={`${req.request_type}-${req.id}`}>
                                            <td>{req.prenom} {req.nom}</td>
                                            <td>{info.dates}</td>
                                            <td>{info.type}</td>
                                            <td>{info.duration}</td>
                                            <td>{info.managerName}</td>
                                            <td>
                                                <button className="btn btn-sm btn-success" onClick={() => handleFinalApprove(req.id, req.request_type)}>✅ Approuver</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleFinalReject(req.id, req.request_type)}>❌ Refuser</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="admin-section">
                <h3>📋 Toutes les demandes de congé</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employé</th>
                                <th>Dates</th>
                                <th>Type</th>
                                <th>Durée</th>
                                <th>Statut</th>
                                <th>Date demande</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaveRequests.slice(0, 10).map((req) => (
                                <tr key={req.id}>
                                    <td>{req.prenom} {req.nom}</td>
                                    <td>{req.date_debut} - {req.date_fin}</td>
                                    <td>{getTypeLabel(req.type_name)}</td>
                                    <td>{req.nombre_jours} jours</td>
                                    <td>{getStatusLabel(req.statut)}</td>
                                    <td>{new Date(req.cree_le).toLocaleDateString('fr-FR')}</td>
                                </tr>
                            ))}
                            {leaveRequests.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center' }}>Aucune demande de congé</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="info-box">
                <strong>ℹ️ Processus :</strong> Manager (1ère validation) → Admin (validation finale)
            </div>
        </>
    );

    const LogsPage = () => (
        <>
            <h2>📜 Logs système</h2>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Utilisateur</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td>{new Date(log.cree_le).toLocaleString()}</td>
                                <td>{log.prenom} {log.nom || 'Système'}</td>
                                <td>{log.action}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center' }}>Aucun log disponible</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );

    const currentPath = location.pathname;

    if (currentPath.includes('/users')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" />
                    <main className="main-content">
                        <UserManagement />
                    </main>
                </div>
                <Footer />
            </>
        );
    }
    
    if (currentPath.includes('/codes')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" />
                    <main className="main-content">
                        <CodeManagement />
                    </main>
                </div>
                <Footer />
            </>
        );
    }
    
    if (currentPath.includes('/logs')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" />
                    <main className="main-content">
                        <LogsPage />
                    </main>
                </div>
                <Footer />
            </>
        );
    }
    
    if (currentPath.includes('/settings')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" />
                    <main className="main-content">
                        <Settings />
                    </main>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar user={user} role="admin" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="admin" />
                <main className="main-content">
                    <DashboardHome />
                </main>
            </div>
            <Footer />
        </>
    );
}

export default AdminDashboard;