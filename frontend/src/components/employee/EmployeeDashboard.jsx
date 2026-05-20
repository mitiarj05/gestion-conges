// frontend/src/components/employee/EmployeeDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import LeaveBalance from './LeaveBalance';
import LeaveRequest from './LeaveRequest';
// import PermissionRequest from './PermissionRequest';  ← SUPPRIMÉ
import EditLeaveRequest from './EditLeaveRequest';
import CalendarView from './CalendarView';
import ManagerProfile from './ManagerProfile';
import AlertBanner from '../notifications/AlertBanner';
import LeaveFilters from './LeaveFilters';
import FileUpload from '../common/FileUpload';
import StatisticsChart from './StatisticsChart';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';
import { formatDateTime } from '../../utils/dateUtils';
import EmployeePayroll from '../payroll/EmployeePayroll';

function EmployeeDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [balance, setBalance] = useState({
        cp_total: 25, cp_pris: 0, cp_restant: 25,
        rtt_total: 0, rtt_pris: 0, rtt_restant: 0,
        permission: 0
    });
    const [requests, setRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editingRequest, setEditingRequest] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [justificatifs, setJustificatifs] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    const { toasts, removeToast, success, error: toastError } = useToast();

    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredRequests, setFilteredRequests] = useState([]);

    // ============ FETCH SOLDE (MODIFIÉ POUR 2 TYPES) ============
    const fetchBalance = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            const response = await axios.get('http://localhost:5000/api/leaves/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance({
                cp_total: response.data.cp_total || 25,
                cp_pris: response.data.cp_pris || 0,
                cp_restant: response.data.cp_restant || 25,
                rtt_total: 0,
                rtt_pris: 0,
                rtt_restant: 0,
                permission: 0
            });
        } catch (error) {
            console.error('Erreur solde:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
    }, [navigate]);

    // ============ FETCH MES DEMANDES ============
    const fetchRequests = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get('http://localhost:5000/api/leaves/my-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const formattedRequests = response.data.map(req => {
                let normalizedStatus = req.status || req.statut;
                
                if (!normalizedStatus || normalizedStatus === 'En attente' || normalizedStatus === 'en_attente') {
                    normalizedStatus = 'pending_manager';
                }
                
                const validStatuses = ['pending_manager', 'pending_admin', 'approved', 'rejected'];
                if (!validStatuses.includes(normalizedStatus)) {
                    normalizedStatus = 'pending_manager';
                }
                
                let displayType = req.type;
                if (req.type_id === 1 || req.type === 'Congés Payés' || req.type === '🏖️ Congés Payés') {
                    displayType = '🏖️ Congés Payés';
                } else {
                    displayType = '📝 Congé sans solde';
                }
                
                return {
                    id: req.id,
                    start_date: req.start_date || req.date_permission,
                    end_date: req.end_date || req.date_permission,
                    date_permission: req.date_permission,
                    type_id: req.type_id || 2,
                    type: displayType,
                    duration: req.duration || req.duree_heures || req.nombre_jours || 0,
                    status: normalizedStatus,
                    motif: req.motif || '',
                    motif_refus: req.motif_refus || '',
                    request_type: req.request_type || 'conges',
                    displayDuration: `${req.duration || req.nombre_jours || 0} jour(s)`,
                    displayDates: `${req.start_date || req.date_debut} → ${req.end_date || req.date_fin}`
                };
            });
            
            setRequests(formattedRequests);
            
            const justifs = {};
            for (const req of formattedRequests) {
                if (req.request_type !== 'permission') {
                    try {
                        const justifResponse = await axios.get(`http://localhost:5000/api/leaves/justificatifs/${req.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        justifs[req.id] = justifResponse.data;
                    } catch (e) { justifs[req.id] = []; }
                } else { justifs[req.id] = []; }
            }
            setJustificatifs(justifs);
        } catch (error) { 
            console.error('Erreur chargement demandes:', error); 
        }
    }, []);

    // ============ FETCH NOTIFICATIONS ============
    const fetchNotifications = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get('http://localhost:5000/api/leaves/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.est_lu).length);
        } catch (error) { console.error('Erreur notifications:', error); }
    }, []);

    // ============ FETCH ALL DATA ============
    const fetchAllData = useCallback(async () => {
        await Promise.all([fetchBalance(), fetchRequests()]);
        setLoading(false);
    }, [fetchBalance, fetchRequests]);

    const refreshAllData = useCallback(() => {
        fetchAllData();
        fetchNotifications();
    }, [fetchAllData, fetchNotifications]);

    // ============ INIT ============
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
        fetchNotifications();
        const interval = setInterval(() => { fetchAllData(); fetchNotifications(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchAllData, fetchNotifications]);

    // ============ FILTRES ============
    useEffect(() => {
        let filtered = [...requests];
        if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);
        if (filterType !== 'all') {
            if (filterType === 'permission') filtered = filtered.filter(r => r.request_type === 'permission');
            else filtered = filtered.filter(r => r.type_id === parseInt(filterType));
        }
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const searchLower = searchTerm.toLowerCase();
                return (r.start_date || '').toLowerCase().includes(searchLower) || 
                       (r.motif || '').toLowerCase().includes(searchLower) ||
                       (r.type || '').toLowerCase().includes(searchLower);
            });
        }
        setFilteredRequests(filtered);
    }, [requests, filterStatus, filterType, searchTerm]);

    // ============ NOTIFICATIONS ============
    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/leaves/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
            success('Notification marquée comme lue');
        } catch (error) { console.error('Erreur:', error); }
    };

    // ============ MODIFIER DEMANDE ============
    const handleModifyRequest = (request) => {
        if (request.status !== 'pending_manager') { 
            toastError('Cette demande ne peut plus être modifiée'); 
            return; 
        }
        if (request.request_type === 'permission') { 
            toastError('Les permissions ne peuvent pas être modifiées'); 
            return; 
        }
        
        setEditingRequest({
            id: request.id,
            type_id: request.type_id || 1,
            start_date: request.start_date,
            end_date: request.end_date,
            motif: request.motif || '',
            type: request.type,
            status: request.status
        });
        setShowEditModal(true);
    };

    // ============ SUPPRIMER DEMANDE ============
    const handleDeleteRequest = async (request) => {
        const typeLabel = request.request_type === 'permission' ? 'permission' : 'congé';
        if (window.confirm(`⚠️ Supprimer définitivement cette demande de ${typeLabel} ?\n\nCette action est irréversible.`)) {
            try {
                const token = localStorage.getItem('token');
                if (request.request_type === 'permission') {
                    await axios.delete(`http://localhost:5000/api/leaves/cancel-permission/${request.id}`, { 
                        headers: { Authorization: `Bearer ${token}` } 
                    });
                } else {
                    await axios.delete(`http://localhost:5000/api/leaves/cancel-request/${request.id}`, { 
                        headers: { Authorization: `Bearer ${token}` } 
                    });
                }
                success(`✅ Demande de ${typeLabel} supprimée avec succès !`);
                refreshAllData();
            } catch (error) { 
                toastError(error.response?.data?.message || 'Erreur lors de la suppression'); 
            }
        }
    };

    // ============ SAUVEGARDER MODIFICATION ============
    const handleSaveEdit = async (editedData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`http://localhost:5000/api/leaves/update-request/${editingRequest.id}`, editedData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            success(response.data.message || '✅ Demande modifiée avec succès !');
            setEditingRequest(null);
            setShowEditModal(false);
            refreshAllData();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Erreur lors de la modification';
            if (error.response?.data?.errors) {
                toastError(`• ${error.response.data.errors.join('\n• ')}`);
            } else { toastError(errorMsg); }
        }
    };

    const handleCloseEdit = () => { setEditingRequest(null); setShowEditModal(false); };

    // ============ AFFICHAGE STATUT ============
    const getStatusLabel = (status, motif_refus) => {
        let normalizedStatus = status;
        if (!status || status === 'En attente' || status === 'en_attente') normalizedStatus = 'pending_manager';
        
        switch(normalizedStatus) {
            case 'pending_manager': 
                return <span className="status status-pending-manager">⏳ En attente manager - Modifiable</span>;
            case 'pending_admin': 
                return <span className="status status-pending-admin">🕐 En attente admin - Non modifiable</span>;
            case 'approved': 
                return <span className="status status-approved">✅ Approuvé</span>;
            case 'rejected': 
                return (<div><span className="status status-rejected">❌ Refusé</span>
                        {motif_refus && <small style={{ display: 'block', color: '#dc3545' }}>Motif : {motif_refus}</small>}
                        </div>);
            default: 
                return <span className="status status-pending-manager">⏳ En attente</span>;
        }
    };

    const handleRequestSuccess = () => { 
        refreshAllData(); 
        success('✅ Demande envoyée avec succès !'); 
        navigate('/dashboard/employee/requests'); 
    };
    
    const handleJustificatifUpload = () => { 
        fetchRequests(); 
        success('📎 Justificatif ajouté avec succès !'); 
    };

    if (loading) {
        return (<div className="loading-container">
            <div className="loading-spinner"></div>
            <div>Chargement...</div>
        </div>);
    }

    const renderEditModal = () => {
        if (!showEditModal || !editingRequest) return null;
        return (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseEdit(); }}>
                <div className="modal" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                    <EditLeaveRequest request={editingRequest} onSave={handleSaveEdit} onCancel={handleCloseEdit} />
                </div>
            </div>
        );
    };

    // ============ DASHBOARD ACCUEIL ============
    const DashboardHome = () => (
        <>
            <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
            <AlertBanner balance={balance} />
            
            {notifications.length > 0 && (
                <div className="admin-section" style={{ background: '#e8f4fd' }}>
                    <h3>🔔 Notifications ({unreadCount} non lues)</h3>
                    {notifications.slice(0, 5).map(notif => (
                        <div key={notif.id} className="request-item" style={{ background: notif.est_lu ? '#f9f9f9' : '#fff3cd' }}>
                            <div className="request-info">
                                <strong>{notif.titre}</strong>
                                <small>{notif.message}</small>
                                <small style={{ display: 'block', color: '#888' }}>{formatDateTime(notif.cree_le)}</small>
                            </div>
                            {!notif.est_lu && <button className="btn btn-sm btn-secondary" onClick={() => markAsRead(notif.id)}>✓ Marquer lu</button>}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="cards-grid">
                <div className="card">
                    <h3>🏖️ Congés Payés</h3>
                    <div className="value">{balance.cp_restant || 0} jours</div>
                    <div className="small">Total: {balance.cp_total || 25} jours • Pris: {balance.cp_pris || 0} jours</div>
                </div>
                <div className="card">
                    <h3>📝 Congé sans solde</h3>
                    <div className="value">Illimité</div>
                    <div className="small">Non rémunéré • Max 5j consécutifs</div>
                </div>
            </div>
            
            <div className="actions-bar">
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/employee/new-request')}>
                    📅 Demander un congé
                </button>
            </div>
            
            <div className="table-container">
                <h3 style={{ padding: '15px 15px 0 15px' }}>📋 Mes demandes récentes</h3>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Dates</th>
                            <th>Type</th>
                            <th>Durée</th>
                            <th>Statut</th>
                            <th>Justificatif</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.slice(0, 5).map((req) => (
                            <tr key={req.id}>
                                <td>{req.displayDates}</td>
                                <td>{req.type}</td>
                                <td>{req.displayDuration}</td>
                                <td>{getStatusLabel(req.status, req.motif_refus)}</td>
                                <td>
                                    {justificatifs[req.id]?.length > 0 ? 
                                        (<span className="status status-approved">📎 {justificatifs[req.id].length} fichier(s)</span>) : 
                                        (req.status === 'pending_manager' && req.request_type !== 'permission' && 
                                         (<FileUpload demandeId={req.id} onUploadComplete={handleJustificatifUpload} />))}
                                </td>
                                <td>
                                    {req.status === 'pending_manager' && (
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            {req.request_type !== 'permission' && 
                                                <button className="btn btn-sm btn-primary" onClick={() => handleModifyRequest(req)} 
                                                    style={{ background: '#ff9800', color: 'white', cursor: 'pointer' }} type="button">
                                                    ✏️ Modifier
                                                </button>
                                            }
                                            <button className="btn btn-sm btn-warning" onClick={() => handleDeleteRequest(req)} 
                                                style={{ background: '#6c757d', color: 'white', cursor: 'pointer' }} type="button">
                                                🗑️ Supprimer
                                            </button>
                                        </div>
                                    )}
                                    {req.status === 'pending_admin' && 
                                        <span className="info-text" style={{ fontSize: '11px', color: '#ff9800' }}>⏳ Déjà validé par manager</span>
                                    }
                                    {(req.status === 'approved' || req.status === 'rejected') && 
                                        <span className="info-text" style={{ fontSize: '11px', color: '#888' }}>
                                            {req.status === 'approved' ? '✅ Finalisé' : '❌ Finalisé'}
                                        </span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {renderEditModal()}
        </>
    );

    // ============ PAGE MES DEMANDES ============
    const MyRequestsPage = () => (
        <>
            <h2>📋 Historique complet de mes demandes</h2>
            <LeaveFilters 
                filterStatus={filterStatus} 
                setFilterStatus={setFilterStatus} 
                filterType={filterType} 
                setFilterType={setFilterType} 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                totalCount={requests.length} 
                filteredCount={filteredRequests.length} 
                onReset={() => { setFilterStatus('all'); setFilterType('all'); setSearchTerm(''); }} 
            />
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Dates</th>
                            <th>Type</th>
                            <th>Durée</th>
                            <th>Motif</th>
                            <th>Statut</th>
                            <th>Motif du refus</th>
                            <th>Justificatif</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.map((req) => (
                            <tr key={req.id}>
                                <td>{req.displayDates}</td>
                                <td>{req.type}</td>
                                <td>{req.displayDuration}</td>
                                <td>{req.motif || '-'}</td>
                                <td>{getStatusLabel(req.status, req.motif_refus)}</td>
                                <td>{req.motif_refus || '-'}</td>
                                <td>
                                    {justificatifs[req.id]?.length > 0 ? 
                                        (<span className="status status-approved">📎 {justificatifs[req.id].length} fichier(s)</span>) : 
                                        (req.status === 'pending_manager' && req.request_type !== 'permission' && 
                                         (<FileUpload demandeId={req.id} onUploadComplete={handleJustificatifUpload} />))}
                                </td>
                                <td>
                                    {req.status === 'pending_manager' && (
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            {req.request_type !== 'permission' && 
                                                <button className="btn btn-sm btn-primary" onClick={() => handleModifyRequest(req)} 
                                                    style={{ background: '#ff9800', color: 'white', cursor: 'pointer' }} type="button">
                                                    ✏️ Modifier
                                                </button>
                                            }
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRequest(req)} 
                                                style={{ cursor: 'pointer' }} type="button">
                                                🗑️ Supprimer
                                            </button>
                                        </div>
                                    )}
                                    {req.status === 'pending_admin' && 
                                        <span className="info-text" style={{ fontSize: '11px', color: '#ff9800' }}>⏳ Déjà validé par manager</span>
                                    }
                                    {(req.status === 'approved' || req.status === 'rejected') && 
                                        <span className="info-text" style={{ fontSize: '11px', color: '#888' }}>Non modifiable</span>
                                    }
                                </td>
                            </tr>
                        ))}
                        {filteredRequests.length === 0 && 
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>📭 Aucune demande ne correspond à vos critères</td></tr>
                        }
                    </tbody>
                </table>
            </div>
            <div className="actions-bar mt-20">
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/employee/new-request')}>➕ Nouvelle demande</button>
                <button className="btn btn-secondary" onClick={() => { setFilterStatus('all'); setFilterType('all'); setSearchTerm(''); }}>🔄 Afficher tout</button>
            </div>
            {renderEditModal()}
        </>
    );

    // ============ ROUTING ============
    const currentPath = location.pathname;

    // Route Paie
    if (currentPath.includes('/payroll')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <EmployeePayroll />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Solde
    if (currentPath.includes('/balance')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <LeaveBalance balance={balance} />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Mes demandes
    if (currentPath.includes('/requests')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <MyRequestsPage />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Nouvelle demande
    if (currentPath.includes('/new-request')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <LeaveRequest onSuccess={handleRequestSuccess} />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Permission (désactivée)
    if (currentPath.includes('/permission')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <div className="info-box" style={{ background: '#fff3cd' }}>
                            ⚠️ La fonctionnalité de permission a été désactivée.<br/>
                            Utilisez la demande de congé standard pour vos absences.
                        </div>
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Calendrier
    if (currentPath.includes('/calendar')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <CalendarView requests={requests} onRequestUpdate={refreshAllData} />
                    </main>
                </div>
                <Footer />
                {renderEditModal()}
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Statistiques
    if (currentPath.includes('/statistics')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <StatisticsChart requests={requests} balance={balance} />
                    </main>
                </div>
                <Footer />
                {renderEditModal()}
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Route Manager Profile
    if (currentPath.includes('/manager-profile')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <ManagerProfile />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    // Dashboard par défaut
    return (
        <>
            <Navbar user={user} role="employee" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="employee" />
                <main className="main-content">
                    <DashboardHome />
                </main>
            </div>
            <Footer />
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default EmployeeDashboard;