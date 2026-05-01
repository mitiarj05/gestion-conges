// frontend/src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
    
    const getAuthHeaders = useCallback(() => ({ 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    }), []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/stats`, getAuthHeaders());
            setStats(response.data);
        } catch (error) { 
            console.error('Erreur stats:', error); 
        }
    }, [API_URL, getAuthHeaders]);

    const fetchLeaveRequests = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/leave-requests`, getAuthHeaders());
            setLeaveRequests(response.data);
        } catch (error) { 
            console.error('Erreur fetch leave requests:', error); 
        }
    }, [API_URL, getAuthHeaders]);

    const fetchPendingApprovals = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/pending-approvals`, getAuthHeaders());
            setPendingApprovals(response.data);
        } catch (error) { 
            console.error('Erreur fetch pending approvals:', error); 
        }
    }, [API_URL, getAuthHeaders]);

    const fetchLogs = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/logs`, getAuthHeaders());
            setLogs(response.data);
        } catch (error) { 
            console.error('Erreur fetch logs:', error); 
        }
    }, [API_URL, getAuthHeaders]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchStats(), fetchLeaveRequests(), fetchPendingApprovals(), fetchLogs()]);
        setLoading(false);
    }, [fetchStats, fetchLeaveRequests, fetchPendingApprovals, fetchLogs]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
    }, [fetchAllData]);

    const handleFinalApprove = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        if (window.confirm(`✅ Valider définitivement cette demande de ${typeLabel} ?`)) {
            try {
                const response = await axios.put(`${API_URL}/admin/final-approve/${id}`, 
                    { request_type },
                    getAuthHeaders()
                );
                alert(`✅ Demande de ${typeLabel} définitivement approuvée !\n\n${response.data.message || ''}`);
                await fetchPendingApprovals();
                await fetchLeaveRequests();
            } catch (error) { 
                console.error('Erreur approbation:', error);
                const errorMsg = error.response?.data?.message || error.message || 'Erreur inconnue';
                alert(`❌ Erreur lors de l'approbation:\n\n${errorMsg}`);
            }
        }
    };

    const handleFinalReject = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        const motif = prompt(`❌ Motif du refus de la ${typeLabel} :\n\nVeuillez indiquer la raison du refus (cette information sera communiquée à l'employé)`);
        
        if (motif !== null && motif.trim() !== '') {
            try {
                const response = await axios.put(`${API_URL}/admin/final-reject/${id}`, 
                    { motif: motif.trim(), request_type },
                    getAuthHeaders()
                );
                alert(`❌ Demande de ${typeLabel} définitivement refusée.\n\nMotif : ${motif}\n\n${response.data.message || ''}`);
                await fetchPendingApprovals();
                await fetchLeaveRequests();
            } catch (error) { 
                console.error('Erreur refus:', error);
                const errorMsg = error.response?.data?.message || error.message || 'Erreur inconnue';
                alert(`❌ Erreur lors du refus:\n\n${errorMsg}`);
            }
        } else if (motif !== null && motif.trim() === '') {
            alert('Veuillez fournir un motif de refus');
        }
    };

    const getDisplayInfo = (req) => {
        if (req.request_type === 'permission') {
            return {
                dates: req.date_debut || req.date_permission || 'N/A',
                duration: `${req.nombre_jours || req.duree_heures || 0} heures`,
                type: '⏰ Permission',
                managerName: `${req.manager_prenom || ''} ${req.manager_nom || ''}`.trim() || 'Manager'
            };
        }
        return {
            dates: `${req.date_debut || 'N/A'} - ${req.date_fin || 'N/A'}`,
            duration: `${req.nombre_jours || 0} jours`,
            type: req.type_name || 'Congé',
            managerName: `${req.manager_prenom || ''} ${req.manager_nom || ''}`.trim() || 'Manager'
        };
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'pending_manager': 
                return <span className="status status-pending">⏳ En attente manager</span>;
            case 'pending_admin': 
                return <span className="status status-pending">🕐 En attente admin</span>;
            case 'approved': 
                return <span className="status status-approved">✅ Approuvé</span>;
            case 'rejected': 
                return <span className="status status-rejected">❌ Refusé</span>;
            default: 
                return <span className="status">{status || 'Inconnu'}</span>;
        }
    };

    const getTypeLabel = (typeName) => {
        if (typeName === 'RTT') {
            return 'Réduction du Temps de Travail (RTT)';
        }
        return typeName || 'Congé';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR');
        } catch {
            return dateString;
        }
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
                                            <td>{req.prenom || '?'} {req.nom || '?'}</td>
                                            <td>{info.dates}</td>
                                            <td>{info.type}</td>
                                            <td>{info.duration}</td>
                                            <td>{info.managerName}</td>
                                            <td>
                                                <button 
                                                    className="btn btn-sm btn-success" 
                                                    onClick={() => handleFinalApprove(req.id, req.request_type)}
                                                    style={{ marginRight: '5px' }}
                                                >
                                                    ✅ Approuver
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-danger" 
                                                    onClick={() => handleFinalReject(req.id, req.request_type)}
                                                >
                                                    ❌ Refuser
                                                </button>
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
                                    <td>{req.prenom || '?'} {req.nom || '?'}</td>
                                    <td>{formatDate(req.date_debut)} - {formatDate(req.date_fin)}</td>
                                    <td>{getTypeLabel(req.type_name)}</td>
                                    <td>{req.nombre_jours || 0} jours</td>
                                    <td>{getStatusLabel(req.statut)}</td>
                                    <td>{formatDate(req.cree_le)}</td>
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
                                <td>{formatDate(log.cree_le)}</td>
                                <td>{log.prenom || ''} {log.nom || 'Système'}</td>
                                <td>{log.action || '-'}</td>
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