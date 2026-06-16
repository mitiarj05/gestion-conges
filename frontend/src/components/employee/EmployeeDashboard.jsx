// frontend/src/components/employee/EmployeeDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';
import Footer from '../common/Footer';
import LeaveBalance from './LeaveBalance';
import LeaveRequest from './LeaveRequest';
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
import Profile from '../common/Profile';
import ChatbotWidget from '../chatbot/ChatbotWidget';

console.log('📁 [EmployeeDashboard] Chargement du module');

function EmployeeDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [balance, setBalance] = useState({
        cp_total: 25, cp_pris: 0, cp_restant: 25,
        permissions_count: 0,
        permissions_heures: 0,
        permissions_max: 2,
        permissions_max_heures: 4
    });
    const [requests, setRequests] = useState([]);
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

    console.log(`🔧 [EmployeeDashboard] Initialisation - path: ${location.pathname}`);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchBalance = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            const response = await axios.get(`${API_URL}/leaves/balance`, getAuthHeaders());
            setBalance({
                cp_total: response.data.cp_total || 25,
                cp_pris: response.data.cp_pris || 0,
                cp_restant: response.data.cp_restant || 25,
                permissions_count: response.data.permissions_count || 0,
                permissions_heures: response.data.permissions_heures || 0,
                permissions_max: response.data.permissions_max || 2,
                permissions_max_heures: response.data.permissions_max_heures || 4
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

    const fetchRequests = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get(`${API_URL}/leaves/my-requests`, getAuthHeaders());
            
            const formattedRequests = response.data.map(req => {
                let normalizedStatus = req.status || req.statut;
                if (!normalizedStatus || normalizedStatus === 'En attente' || normalizedStatus === 'en_attente') {
                    normalizedStatus = 'pending_manager';
                }
                if (normalizedStatus === 'cancelled') {
                    normalizedStatus = 'cancelled';
                }
                const validStatuses = ['pending_manager', 'pending_admin', 'approved', 'rejected', 'cancelled'];
                if (!validStatuses.includes(normalizedStatus)) {
                    normalizedStatus = 'pending_manager';
                }
                
                // Gestion des types
                let displayType = req.type;
                if (req.type_id === 1) {
                    displayType = 'Congés Payés';
                } else if (req.type_id === 2) {
                    displayType = 'Congé sans solde';
                } else if (req.type_id === 3) {
                    displayType = 'Permission';
                }
                
                // Gestion des dates et durées selon le type
                let displayDates = '';
                let displayDuration = '';
                let requestType = 'conges';
                let isPermission = req.type_id === 3;
                
                if (isPermission) {
                    displayDates = req.date_permission || req.start_date;
                    displayDuration = `${req.duree_heures || 0} heure(s)`;
                    requestType = 'permission';
                } else {
                    displayDates = `${req.start_date || req.date_debut} → ${req.end_date || req.date_fin}`;
                    displayDuration = `${req.duration || req.nombre_jours || 0} jour(s)`;
                    requestType = 'conges';
                }
                
                return {
                    id: req.id,
                    start_date: req.start_date || req.date_debut,
                    end_date: req.end_date || req.date_fin,
                    date_permission: req.date_permission,
                    duree_heures: req.duree_heures,
                    est_demi_journee: req.est_demi_journee,
                    type_id: req.type_id || 2,
                    type: displayType,
                    duration: req.duration || req.nombre_jours || req.duree_heures || 0,
                    status: normalizedStatus,
                    motif: req.motif || '',
                    motif_refus: req.motif_refus || '',
                    request_type: requestType,
                    isPermission: isPermission,
                    displayDates: displayDates,
                    displayDuration: displayDuration
                };
            });
            
            setRequests(formattedRequests);
            
            const justifs = {};
            for (const req of formattedRequests) {
                if (req.request_type !== 'permission') {
                    try {
                        const justifResponse = await axios.get(`${API_URL}/leaves/justificatifs/${req.id}`, getAuthHeaders());
                        justifs[req.id] = justifResponse.data;
                    } catch (e) { justifs[req.id] = []; }
                } else { justifs[req.id] = []; }
            }
            setJustificatifs(justifs);
        } catch (error) { 
            console.error('Erreur chargement demandes:', error); 
        }
    }, []);

    const fetchAllData = useCallback(async () => {
        await Promise.all([fetchBalance(), fetchRequests()]);
        setLoading(false);
    }, [fetchBalance, fetchRequests]);

    const refreshAllData = useCallback(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        console.log('📦 [EmployeeDashboard] Montage');
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchAllData();
        const interval = setInterval(() => { fetchAllData(); }, 30000);
        return () => {
            console.log('🗑️ [EmployeeDashboard] Démontage');
            clearInterval(interval);
        };
    }, [fetchAllData]);

    useEffect(() => {
        let filtered = [...requests];
        if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);
        if (filterType !== 'all') {
            if (filterType === 'permission') filtered = filtered.filter(r => r.isPermission === true);
            else if (filterType === 'cp') filtered = filtered.filter(r => r.type_id === 1);
            else if (filterType === 'sans_solde') filtered = filtered.filter(r => r.type_id === 2);
        }
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const searchLower = searchTerm.toLowerCase();
                return (r.displayDates || '').toLowerCase().includes(searchLower) || 
                       (r.motif || '').toLowerCase().includes(searchLower) ||
                       (r.type || '').toLowerCase().includes(searchLower);
            });
        }
        setFilteredRequests(filtered);
    }, [requests, filterStatus, filterType, searchTerm]);

    const handleModifyRequest = (request) => {
        if (request.status !== 'pending_manager') { 
            toastError('Cette demande ne peut plus être modifiée'); 
            return; 
        }
        
        setEditingRequest({
            id: request.id,
            type_id: request.type_id || 1,
            start_date: request.start_date,
            end_date: request.end_date,
            date_permission: request.date_permission,
            duree_heures: request.duree_heures,
            est_demi_journee: request.est_demi_journee,
            motif: request.motif || '',
            type: request.type,
            status: request.status,
            isPermission: request.isPermission,
            request_type: request.request_type
        });
        setShowEditModal(true);
    };

    const handleDeleteRequest = async (request) => {
        const typeLabel = request.isPermission ? 'permission' : 'congé';
        if (window.confirm(`Supprimer définitivement cette demande de ${typeLabel} ?`)) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/leaves/cancel-request/${request.id}`, getAuthHeaders());
                success(`Demande de ${typeLabel} supprimée !`);
                refreshAllData();
            } catch (error) { 
                toastError(error.response?.data?.message || 'Erreur lors de la suppression'); 
            }
        }
    };

    const handleCancelApprovedRequest = async (request) => {
        // Si c'est une permission, annulation simplifiée
        if (request.isPermission) {
            const motif = prompt('Motif de l\'annulation (obligatoire) :');
            if (!motif || motif.trim() === '') {
                toastError('Veuillez fournir un motif pour annuler votre permission.');
                return;
            }
            if (window.confirm(`Confirmer l'annulation de votre permission du ${request.date_permission} ?`)) {
                try {
                    await axios.put(`${API_URL}/leaves/cancel-approved-request/${request.id}`, 
                        { motif_annulation: motif.trim() },
                        getAuthHeaders()
                    );
                    success('Permission annulée avec succès !');
                    refreshAllData();
                } catch (error) {
                    toastError(error.response?.data?.message || 'Erreur lors de l\'annulation');
                }
            }
            return;
        }

        // Pour les congés, vérifier le délai de 48h
        const startDate = new Date(request.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 2) {
            toastError(`Impossible d'annuler : votre congé commence dans moins de 48h (${diffDays} jour(s) restants). Veuillez contacter votre manager.`);
            return;
        }
        
        const motif = prompt('Motif de l\'annulation (obligatoire) :\n\nVeuillez expliquer la raison de l\'annulation de votre congé.');
        
        if (!motif || motif.trim() === '') {
            toastError('Veuillez fournir un motif pour annuler votre congé.');
            return;
        }
        
        if (window.confirm(`Confirmer l'annulation de votre congé ?\n\n📅 Dates : ${request.displayDates}\n📊 Durée : ${request.displayDuration}\n📝 Motif : ${motif}\n\n⚠️ Attention : Cette action est irréversible. Les jours seront recrédités sur votre solde.`)) {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.put(`${API_URL}/leaves/cancel-approved-request/${request.id}`, 
                    { motif_annulation: motif.trim() },
                    getAuthHeaders()
                );
                
                if (response.data.success) {
                    success(response.data.message);
                    if (response.data.recreditedDays > 0) {
                        success(`${response.data.recreditedDays} jours ont été recrédités sur votre solde de CP.`);
                    }
                    refreshAllData();
                }
            } catch (error) {
                const errorMsg = error.response?.data?.message || 'Erreur lors de l\'annulation';
                toastError(errorMsg);
            }
        }
    };

    const handleSaveEdit = async (editedData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_URL}/leaves/update-request/${editingRequest.id}`, editedData, getAuthHeaders());
            success(response.data.message || 'Demande modifiée !');
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

    const getStatusLabel = (status, motif_refus, userRoles = []) => {
        let normalizedStatus = status;
        if (!status || status === 'En attente' || status === 'en_attente') normalizedStatus = 'pending_manager';
        
        const isManager = userRoles && userRoles.includes('manager');
        const isAdmin = userRoles && userRoles.includes('admin');
        
        switch(normalizedStatus) {
            case 'pending_manager': 
                if (isManager || isAdmin) {
                    return <span className="status-badge status-badge-admin">En attente validation admin</span>;
                }
                return <span className="status-badge status-badge-pending">En attente validation manager</span>;
            case 'pending_admin': 
                return <span className="status-badge status-badge-admin">En attente validation admin</span>;
            case 'approved': 
                return <span className="status-badge status-badge-approved">Approuvé</span>;
            case 'rejected': 
                return (<><span className="status-badge status-badge-rejected">Refusé</span>
                        {motif_refus && <div className="rejection-reason">Motif : {motif_refus}</div>}
                        </>);
            case 'cancelled':
                return <span className="status-badge status-badge-cancelled">Annulé</span>;
            default: 
                return <span className="status-badge status-badge-pending">En attente</span>;
        }
    };

    const handleRequestSuccess = () => { 
        refreshAllData(); 
        success('Demande envoyée !'); 
        navigate('/dashboard/employee/requests'); 
    };
    
    const handleJustificatifUpload = () => { 
        fetchRequests(); 
        success('Justificatif ajouté !'); 
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement...</div>
            </div>
        );
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

    const currentPath = location.pathname;

    const renderMainContent = () => {
        console.log(`🎨 [EmployeeDashboard] Rendu du contenu pour: ${currentPath}`);

        if (currentPath.includes('/profile')) {
            return (
                <Profile user={user} role="employee" onLogout={onLogout} onProfileUpdate={(updatedUser) => {
                    setUser(updatedUser);
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedUser }));
                }} />
            );
        }

        if (currentPath.includes('/payroll')) {
            return <EmployeePayroll />;
        }

        if (currentPath.includes('/balance')) {
            return <LeaveBalance balance={balance} />;
        }

        if (currentPath.includes('/requests')) {
            return (
                <>
                    <div className="page-header">
                        <h2>Mes demandes</h2>
                        <p className="page-subtitle">Historique complet de toutes vos demandes (congés et permissions)</p>
                    </div>
                    
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
                        showPermissionFilter={true}
                    />
                    
                    <div className="table-wrapper-modern">
                        <table className="modern-table full-width">
                            <thead>
                                <tr>
                                    <th>Dates</th>
                                    <th>Type</th>
                                    <th>Durée</th>
                                    <th>Motif</th>
                                    <th>Statut</th>
                                    <th>Justificatif</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req) => {
                                    const isApproved = req.status === 'approved';
                                    const startDate = new Date(req.start_date);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const canCancelApproved = isApproved && startDate > today;
                                    
                                    const isPermission = req.isPermission;
                                    
                                    return (
                                        <tr key={req.id}>
                                            <td className="date-cell">
                                                {isPermission ? (
                                                    <span style={{ color: '#f59e0b' }}>📅 {req.displayDates}</span>
                                                ) : (
                                                    req.displayDates
                                                )}
                                                {isPermission && req.est_demi_journee && (
                                                    <div style={{ fontSize: '11px', color: '#f59e0b' }}>Demi-journée</div>
                                                )}
                                            </td>
                                            <td>
                                                {isPermission ? (
                                                    <span style={{ 
                                                        background: '#fef3c7', 
                                                        color: '#92400e', 
                                                        padding: '2px 10px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '11px', 
                                                        fontWeight: '600',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        ⏰ Permission
                                                    </span>
                                                ) : (
                                                    req.type
                                                )}
                                            </td>
                                            <td>
                                                {isPermission ? (
                                                    <span style={{ color: '#f59e0b', fontWeight: '500' }}>
                                                        {req.displayDuration}
                                                    </span>
                                                ) : (
                                                    req.displayDuration
                                                )}
                                            </td>
                                            <td>{req.motif || '-'}</td>
                                            <td>{getStatusLabel(req.status, req.motif_refus, user.roles)}</td>
                                            <td>
                                                {justificatifs[req.id]?.length > 0 ? (
                                                    <span className="badge-success">Fichier(s)</span>
                                                ) : (req.status === 'pending_manager' && !isPermission && (
                                                    <FileUpload demandeId={req.id} onUploadComplete={handleJustificatifUpload} />
                                                ))}
                                            </td>
                                            <td>
                                                {req.status === 'pending_manager' && (
                                                    <div className="action-buttons">
                                                        <button className="action-btn edit" onClick={() => handleModifyRequest(req)} title="Modifier">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M17 3l4 4-7 7H10v-4l7-7z"/>
                                                                <path d="M4 20h16"/>
                                                            </svg>
                                                        </button>
                                                        <button className="action-btn delete" onClick={() => handleDeleteRequest(req)} title="Supprimer">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status === 'approved' && canCancelApproved && (
                                                    <div className="action-buttons">
                                                        <button className="action-btn cancel" onClick={() => handleCancelApprovedRequest(req)} title="Annuler">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 6L6 18M6 6l12 12"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status === 'approved' && !canCancelApproved && (
                                                    <span className="info-text">Non annulable</span>
                                                )}
                                                {req.status === 'pending_admin' && <span className="info-text">Déjà validé par manager</span>}
                                                {(req.status === 'rejected' || req.status === 'cancelled') && <span className="info-text">Non modifiable</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="empty-state">Aucune demande</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="actions-bar-bottom">
                        <button className="btn-primary" onClick={() => navigate('/dashboard/employee/new-request')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            Nouvelle demande
                        </button>
                        <button className="btn-secondary" onClick={() => { setFilterStatus('all'); setFilterType('all'); setSearchTerm(''); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                            Réinitialiser les filtres
                        </button>
                    </div>
                    {renderEditModal()}
                </>
            );
        }

        if (currentPath.includes('/new-request')) {
            return <LeaveRequest onSuccess={handleRequestSuccess} />;
        }

        if (currentPath.includes('/calendar')) {
            return <CalendarView requests={requests} onRequestUpdate={refreshAllData} />;
        }

        if (currentPath.includes('/statistics')) {
            return <StatisticsChart requests={requests} balance={balance} />;
        }

        if (currentPath.includes('/manager-profile')) {
            return <ManagerProfile />;
        }

        // DASHBOARD PRINCIPAL
        return (
            <>
                <div className="dashboard-header">
                    <div className="dashboard-header-content">
                        <h1 className="dashboard-title">Tableau de bord</h1>
                        <p className="dashboard-subtitle">Bonjour {user.prenom} {user.nom} · Vue d'ensemble de vos congés</p>
                    </div>
                    <div className="dashboard-header-actions">
                        <button className="btn-refresh" onClick={refreshAllData}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                            Actualiser
                        </button>
                    </div>
                </div>

                <AlertBanner balance={balance} />
                
                <div className="kpi-grid">
                    <div className="kpi-card-modern">
                        <div className="kpi-card-icon green">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                                <path d="M12 6v2l4 2"/>
                            </svg>
                        </div>
                        <div className="kpi-card-info">
                            <div className="kpi-card-value">{balance.cp_restant || 0} jours</div>
                            <div className="kpi-card-label">Congés Payés restants</div>
                            <div className="kpi-card-sub">Total: {balance.cp_total || 25} jours</div>
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
                            <div className="kpi-card-value">{balance.permissions_count || 0} / {balance.permissions_max || 2}</div>
                            <div className="kpi-card-label">Permissions ce mois</div>
                            <div className="kpi-card-sub">{balance.permissions_heures || 0}h utilisées</div>
                        </div>
                    </div>

                    <div className="kpi-card-modern">
                        <div className="kpi-card-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                        </div>
                        <div className="kpi-card-info">
                            <div className="kpi-card-value">{requests.filter(r => r.status === 'pending_manager' || r.status === 'pending_admin').length}</div>
                            <div className="kpi-card-label">Demandes en attente</div>
                            <div className="kpi-card-sub">en cours de validation</div>
                        </div>
                    </div>

                    <div className="kpi-card-modern">
                        <div className="kpi-card-icon purple">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        </div>
                        <div className="kpi-card-info">
                            <div className="kpi-card-value">{requests.filter(r => r.status === 'approved').length}</div>
                            <div className="kpi-card-label">Demandes approuvées</div>
                            <div className="kpi-card-sub">validées</div>
                        </div>
                    </div>
                </div>
                
                <div className="quick-actions">
                    <h3>Actions rapides</h3>
                    <div className="quick-actions-grid">
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/employee/profile')}>
                            <span className="quick-action-icon">👤</span>
                            <span>Mon profil</span>
                        </button>
                        <button className="quick-action-btn primary" onClick={() => navigate('/dashboard/employee/new-request')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                            <span>Nouvelle demande</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/employee/requests')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4v16h16V4H4z"/>
                                <line x1="8" y1="9" x2="16" y2="9"/>
                                <line x1="8" y1="13" x2="16" y2="13"/>
                                <line x1="8" y1="17" x2="12" y2="17"/>
                            </svg>
                            <span>Mes demandes</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/employee/calendar')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>Calendrier</span>
                        </button>
                        <button className="quick-action-btn" onClick={() => navigate('/dashboard/employee/balance')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>Mon solde</span>
                        </button>
                    </div>
                </div>
                
                <div className="recent-section">
                    <div className="section-header">
                        <h3>Dernières demandes</h3>
                        <button className="btn-view-all" onClick={() => navigate('/dashboard/employee/requests')}>
                            Voir toutes →
                        </button>
                    </div>
                    <div className="table-wrapper-modern">
                        <table className="modern-table full-width">
                            <thead>
                                <tr>
                                    <th>Dates</th>
                                    <th>Type</th>
                                    <th>Durée</th>
                                    <th>Motif</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.slice(0, 5).map((req) => {
                                    const isApproved = req.status === 'approved';
                                    const startDate = new Date(req.start_date);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const canCancelApproved = isApproved && startDate > today;
                                    const isPermission = req.isPermission;
                                    
                                    return (
                                        <tr key={req.id}>
                                            <td className="date-cell">
                                                {isPermission ? (
                                                    <span style={{ color: '#f59e0b' }}>📅 {req.displayDates}</span>
                                                ) : (
                                                    req.displayDates
                                                )}
                                            </td>
                                            <td>
                                                {isPermission ? (
                                                    <span style={{ 
                                                        background: '#fef3c7', 
                                                        color: '#92400e', 
                                                        padding: '2px 10px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '11px', 
                                                        fontWeight: '600'
                                                    }}>
                                                        ⏰ Permission
                                                    </span>
                                                ) : (
                                                    req.type
                                                )}
                                            </td>
                                            <td>{req.displayDuration}</td>
                                            <td>{req.motif || '-'}</td>
                                            <td>{getStatusLabel(req.status, req.motif_refus, user.roles)}</td>
                                            <td>
                                                {req.status === 'pending_manager' && (
                                                    <div className="action-buttons">
                                                        <button className="action-btn edit" onClick={() => handleModifyRequest(req)} title="Modifier">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M17 3l4 4-7 7H10v-4l7-7z"/>
                                                                <path d="M4 20h16"/>
                                                            </svg>
                                                        </button>
                                                        <button className="action-btn delete" onClick={() => handleDeleteRequest(req)} title="Supprimer">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status === 'approved' && canCancelApproved && (
                                                    <button className="action-btn cancel" onClick={() => handleCancelApprovedRequest(req)} title="Annuler">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6l12 12"/>
                                                        </svg>
                                                    </button>
                                                )}
                                                {req.status === 'approved' && !canCancelApproved && (
                                                    <span className="info-text">Non annulable</span>
                                                )}
                                                {req.status === 'pending_admin' && <span className="info-text">Déjà validé</span>}
                                                {(req.status === 'rejected' || req.status === 'cancelled') && <span className="info-text">Non modifiable</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="empty-state">Aucune demande</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {renderEditModal()}
            </>
        );
    };

    return (
        <>
            <Navbar user={user} role="employee" onLogout={onLogout} />
            <div className="app-container">
                <Sidebar role="employee" onLogout={onLogout} />
                <main className="main-content">
                    {renderMainContent()}
                    <Footer />
                </main>
            </div>
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            <ChatbotWidget user={user} role="employe" />
        </>
    );
}

export default EmployeeDashboard;