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
            case 'pending_manager': return <span className="status status-pending-manager">En attente manager</span>;
            case 'pending_admin': return <span className="status status-pending-admin">En attente admin</span>;
            case 'approved': return <span className="status status-approved">Approuvé</span>;
            case 'rejected': return <span className="status status-rejected">Refusé</span>;
            default: return <span className="status">{statut}</span>;
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
                            <div className="actions-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2>Gestion des utilisateurs</h2>
                                <div className="btn-group">
                                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Ajouter un employé</button>
                                    <button className="btn btn-secondary" onClick={() => setShowPromoteModal(true)}>Promouvoir manager</button>
                                    <button className="btn btn-secondary" onClick={() => setShowAssignManagerModal(true)}>Assigner manager</button>
                                    <button className="btn btn-secondary" onClick={handleExportExcel}>Export Excel</button>
                                </div>
                            </div>
                            <div className="table-container">
                                <table className="table">
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
                                                <td>{u.nom}</td>
                                                <td>{u.prenom}</td>
                                                <td>{u.email}</td>
                                                <td>{u.telephone || '-'}</td>
                                                <td>{u.service || '-'}</td>
                                                <td>{formatNumber(u.salaire_base || 500000)} Ar</td>
                                                <td>{u.roles && u.roles.map(role => <span key={role} className={`role-badge-${role}`}>{role}</span>)}</td>
                                                <td><span className={`status ${u.statut === 'actif' ? 'status-approved' : 'status-rejected'}`}>{u.statut}</span></td>
                                                <td><div className="btn-group" style={{ gap: '5px' }}>
                                                    <button className="btn btn-sm btn-primary" onClick={() => openEditModal(u)}>Modifier</button>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => openPasswordModal(u)}>Mot de passe</button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u.id)}>Supprimer</button>
                                                </div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Modals */}
                            {showCreateModal && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
                                <div className="modal"><h3>Ajouter un employé</h3>
                                <form onSubmit={handleCreateEmployee}>
                                    <div className="form-row"><div className="form-group"><label>Nom *</label><input type="text" className="form-input" value={createForm.nom} onChange={(e) => setCreateForm({...createForm, nom: e.target.value})} required /></div>
                                    <div className="form-group"><label>Prénom *</label><input type="text" className="form-input" value={createForm.prenom} onChange={(e) => setCreateForm({...createForm, prenom: e.target.value})} required /></div></div>
                                    <div className="form-group"><label>Email *</label><input type="email" className="form-input" value={createForm.email} onChange={(e) => setCreateForm({...createForm, email: e.target.value})} required /></div>
                                    <div className="form-group"><label>Mot de passe *</label><input type="password" className="form-input" value={createForm.password} onChange={(e) => setCreateForm({...createForm, password: e.target.value})} required /></div>
                                    <div className="form-group"><label>Téléphone</label><input type="text" className="form-input" value={createForm.telephone} onChange={(e) => setCreateForm({...createForm, telephone: e.target.value})} /></div>
                                    <div className="form-group"><label>Service</label><input type="text" className="form-input" value={createForm.service} onChange={(e) => setCreateForm({...createForm, service: e.target.value})} /></div>
                                    <div className="form-group"><label>Salaire de base (Ar)</label><input type="number" className="form-input" value={createForm.salaire_base} onChange={(e) => setCreateForm({...createForm, salaire_base: e.target.value})} min="0" step="10000" /></div>
                                    <div className="btn-group"><button type="submit" className="btn btn-primary">Créer</button><button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button></div>
                                </form></div>
                            </div>)}
                            {showEditModal && selectedUser && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowEditModal(false); setSelectedUser(null); }}}>
                                <div className="modal"><h3>Modifier {selectedUser.prenom} {selectedUser.nom}</h3>
                                <form onSubmit={handleEditUser}>
                                    <div className="form-row"><div className="form-group"><label>Nom</label><input type="text" className="form-input" value={editForm.nom} onChange={(e) => setEditForm({...editForm, nom: e.target.value})} required /></div>
                                    <div className="form-group"><label>Prénom</label><input type="text" className="form-input" value={editForm.prenom} onChange={(e) => setEditForm({...editForm, prenom: e.target.value})} required /></div></div>
                                    <div className="form-group"><label>Email</label><input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} required /></div>
                                    <div className="form-group"><label>Téléphone</label><input type="text" className="form-input" value={editForm.telephone} onChange={(e) => setEditForm({...editForm, telephone: e.target.value})} /></div>
                                    <div className="form-group"><label>Service</label><input type="text" className="form-input" value={editForm.service} onChange={(e) => setEditForm({...editForm, service: e.target.value})} /></div>
                                    <div className="form-group"><label>Salaire de base (Ar)</label><input type="number" className="form-input" value={editForm.salaire_base} onChange={(e) => setEditForm({...editForm, salaire_base: e.target.value})} min="0" step="10000" /></div>
                                    <div className="form-group"><label>Statut</label><select className="form-input" value={editForm.statut} onChange={(e) => setEditForm({...editForm, statut: e.target.value})}><option value="actif">Actif</option><option value="inactif">Inactif</option></select></div>
                                    <div className="btn-group"><button type="submit" className="btn btn-primary">Enregistrer</button><button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>Annuler</button></div>
                                </form></div>
                            </div>)}
                            {showPasswordModal && selectedUser && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setSelectedUser(null); }}}>
                                <div className="modal"><h3>Réinitialiser le mot de passe</h3>
                                <p>Utilisateur : {selectedUser.prenom} {selectedUser.nom}</p>
                                <form onSubmit={handleResetPassword}>
                                    <div className="form-group"><label>Nouveau mot de passe</label><input type="password" className="form-input" value={passwordForm.password} onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})} required /></div>
                                    <div className="form-group"><label>Confirmer</label><input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required /></div>
                                    <div className="btn-group"><button type="submit" className="btn btn-primary">Réinitialiser</button><button type="button" className="btn btn-secondary" onClick={() => { setShowPasswordModal(false); setSelectedUser(null); }}>Annuler</button></div>
                                </form></div>
                            </div>)}
                            {showPromoteModal && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPromoteModal(false); }}>
                                <div className="modal"><h3>Promouvoir en manager</h3>
                                <form onSubmit={handlePromoteToManager}>
                                    <div className="form-group"><label>Sélectionner un employé</label><select className="form-input" value={promoteUserId} onChange={(e) => setPromoteUserId(e.target.value)} required>
                                        <option value="">-- Choisir --</option>{employeesOnly.map(emp => (<option key={emp.id} value={emp.id}>{emp.prenom} {emp.nom} (Salaire: {formatNumber(emp.salaire_base)} Ar)</option>))}
                                    </select></div>
                                    <div className="info-box" style={{ background: '#fef3c7', marginBottom: '15px' }}>La promotion augmentera le salaire à 1 000 000 Ar.</div>
                                    <div className="btn-group"><button type="submit" className="btn btn-primary">Promouvoir</button><button type="button" className="btn btn-secondary" onClick={() => setShowPromoteModal(false)}>Annuler</button></div>
                                </form></div>
                            </div>)}
                            {showAssignManagerModal && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAssignManagerModal(false); }}>
                                <div className="modal"><h3>Assigner un manager</h3>
                                <form onSubmit={handleAssignManager}>
                                    <div className="form-group"><label>Employé</label><select className="form-input" value={assignForm.employeeId} onChange={(e) => setAssignForm({...assignForm, employeeId: e.target.value})} required>
                                        <option value="">-- Choisir --</option>{users.filter(u => u.roles && u.roles.includes('employe')).map(u => (<option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>))}
                                    </select></div>
                                    <div className="form-group"><label>Manager</label><select className="form-input" value={assignForm.managerId} onChange={(e) => setAssignForm({...assignForm, managerId: e.target.value})} required>
                                        <option value="">-- Choisir --</option>{managers.map(m => (<option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>))}
                                    </select></div>
                                    <div className="btn-group"><button type="submit" className="btn btn-primary">Assigner</button><button type="button" className="btn btn-secondary" onClick={() => setShowAssignManagerModal(false)}>Annuler</button></div>
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
                            <h2>Paramètres de l'application</h2>
                            <div className="admin-section">
                                <h3>Paramètres des congés</h3>
                                <div className="form-row"><div className="form-group"><label>Jours CP par an</label><input type="number" className="form-input" value={settings.cp_jours_par_an} onChange={(e) => setSettings({...settings, cp_jours_par_an: parseInt(e.target.value)})} /></div></div>
                                <div className="form-row"><div className="form-group"><label>Max jours consécutifs</label><input type="number" className="form-input" value={settings.max_conges_consecutifs} onChange={(e) => setSettings({...settings, max_conges_consecutifs: parseInt(e.target.value)})} /></div>
                                <div className="form-group"><label>Préavis minimum (jours)</label><input type="number" className="form-input" value={settings.preavis_minimum} onChange={(e) => setSettings({...settings, preavis_minimum: parseInt(e.target.value)})} /></div></div>
                                <button className="btn btn-primary" onClick={handleSaveSettings}>Enregistrer</button>
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
                        <h2>Logs d'activité</h2>
                        <div className="info-box"><p>Fonctionnalité en cours de développement.</p></div>
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Dashboard principal avec graphiques 12 mois
    return (
        <>
            <Navbar user={user} role="admin" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="admin" onLogout={onLogout} />
                <main className="main-content">
                    <h1>Bonjour {user.prenom} {user.nom}</h1>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>Panneau d'administration</p>

                    {realtimeNotifications.length > 0 && (
                        <div className="admin-section" style={{ background: '#eff6ff', marginBottom: '20px' }}>
                            <h3>Notifications en temps réel ({realtimeNotifications.length})</h3>
                            {realtimeNotifications.slice(0, 3).map((notif, idx) => (
                                <div key={idx} className="request-item" style={{ background: '#fef3c7', marginBottom: '8px' }}>
                                    <div className="request-info"><strong>{notif.titre}</strong><small>{notif.message}</small></div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="cards-grid">
                        <div className="stat-card blue"><div className="number">{stats.employees}</div><div className="label">Employés</div></div>
                        <div className="stat-card green"><div className="number">{stats.managers}</div><div className="label">Managers</div></div>
                        <div className="stat-card orange"><div className="number">{stats.pendingRequests}</div><div className="label">Demandes en attente</div></div>
                        <div className="stat-card red"><div className="number">{stats.alerts}</div><div className="label">Alertes solde bas</div></div>
                    </div>

                    {/* Graphiques 12 mois */}
                    {/* Graphiques 12 mois et répartition par type */}
<div className="cards-grid" style={{ marginBottom: '20px' }}>
    <div className="card" style={{ gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Demandes de congés par mois</h3>
            <div className="year-selector">
                <label style={{ marginRight: '8px', fontSize: '13px', color: '#64748b' }}>Année :</label>
                <select 
                    value={selectedYear} 
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="form-input"
                    style={{ width: '100px', padding: '6px 12px' }}
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                    dataKey="mois_nom" 
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis 
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    label={{ value: 'Nombre de demandes', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                    dataKey="total" 
                    fill="#667eea" 
                    name="Demandes" 
                    radius={[8, 8, 0, 0]}
                    barSize={35}
                />
            </BarChart>
        </ResponsiveContainer>
        {monthlyStats.every(m => m.total === 0) && (
            <div className="info-box text-center" style={{ marginTop: '15px' }}>
                Aucune demande de congé pour l'année {selectedYear}
            </div>
        )}
    </div>
    
    <div className="card">
        <h3>Répartition par type de congé</h3>
        {typeStats.length > 0 && typeStats.some(t => t.total > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={typeStats}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="total"
                        nameKey="type"
                    >
                        {typeStats.map((entry, index) => {
                            const color = entry.type === 'Congés Payés' ? '#667eea' : '#f59e0b';
                            return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                    </Pie>
                    <Tooltip 
                        formatter={(value, name, props) => {
                            return [`${value} demande(s)`, props.payload.type];
                        }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                        formatter={(value, entry) => {
                            const item = typeStats.find(t => t.type === value);
                            return `${value} (${item?.total || 0} demande(s))`;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        ) : (
            <div className="info-box text-center" style={{ marginTop: '50px', marginBottom: '50px' }}>
                Aucune demande de congé pour le moment
            </div>
        )}
    </div>
</div>

                    <div className="actions-bar" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                        <h3>Demandes traitées</h3>
                        <div className="btn-group">
                            <button className={`btn btn-sm ${periodeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('all')}>Toutes</button>
                            <button className={`btn btn-sm ${periodeFilter === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('month')}>Ce mois</button>
                            <button className={`btn btn-sm ${periodeFilter === 'quarter' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('quarter')}>Ce trimestre</button>
                            <button className={`btn btn-sm ${periodeFilter === 'year' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePeriodeChange('year')}>Cette année</button>
                        </div>
                    </div>

                    {pendingApprovals.length > 0 && (
                        <div className="admin-section">
                            <h3>Demandes en attente de validation (2ème étape)</h3>
                            {pendingApprovals.map(req => (
                                <div key={`${req.request_type}-${req.id}`} className="request-item">
                                    <div className="request-info">
                                        <strong>{req.prenom} {req.nom}</strong>
                                        <small>{req.date_debut} → {req.date_fin} • {req.type_name} • {req.nombre_jours} jours</small>
                                        <small>Motif : {req.motif || 'Non spécifié'}</small>
                                        {req.manager_nom && (<small>Pré-validé par : {req.manager_prenom} {req.manager_nom}</small>)}
                                    </div>
                                    <div className="request-actions">
                                        <button className="btn btn-success btn-sm" onClick={() => handleFinalApprove(req.id, req.request_type)} disabled={processingId === req.id}>Approuver</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleFinalReject(req.id, req.request_type)} disabled={processingId === req.id}>Refuser</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="table-container">
                        <div className="actions-bar" style={{ justifyContent: 'space-between', padding: '16px 16px 0 16px' }}>
                            <h3 style={{ margin: 0 }}>Demandes traitées</h3>
                            <button className="btn btn-sm btn-secondary" onClick={handleExportDemandes}>Exporter Excel</button>
                        </div>
                        <table className="table">
                            <thead><tr><th>Employé</th><th>Dates</th><th>Type</th><th>Jours</th><th>Statut</th></tr></thead>
                            <tbody>
                                {filteredLeaveRequests.filter(req => req.statut !== 'pending_manager').slice(0, 10).map(req => (
                                    <tr key={req.id}><td>{req.prenom} {req.nom}</td><td>{req.date_debut} → {req.date_fin}</td><td>{req.type_name}</td><td>{req.nombre_jours}</td><td>{getStatusLabel(req.statut)}</td></tr>
                                ))}
                                {filteredLeaveRequests.filter(req => req.statut !== 'pending_manager').length === 0 && (<tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucune demande traitée</td></tr>)}
                            </tbody>
                        </table>
                    </div>

                    <div className="btn-group mt-20">
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard/admin/users')}>Gérer les utilisateurs</button>
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard/admin/payroll')}>Gestion de la paie</button>
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard/admin/calendar')}>Calendrier général</button>
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard/admin/settings')}>Paramètres</button>
                    </div>
                </main>
            </div>
            <Footer />
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default AdminDashboard;