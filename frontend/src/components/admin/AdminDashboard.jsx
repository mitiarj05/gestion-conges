// frontend/src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';
import PayrollDashboard from '../payroll/PayrollDashboard';
import GlobalCalendar from './GlobalCalendar';

function AdminDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [stats, setStats] = useState({
        employees: 0,
        managers: 0,
        pendingRequests: 0,
        alerts: 0,
        services: 0
    });
    const [users, setUsers] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [managers, setManagers] = useState([]);
    const [createForm, setCreateForm] = useState({
        nom: '', prenom: '', email: '', password: '', telephone: '', service: '', salaire_base: 500000
    });
    const [editForm, setEditForm] = useState({
        nom: '', prenom: '', email: '', telephone: '', service: '', statut: 'actif', salaire_base: 500000
    });
    const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
    const [promoteUserId, setPromoteUserId] = useState('');
    const [assignForm, setAssignForm] = useState({ employeeId: '', managerId: '' });
    const [employeesOnly, setEmployeesOnly] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [filteredLeaveRequests, setFilteredLeaveRequests] = useState([]);
    const [periodeFilter, setPeriodeFilter] = useState('all');
    const [settings, setSettings] = useState({
        cp_jours_par_an: 25,
        max_conges_consecutifs: 20,
        preavis_minimum: 2
    });
    const [processingId, setProcessingId] = useState(null);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    const COLORS = ['#667eea', '#10b981', '#ef4444', '#f59e0b'];
    const [socket, setSocket] = useState(null);
    const [realtimeNotifications, setRealtimeNotifications] = useState([]);
    
    const location = useLocation();
    const navigate = useNavigate();
    const { toasts, removeToast, success, error: toastError } = useToast();

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        if (storedUser.id) {
            const newSocket = io('http://localhost:5000');
            setSocket(newSocket);
            newSocket.emit('join', storedUser.id);
            if (storedUser.roles?.includes('admin')) {
                newSocket.emit('join_admin');
            }
            newSocket.on('new_notification', (notification) => {
                setRealtimeNotifications(prev => [notification, ...prev]);
                success(notification.titre);
                setTimeout(() => setRealtimeNotifications(prev => prev.slice(0, 5)), 10000);
            });
            return () => newSocket.close();
        }
    }, []);

    useEffect(() => {
        fetchAllData();
        fetchMonthlyStats(selectedYear);
        fetchTypeStats();
        fetchFilteredLeaveRequests('all');
        fetchAvailableYears();
        const interval = setInterval(() => {
            fetchAllData();
            fetchMonthlyStats(selectedYear);
            fetchTypeStats();
        }, 60000);
        return () => clearInterval(interval);
    }, [selectedYear]);

    const fetchAllData = async () => {
        await Promise.all([
            fetchStats(),
            fetchUsers(),
            fetchPendingApprovals(),
            fetchLeaveRequests(),
            fetchManagers(),
            fetchEmployeesOnly()
        ]);
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/stats', getAuthHeaders());
            setStats(response.data);
        } catch (error) {
            console.error('Erreur stats:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/users', getAuthHeaders());
            setUsers(response.data);
        } catch (error) {
            console.error('Erreur users:', error);
        }
    };

    const fetchPendingApprovals = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/pending-approvals', getAuthHeaders());
            setPendingApprovals(response.data);
        } catch (error) {
            console.error('Erreur pending approvals:', error);
        }
    };

    const fetchLeaveRequests = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/leave-requests', getAuthHeaders());
            setLeaveRequests(response.data);
        } catch (error) {
            console.error('Erreur leave requests:', error);
        }
    };

    const fetchMonthlyStats = async (year) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/admin/stats-by-month?year=${year}`, getAuthHeaders());
            setMonthlyStats(response.data);
        } catch (error) {
            console.error('Erreur stats mensuelles:', error);
        }
    };

    const fetchTypeStats = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/stats-by-type', getAuthHeaders());
            setTypeStats(response.data);
        } catch (error) {
            console.error('Erreur stats par type:', error);
        }
    };

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/available-years', getAuthHeaders());
            setAvailableYears(response.data);
        } catch (error) {
            console.error('Erreur récupération années:', error);
            setAvailableYears([2024, 2025, 2026]);
        }
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
        fetchMonthlyStats(year);
    };

    const fetchFilteredLeaveRequests = async (periode) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/admin/leave-requests-filtered?periode=${periode}`, getAuthHeaders());
            setFilteredLeaveRequests(response.data);
        } catch (error) {
            console.error('Erreur filtered requests:', error);
        }
    };

    const handlePeriodeChange = (periode) => {
        setPeriodeFilter(periode);
        fetchFilteredLeaveRequests(periode);
    };

    const fetchManagers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/managers-list', getAuthHeaders());
            setManagers(response.data);
        } catch (error) {
            console.error('Erreur managers:', error);
        }
    };

    const fetchEmployeesOnly = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/employees-only', getAuthHeaders());
            setEmployeesOnly(response.data);
        } catch (error) {
            console.error('Erreur employees only:', error);
        }
    };

    const refreshAll = () => {
        fetchAllData();
        fetchMonthlyStats(selectedYear);
        fetchTypeStats();
        fetchFilteredLeaveRequests(periodeFilter);
        success('Données actualisées');
    };

    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/admin/create-employee', createForm, getAuthHeaders());
            success('Employé créé avec succès');
            setShowCreateModal(false);
            setCreateForm({ nom: '', prenom: '', email: '', password: '', telephone: '', service: '', salaire_base: 500000 });
            refreshAll();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur création');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:5000/api/admin/users/${selectedUser.id}`, editForm, getAuthHeaders());
            success('Utilisateur modifié');
            setShowEditModal(false);
            setSelectedUser(null);
            refreshAll();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur modification');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (passwordForm.password !== passwordForm.confirmPassword) {
            toastError('Les mots de passe ne correspondent pas');
            return;
        }
        if (passwordForm.password.length < 6) {
            toastError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        try {
            await axios.put(`http://localhost:5000/api/admin/users/${selectedUser.id}/reset-password`, 
                { password: passwordForm.password }, getAuthHeaders());
            success('Mot de passe réinitialisé');
            setShowPasswordModal(false);
            setSelectedUser(null);
            setPasswordForm({ password: '', confirmPassword: '' });
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, getAuthHeaders());
            success('Utilisateur supprimé');
            refreshAll();
        } catch (error) {
            toastError('Erreur suppression');
        }
    };

    const handlePromoteToManager = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/admin/promote-to-manager', 
                { userId: parseInt(promoteUserId) }, getAuthHeaders());
            success('Employé promu manager');
            setShowPromoteModal(false);
            setPromoteUserId('');
            refreshAll();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur promotion');
        }
    };

    const handleAssignManager = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:5000/api/admin/assign-manager/${assignForm.employeeId}`, 
                { managerId: parseInt(assignForm.managerId) }, getAuthHeaders());
            success('Manager assigné');
            setShowAssignManagerModal(false);
            setAssignForm({ employeeId: '', managerId: '' });
            refreshAll();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur assignation');
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditForm({
            nom: user.nom || '',
            prenom: user.prenom || '',
            email: user.email || '',
            telephone: user.telephone || '',
            service: user.service || '',
            statut: user.statut || 'actif',
            salaire_base: user.salaire_base || 500000
        });
        setShowEditModal(true);
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setPasswordForm({ password: '', confirmPassword: '' });
        setShowPasswordModal(true);
    };

    const handleExportExcel = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/export-users', {
                ...getAuthHeaders(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'utilisateurs.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            success('Export réussi');
        } catch (error) {
            toastError('Erreur export');
        }
    };

    const handleExportDemandes = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/export-demandes', {
                ...getAuthHeaders(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `demandes_conges_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            success('Export des demandes réussi');
        } catch (error) {
            toastError('Erreur export des demandes');
        }
    };

    const handleFinalApprove = async (id, request_type) => {
        if (!window.confirm('Approuver définitivement cette demande ?')) return;
        setProcessingId(id);
        try {
            await axios.put(`http://localhost:5000/api/admin/final-approve/${id}`, 
                { request_type }, getAuthHeaders());
            success('Demande approuvée définitivement');
            refreshAll();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur approbation');
        } finally {
            setProcessingId(null);
        }
    };

    const handleFinalReject = async (id, request_type) => {
        const motif = prompt('Motif du refus :');
        if (!motif) return;
        setProcessingId(id);
        try {
            await axios.put(`http://localhost:5000/api/admin/final-reject/${id}`, 
                { motif, request_type }, getAuthHeaders());
            success('Demande refusée');
            refreshAll();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur refus');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await axios.put('http://localhost:5000/api/admin/settings', settings, getAuthHeaders());
            success('Paramètres enregistrés');
        } catch (error) {
            toastError('Erreur paramètres');
        }
    };

    const getStatusLabel = (statut) => {
        switch(statut) {
            case 'pending_manager': return <span className="status-badge status-badge-pending">En attente manager</span>;
            case 'pending_admin': return <span className="status-badge status-badge-admin">En attente admin</span>;
            case 'approved': return <span className="status-badge status-badge-approved">Approuvé</span>;
            case 'rejected': return <span className="status-badge status-badge-rejected">Refusé</span>;
            default: return <span className="status-badge">{statut}</span>;
        }
    };

    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toFixed(0);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                    <p style={{ margin: '5px 0 0 0', color: '#667eea' }}>
                        {payload[0].value} demande(s)
                    </p>
                </div>
            );
        }
        return null;
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

    if (currentPath.includes('/payroll')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" onLogout={onLogout} />
                    <main className="main-content">
                        <PayrollDashboard />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/calendar')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" onLogout={onLogout} />
                    <main className="main-content">
                        <GlobalCalendar />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/users')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" onLogout={onLogout} />
                    <main className="main-content">
                        <div>
                            <div className="dashboard-header">
                                <div className="dashboard-header-content">
                                    <h1 className="dashboard-title">Gestion des utilisateurs</h1>
                                    <p className="dashboard-subtitle">Gérez les comptes utilisateur de l'application</p>
                                </div>
                            </div>

                            <div className="payroll-actions">
                                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                    Ajouter un employé
                                </button>
                                <button className="btn-primary" onClick={() => setShowPromoteModal(true)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    Promouvoir manager
                                </button>
                                <button className="btn-primary" onClick={() => setShowAssignManagerModal(true)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    Assigner manager
                                </button>
                                <button className="btn-secondary" onClick={handleExportExcel}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                                    </svg>
                                    Export Excel
                                </button>
                            </div>

                            <div className="table-wrapper-modern">
                                <table className="modern-table full-width">
                                    <thead>
                                        <tr>
                                            <th>ID</th><th>Nom</th><th>Prénom</th><th>Email</th><th>Téléphone</th>
                                            <th>Service</th><th>Salaire</th><th>Rôles</th><th>Statut</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.id}</td>
                                                <td><span className="employee-name-cell">{u.nom}</span></td>
                                                <td><span className="employee-name-cell">{u.prenom}</span></td>
                                                <td>{u.email}</td>
                                                <td>{u.telephone || '-'}</td>
                                                <td>{u.service || '-'}</td>
                                                <td>{formatNumber(u.salaire_base || 500000)} Ar</td>
                                                <td>{u.roles && u.roles.map(role => <span key={role} className={`role-badge-${role}`}>{role}</span>)}</td>
                                                <td><span className={`status-badge ${u.statut === 'actif' ? 'status-badge-approved' : 'status-badge-rejected'}`}>{u.statut}</span></td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="action-btn edit" onClick={() => openEditModal(u)} title="Modifier">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M17 3l4 4-7 7H10v-4l7-7z"/>
                                                                <path d="M4 20h16"/>
                                                            </svg>
                                                        </button>
                                                        <button className="action-btn key" onClick={() => openPasswordModal(u)} title="Réinitialiser mot de passe">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                                            </svg>
                                                        </button>
                                                        <button className="action-btn delete" onClick={() => handleDeleteUser(u.id)} title="Supprimer">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Modals */}
                            {showCreateModal && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
                                <div className="modal"><div className="modal-header"><h3>Ajouter un employé</h3><button className="modal-close" onClick={() => setShowCreateModal(false)}>✖</button></div>
                                <form onSubmit={handleCreateEmployee}>
                                    <div className="form-row"><div className="form-group"><label>Nom</label><input type="text" className="form-input" value={createForm.nom} onChange={(e) => setCreateForm({...createForm, nom: e.target.value})} required /></div>
                                    <div className="form-group"><label>Prénom</label><input type="text" className="form-input" value={createForm.prenom} onChange={(e) => setCreateForm({...createForm, prenom: e.target.value})} required /></div></div>
                                    <div className="form-group"><label>Email</label><input type="email" className="form-input" value={createForm.email} onChange={(e) => setCreateForm({...createForm, email: e.target.value})} required /></div>
                                    <div className="form-group"><label>Mot de passe</label><input type="password" className="form-input" value={createForm.password} onChange={(e) => setCreateForm({...createForm, password: e.target.value})} required /></div>
                                    <div className="form-group"><label>Téléphone</label><input type="text" className="form-input" value={createForm.telephone} onChange={(e) => setCreateForm({...createForm, telephone: e.target.value})} /></div>
                                    <div className="form-group"><label>Service</label><input type="text" className="form-input" value={createForm.service} onChange={(e) => setCreateForm({...createForm, service: e.target.value})} /></div>
                                    <div className="form-group"><label>Salaire de base (Ar)</label><input type="number" className="form-input" value={createForm.salaire_base} onChange={(e) => setCreateForm({...createForm, salaire_base: e.target.value})} min="0" step="10000" /></div>
                                    <div className="modal-footer"><button type="submit" className="btn-primary">Créer</button><button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button></div>
                                </form></div>
                            </div>)}

                            {showEditModal && selectedUser && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowEditModal(false); setSelectedUser(null); }}}>
                                <div className="modal"><div className="modal-header"><h3>Modifier {selectedUser.prenom} {selectedUser.nom}</h3><button className="modal-close" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>✖</button></div>
                                <form onSubmit={handleEditUser}>
                                    <div className="form-row"><div className="form-group"><label>Nom</label><input type="text" className="form-input" value={editForm.nom} onChange={(e) => setEditForm({...editForm, nom: e.target.value})} required /></div>
                                    <div className="form-group"><label>Prénom</label><input type="text" className="form-input" value={editForm.prenom} onChange={(e) => setEditForm({...editForm, prenom: e.target.value})} required /></div></div>
                                    <div className="form-group"><label>Email</label><input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} required /></div>
                                    <div className="form-group"><label>Téléphone</label><input type="text" className="form-input" value={editForm.telephone} onChange={(e) => setEditForm({...editForm, telephone: e.target.value})} /></div>
                                    <div className="form-group"><label>Service</label><input type="text" className="form-input" value={editForm.service} onChange={(e) => setEditForm({...editForm, service: e.target.value})} /></div>
                                    <div className="form-group"><label>Salaire de base (Ar)</label><input type="number" className="form-input" value={editForm.salaire_base} onChange={(e) => setEditForm({...editForm, salaire_base: e.target.value})} min="0" step="10000" /></div>
                                    <div className="form-group"><label>Statut</label><select className="form-input" value={editForm.statut} onChange={(e) => setEditForm({...editForm, statut: e.target.value})}><option value="actif">Actif</option><option value="inactif">Inactif</option></select></div>
                                    <div className="modal-footer"><button type="submit" className="btn-primary">Enregistrer</button><button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>Annuler</button></div>
                                </form></div>
                            </div>)}

                            {showPasswordModal && selectedUser && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setSelectedUser(null); }}}>
                                <div className="modal"><div className="modal-header"><h3>Réinitialiser le mot de passe</h3><button className="modal-close" onClick={() => { setShowPasswordModal(false); setSelectedUser(null); }}>✖</button></div>
                                <p>Utilisateur : <strong>{selectedUser.prenom} {selectedUser.nom}</strong></p>
                                <form onSubmit={handleResetPassword}>
                                    <div className="form-group"><label>Nouveau mot de passe</label><input type="password" className="form-input" value={passwordForm.password} onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})} required /></div>
                                    <div className="form-group"><label>Confirmer</label><input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required /></div>
                                    <div className="modal-footer"><button type="submit" className="btn-primary">Réinitialiser</button><button type="button" className="btn-secondary" onClick={() => { setShowPasswordModal(false); setSelectedUser(null); }}>Annuler</button></div>
                                </form></div>
                            </div>)}

                            {showPromoteModal && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPromoteModal(false); }}>
                                <div className="modal"><div className="modal-header"><h3>Promouvoir en manager</h3><button className="modal-close" onClick={() => setShowPromoteModal(false)}>✖</button></div>
                                <form onSubmit={handlePromoteToManager}>
                                    <div className="form-group"><label>Sélectionner un employé</label><select className="form-input" value={promoteUserId} onChange={(e) => setPromoteUserId(e.target.value)} required>
                                        <option value="">-- Choisir --</option>{employeesOnly.map(emp => (<option key={emp.id} value={emp.id}>{emp.prenom} {emp.nom} (Salaire: {formatNumber(emp.salaire_base)} Ar)</option>))}
                                    </select></div>
                                    <div className="info-box" style={{ background: '#fef3c7', marginBottom: '15px' }}>La promotion augmentera le salaire à 1 000 000 Ar.</div>
                                    <div className="modal-footer"><button type="submit" className="btn-primary">Promouvoir</button><button type="button" className="btn-secondary" onClick={() => setShowPromoteModal(false)}>Annuler</button></div>
                                </form></div>
                            </div>)}

                            {showAssignManagerModal && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAssignManagerModal(false); }}>
                                <div className="modal"><div className="modal-header"><h3>Assigner un manager</h3><button className="modal-close" onClick={() => setShowAssignManagerModal(false)}>✖</button></div>
                                <form onSubmit={handleAssignManager}>
                                    <div className="form-group"><label>Employé</label><select className="form-input" value={assignForm.employeeId} onChange={(e) => setAssignForm({...assignForm, employeeId: e.target.value})} required>
                                        <option value="">-- Choisir --</option>{users.filter(u => u.roles && u.roles.includes('employe')).map(u => (<option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>))}
                                    </select></div>
                                    <div className="form-group"><label>Manager</label><select className="form-input" value={assignForm.managerId} onChange={(e) => setAssignForm({...assignForm, managerId: e.target.value})} required>
                                        <option value="">-- Choisir --</option>{managers.map(m => (<option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>))}
                                    </select></div>
                                    <div className="modal-footer"><button type="submit" className="btn-primary">Assigner</button><button type="button" className="btn-secondary" onClick={() => setShowAssignManagerModal(false)}>Annuler</button></div>
                                </form></div>
                            </div>)}
                        </div>
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/settings')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" onLogout={onLogout} />
                    <main className="main-content">
                        <div>
                            <div className="dashboard-header">
                                <div className="dashboard-header-content">
                                    <h1 className="dashboard-title">Paramètres de l'application</h1>
                                    <p className="dashboard-subtitle">Configuration des règles de congés</p>
                                </div>
                            </div>
                            <div className="admin-section" style={{ maxWidth: '600px' }}>
                                <h3>Paramètres des congés</h3>
                                <div className="form-group">
                                    <label>Jours CP par an</label>
                                    <input type="number" className="form-input" value={settings.cp_jours_par_an} onChange={(e) => setSettings({...settings, cp_jours_par_an: parseInt(e.target.value)})} />
                                </div>
                                <div className="form-group">
                                    <label>Max jours consécutifs</label>
                                    <input type="number" className="form-input" value={settings.max_conges_consecutifs} onChange={(e) => setSettings({...settings, max_conges_consecutifs: parseInt(e.target.value)})} />
                                </div>
                                <div className="form-group">
                                    <label>Préavis minimum (jours)</label>
                                    <input type="number" className="form-input" value={settings.preavis_minimum} onChange={(e) => setSettings({...settings, preavis_minimum: parseInt(e.target.value)})} />
                                </div>
                                <div className="payroll-actions" style={{ marginTop: '20px' }}>
                                    <button className="btn-primary" onClick={handleSaveSettings}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                            <path d="M17 21v-4H7v4M12 3v5"/>
                                        </svg>
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/logs')) {
        return (
            <>
                <Navbar user={user} role="admin" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="admin" onLogout={onLogout} />
                    <main className="main-content">
                        <div className="dashboard-header">
                            <div className="dashboard-header-content">
                                <h1 className="dashboard-title">Logs d'activité</h1>
                                <p className="dashboard-subtitle">Historique des actions de l'application</p>
                            </div>
                        </div>
                        <div className="info-card-tip">
                            <div className="tip-icon">📜</div>
                            <div className="tip-content">
                                Fonctionnalité en cours de développement.
                            </div>
                        </div>
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // DASHBOARD PRINCIPAL
    return (
        <>
            <Navbar user={user} role="admin" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="admin" onLogout={onLogout} />
                <main className="main-content">
                    <div className="dashboard-header">
                        <div className="dashboard-header-content">
                            <h1 className="dashboard-title">Tableau de bord</h1>
                            <p className="dashboard-subtitle">Bonjour {user.prenom} {user.nom} · Vue d'ensemble de l'activité</p>
                        </div>
                        <div className="dashboard-header-actions">
                            <button className="btn-refresh" onClick={refreshAll}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                                </svg>
                                Actualiser
                            </button>
                        </div>
                    </div>

                    {realtimeNotifications.length > 0 && (
                        <div className="realtime-alerts">
                            <div className="realtime-alerts-header">
                                <span className="realtime-alerts-icon">🔔</span>
                                <span>Nouvelles notifications ({realtimeNotifications.length})</span>
                            </div>
                            {realtimeNotifications.slice(0, 3).map((notif, idx) => (
                                <div key={idx} className="realtime-alert-item">
                                    <div className="realtime-alert-content">
                                        <strong>{notif.titre}</strong>
                                        <span>{notif.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

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
                                <div className="kpi-card-value">{stats.employees}</div>
                                <div className="kpi-card-label">Employés</div>
                            </div>
                        </div>

                        <div className="kpi-card-modern">
                            <div className="kpi-card-icon green">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-card-value">{stats.managers}</div>
                                <div className="kpi-card-label">Managers</div>
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
                                <div className="kpi-card-value">{stats.pendingRequests}</div>
                                <div className="kpi-card-label">Demandes en attente</div>
                            </div>
                        </div>

                        <div className="kpi-card-modern">
                            <div className="kpi-card-icon red">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 8v4M12 16h.01"/>
                                    <circle cx="12" cy="12" r="10"/>
                                </svg>
                            </div>
                            <div className="kpi-card-info">
                                <div className="kpi-card-value">{stats.alerts}</div>
                                <div className="kpi-card-label">Alertes solde bas</div>
                            </div>
                        </div>
                    </div>

                    <div className="charts-row-modern">
                        <div className="chart-card-modern">
                            <div className="chart-card-header">
                                <h3>Demandes par mois</h3>
                                <div className="year-selector">
                                    <select value={selectedYear} onChange={(e) => handleYearChange(parseInt(e.target.value))}>
                                        {availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
                                    </select>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="mois_nom" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="total" fill="#667eea" name="Demandes" radius={[8, 8, 0, 0]} barSize={35} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card-modern">
                            <h3>Répartition par type</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie data={typeStats} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={90} fill="#8884d8" dataKey="total" nameKey="type">
                                        {typeStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {pendingApprovals.length > 0 && (
                        <div className="pending-section">
                            <div className="section-header">
                                <h3>Validations en attente (2ème étape)</h3>
                                <span className="pending-count">{pendingApprovals.length}</span>
                            </div>
                            <div className="requests-list-modern">
                                {pendingApprovals.map(req => (
                                    <div key={`${req.request_type}-${req.id}`} className="request-card">
                                        <div className="request-card-info">
                                            <div className="request-employee">
                                                <div className="employee-avatar">
                                                    {req.prenom?.charAt(0)}{req.nom?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="employee-name">{req.prenom} {req.nom}</div>
                                                    <div className="request-details">
                                                        {req.date_debut} → {req.date_fin} • {req.type_name} • {req.nombre_jours} jours
                                                    </div>
                                                    {req.manager_nom && (
                                                        <div className="request-manager">Pré-validé par : {req.manager_prenom} {req.manager_nom}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="request-card-actions">
                                            <button className="btn-approve" onClick={() => handleFinalApprove(req.id, req.request_type)} disabled={processingId === req.id}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 6L9 17l-5-5"/>
                                                </svg>
                                                Approuver
                                            </button>
                                            <button className="btn-reject" onClick={() => handleFinalReject(req.id, req.request_type)} disabled={processingId === req.id}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6L6 18M6 6l12 12"/>
                                                </svg>
                                                Refuser
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="recent-section">
                        <div className="section-header">
                            <h3>Dernières demandes traitées</h3>
                            <button className="btn-export" onClick={handleExportDemandes}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                                </svg>
                                Exporter Excel
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table className="modern-table">
                                <thead>
                                    <tr><th>Employé</th><th>Dates</th><th>Type</th><th>Jours</th><th>Statut</th></tr>
                                </thead>
                                <tbody>
                                    {filteredLeaveRequests.filter(req => req.statut !== 'pending_manager').slice(0, 5).map(req => (
                                        <tr key={req.id}>
                                            <td><span className="employee-name-cell">{req.prenom} {req.nom}</span></td>
                                            <td>{req.date_debut} → {req.date_fin}</td>
                                            <td>{req.type_name}</td>
                                            <td>{req.nombre_jours}</td>
                                            <td>{getStatusLabel(req.statut)}</td>
                                        </tr>
                                    ))}
                                    {filteredLeaveRequests.filter(req => req.statut !== 'pending_manager').length === 0 && (
                                        <tr><td colSpan="5" className="empty-state">Aucune demande traitée</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-footer">
                            <button className="btn-view-all" onClick={() => navigate('/dashboard/admin/leave-requests')}>
                                Voir toutes les demandes →
                            </button>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <h3>Actions rapides</h3>
                        <div className="quick-actions-grid">
                            <button className="quick-action-btn" onClick={() => navigate('/dashboard/admin/users')}>
                                <span className="quick-action-icon">👥</span>
                                <span>Gérer utilisateurs</span>
                            </button>
                            <button className="quick-action-btn" onClick={() => navigate('/dashboard/admin/payroll')}>
                                <span className="quick-action-icon">💰</span>
                                <span>Gestion paie</span>
                            </button>
                            <button className="quick-action-btn" onClick={() => navigate('/dashboard/admin/calendar')}>
                                <span className="quick-action-icon">📅</span>
                                <span>Calendrier général</span>
                            </button>
                            <button className="quick-action-btn" onClick={() => navigate('/dashboard/admin/settings')}>
                                <span className="quick-action-icon">⚙️</span>
                                <span>Paramètres</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            <Footer />
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default AdminDashboard;