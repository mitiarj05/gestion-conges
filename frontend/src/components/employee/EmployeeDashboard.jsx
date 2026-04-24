// frontend/src/components/employee/EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import LeaveBalance from './LeaveBalance';
import LeaveRequest from './LeaveRequest';
import PermissionRequest from './PermissionRequest';
import EditLeaveRequest from './EditLeaveRequest';
import CalendarView from './CalendarView';
import ManagerProfile from './ManagerProfile';
import AlertBanner from '../notifications/AlertBanner';
import LeaveFilters from './LeaveFilters';
import FileUpload from '../common/FileUpload';
import StatisticsChart from './StatisticsChart';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

function EmployeeDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [balance, setBalance] = useState({
        cp_total: 0,
        cp_pris: 0,
        cp_restant: 0,
        rtt_total: 0,
        rtt_pris: 0,
        rtt_restant: 0,
        permission: 0
    });
    const [requests, setRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editingRequest, setEditingRequest] = useState(null);
    const [justificatifs, setJustificatifs] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    // Hooks personnalisés
    const { toasts, removeToast, success, error, warning, info } = useToast();

    // Filtres
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredRequests, setFilteredRequests] = useState([]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
        fetchNotifications();
        
        const interval = setInterval(() => {
            fetchAllData();
            fetchNotifications();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Filtrer les demandes
    useEffect(() => {
        let filtered = [...requests];
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(r => r.status === filterStatus);
        }
        
        if (filterType !== 'all') {
            filtered = filtered.filter(r => r.type_id === parseInt(filterType));
        }
        
        if (searchTerm) {
            filtered = filtered.filter(r => 
                r.start_date.includes(searchTerm) || 
                r.end_date.includes(searchTerm) ||
                (r.motif && r.motif.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        setFilteredRequests(filtered);
    }, [requests, filterStatus, filterType, searchTerm]);

    const fetchAllData = async () => {
        await Promise.all([fetchBalance(), fetchRequests()]);
        setLoading(false);
    };

    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await axios.get('http://localhost:5000/api/leaves/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Balance reçue:', response.data);
            setBalance(response.data);
        } catch (error) {
            console.error('Erreur solde:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        }
    };

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get('http://localhost:5000/api/leaves/my-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
            
            // Charger les justificatifs pour chaque demande
            const justifs = {};
            for (const req of response.data) {
                try {
                    const justifResponse = await axios.get(`http://localhost:5000/api/leaves/justificatifs/${req.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    justifs[req.id] = justifResponse.data;
                } catch (e) {
                    justifs[req.id] = [];
                }
            }
            setJustificatifs(justifs);
        } catch (error) {
            console.error('Erreur chargement demandes:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get('http://localhost:5000/api/leaves/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.est_lu).length);
        } catch (error) {
            console.error('Erreur notifications:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/leaves/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
            success('Notification marquée comme lue');
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const handleModifyRequest = (request) => {
        setEditingRequest(request);
    };

    const handleCancelRequest = async (request) => {
        if (window.confirm(`Êtes-vous sûr de vouloir annuler votre demande de congé du ${request.start_date} au ${request.end_date} ?`)) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/leaves/cancel-request/${request.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                success('✅ Demande annulée avec succès !');
                fetchAllData();
                fetchNotifications();
            } catch (error) {
                console.error('Erreur annulation:', error);
                error(error.response?.data?.message || 'Erreur lors de l\'annulation');
            }
        }
    };

    const handleSaveEdit = async (editedData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                `http://localhost:5000/api/leaves/update-request/${editingRequest.id}`, 
                editedData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            success(response.data.message || '✅ Demande modifiée avec succès !');
            setEditingRequest(null);
            fetchAllData();
            fetchNotifications();
        } catch (error) {
            console.error('Erreur modification:', error);
            error(error.response?.data?.message || 'Erreur lors de la modification');
        }
    };

    const handleCloseEdit = () => {
        setEditingRequest(null);
    };

    const getStatusLabel = (status, motif_refus) => {
        switch(status) {
            case 'pending_manager': 
                return <span className="status status-pending">⏳ En attente manager - Modifiable</span>;
            case 'pending_admin': 
                return <span className="status status-pending">🕐 En attente admin - Non modifiable</span>;
            case 'approved': 
                return <span className="status status-approved">✅ Approuvé</span>;
            case 'rejected': 
                return (
                    <div>
                        <span className="status status-rejected">❌ Refusé</span>
                        {motif_refus && <small style={{ display: 'block', color: '#dc3545' }}>Motif : {motif_refus}</small>}
                    </div>
                );
            default: 
                return <span className="status">{status}</span>;
        }
    };

    const handleRequestSuccess = () => {
        fetchAllData();
        fetchNotifications();
        success('✅ Demande de congé envoyée avec succès !');
        navigate('/dashboard/employee/requests');
    };

    const handleJustificatifUpload = () => {
        fetchRequests();
        success('📎 Justificatif ajouté avec succès !');
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
                            {!notif.est_lu && (
                                <button className="btn btn-sm btn-secondary" onClick={() => markAsRead(notif.id)}>✓ Marquer lu</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="cards-grid">
                <div className="card">
                    <h3>🏖️ Congés Payés</h3>
                    <div className="value">{balance.cp_restant || 0} jours</div>
                    <div className="small">
                        Total: {balance.cp_total || 25} jours • Pris: {balance.cp_pris || 0} jours
                    </div>
                </div>
                <div className="card">
                    <h3>📅 Réduction du Temps de Travail (RTT)</h3>
                    <div className="value">{balance.rtt_restant || 0} jours</div>
                    <div className="small">
                        Total: {balance.rtt_total || 12} jours • Pris: {balance.rtt_pris || 0} jours
                    </div>
                </div>
                <div className="card">
                    <h3>⏰ Permissions</h3>
                    <div className="value">{balance.permission || 0}h</div>
                    <div className="small">Restantes ce mois / 4h max</div>
                </div>
            </div>
            <div className="actions-bar">
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/employee/new-request')}>📅 Demander un congé</button>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/employee/permission')}>⏰ Demander une permission</button>
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
                                <td>{formatDate(req.start_date)} - {formatDate(req.end_date)}</td>
                                <td>{req.type}</td>
                                <td>{req.duration} {req.type === 'Permission' ? 'heures' : 'jours'}</td>
                                <td>{getStatusLabel(req.status, req.motif_refus)}</td>
                                <td>
                                    {justificatifs[req.id]?.length > 0 ? (
                                        <span className="status status-approved">📎 {justificatifs[req.id].length} fichier(s)</span>
                                    ) : (
                                        req.status === 'pending_manager' && (
                                            <FileUpload demandeId={req.id} onUploadComplete={handleJustificatifUpload} />
                                        )
                                    )}
                                </td>
                                <td>
                                    {req.status === 'pending_manager' && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button 
                                                className="btn btn-sm btn-primary" 
                                                onClick={() => handleModifyRequest(req)}
                                                style={{ background: '#ff9800', color: 'white' }}
                                            >
                                                ✏️ Modifier
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-danger" 
                                                onClick={() => handleCancelRequest(req)}
                                            >
                                                🗑️ Annuler
                                            </button>
                                        </div>
                                    )}
                                    {req.status === 'pending_admin' && (
                                        <span className="info-text" style={{ fontSize: '11px', color: '#888' }}>
                                            ⏳ En attente validation admin
                                        </span>
                                    )}
                                    {(req.status === 'approved' || req.status === 'rejected') && (
                                        <span className="info-text" style={{ fontSize: '11px', color: '#888' }}>
                                            {req.status === 'approved' ? '✅ Finalisé' : '❌ Finalisé'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="info-box" style={{ marginTop: '20px', background: '#e8f4fd' }}>
                <strong>ℹ️ Informations :</strong><br/>
                • 📝 Les demandes avec le statut "En attente manager" peuvent être modifiées, annulées ou complétées par un justificatif.<br/>
                • ⚠️ Une fois validées par le manager, les demandes ne peuvent plus être modifiées.<br/>
                • 🔔 Vous serez notifié à chaque étape de validation ou de refus.<br/>
                • 📅 ⚠️ Les dates de congé doivent être **aujourd'hui ou dans le futur** (pas de dates passées).
            </div>
        </>
    );

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
                onReset={() => {
                    setFilterStatus('all');
                    setFilterType('all');
                    setSearchTerm('');
                }}
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
                                <td>{formatDate(req.start_date)} - {formatDate(req.end_date)}</td>
                                <td>{req.type}</td>
                                <td>{req.duration} {req.type === 'Permission' ? 'heures' : 'jours'}</td>
                                <td>{req.motif || '-'}</td>
                                <td>{getStatusLabel(req.status, req.motif_refus)}</td>
                                <td>{req.motif_refus || '-'}</td>
                                <td>
                                    {justificatifs[req.id]?.length > 0 ? (
                                        <span className="status status-approved">📎 {justificatifs[req.id].length} fichier(s)</span>
                                    ) : (
                                        req.status === 'pending_manager' && (
                                            <FileUpload demandeId={req.id} onUploadComplete={handleJustificatifUpload} />
                                        )
                                    )}
                                </td>
                                <td>
                                    {req.status === 'pending_manager' && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button 
                                                className="btn btn-sm btn-primary" 
                                                onClick={() => handleModifyRequest(req)}
                                                style={{ background: '#ff9800', color: 'white' }}
                                            >
                                                ✏️ Modifier
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-danger" 
                                                onClick={() => handleCancelRequest(req)}
                                            >
                                                🗑️ Annuler
                                            </button>
                                        </div>
                                    )}
                                    {req.status !== 'pending_manager' && req.status !== 'pending_admin' && (
                                        <span className="info-text" style={{ fontSize: '11px', color: '#888' }}>
                                            Non modifiable
                                        </span>
                                    )}
                                    {req.status === 'pending_admin' && (
                                        <span className="info-text" style={{ fontSize: '11px', color: '#ff9800' }}>
                                            ⏳ Déjà validé par manager
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredRequests.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                                    📭 Aucune demande ne correspond à vos critères
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="actions-bar mt-20">
                <button className="btn btn-primary" onClick={() => navigate('/dashboard/employee/new-request')}>➕ Nouvelle demande</button>
                <button className="btn btn-secondary" onClick={() => {
                    setFilterStatus('all');
                    setFilterType('all');
                    setSearchTerm('');
                }}>🔄 Afficher tout</button>
            </div>
        </>
    );

    const CalendarPage = () => (
        <>
            <h2>📅 Calendrier des congés</h2>
            <CalendarView requests={requests} />
        </>
    );

    const StatisticsPage = () => (
        <>
            <StatisticsChart requests={requests} balance={balance} />
        </>
    );

    const currentPath = location.pathname;

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

    if (currentPath.includes('/permission')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <PermissionRequest onSuccess={handleRequestSuccess} />
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
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <CalendarPage />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

    if (currentPath.includes('/statistics')) {
        return (
            <>
                <Navbar user={user} role="employee" onLogout={onLogout} />
                <div className="app-container">
                    <Sidebar role="employee" />
                    <main className="main-content">
                        <StatisticsPage />
                    </main>
                </div>
                <Footer />
                <ToastNotification toasts={toasts} removeToast={removeToast} />
            </>
        );
    }

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
            
            {editingRequest && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <EditLeaveRequest 
                            request={editingRequest} 
                            onSave={handleSaveEdit}
                            onCancel={handleCloseEdit}
                        />
                    </div>
                </div>
            )}
            
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
}

export default EmployeeDashboard;