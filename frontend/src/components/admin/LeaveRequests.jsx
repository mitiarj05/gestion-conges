// frontend/src/components/admin/LeaveRequests.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';

function LeaveRequests() {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [periodeFilter, setPeriodeFilter] = useState('all');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

    const { toasts, removeToast, success, error: toastError } = useToast();

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    useEffect(() => {
        filterRequests();
    }, [leaveRequests, searchTerm, filterStatus, filterType, periodeFilter]);

    const fetchLeaveRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/leave-requests`, getAuthHeaders());
            setLeaveRequests(response.data);
            calculateStats(response.data);
        } catch (error) {
            console.error('Erreur chargement demandes:', error);
            toastError('Erreur lors du chargement des demandes');
        } finally {
            setLoading(false);
        }
    };

    const fetchFilteredLeaveRequests = async (periode) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/leave-requests-filtered?periode=${periode}`, getAuthHeaders());
            setLeaveRequests(response.data);
            calculateStats(response.data);
        } catch (error) {
            console.error('Erreur filtrage:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (requests) => {
        setStats({
            total: requests.length,
            approved: requests.filter(r => r.statut === 'approved').length,
            pending: requests.filter(r => r.statut === 'pending_manager' || r.statut === 'pending_admin').length,
            rejected: requests.filter(r => r.statut === 'rejected').length
        });
    };

    const filterRequests = () => {
        let filtered = [...leaveRequests];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(req =>
                (req.prenom && req.prenom.toLowerCase().includes(term)) ||
                (req.nom && req.nom.toLowerCase().includes(term)) ||
                (req.email && req.email.toLowerCase().includes(term))
            );
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(req => req.statut === filterStatus);
        }

        if (filterType !== 'all') {
            filtered = filtered.filter(req => {
                if (filterType === 'cp') return req.type_conge_id === 1;
                if (filterType === 'sans_solde') return req.type_conge_id === 2;
                if (filterType === 'permission') return req.type_conge_id === 3;
                return true;
            });
        }

        setFilteredRequests(filtered);
    };

    const handlePeriodeChange = (periode) => {
        setPeriodeFilter(periode);
        fetchFilteredLeaveRequests(periode);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setFilterType('all');
        setPeriodeFilter('all');
        fetchLeaveRequests();
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const openDetailModal = (request) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    };

    // Fonction pour déterminer si c'est une permission
    const isPermission = (req) => {
        return req.type_conge_id === 3 || req.type_name === 'Permission';
    };

    // Fonction pour afficher le type avec badge
    const getTypeDisplay = (req) => {
        if (isPermission(req)) {
            return (
                <span style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#fef3c7', 
                    color: '#92400e', 
                    padding: '2px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: '600'
                }}>
                    ⏰ Permission
                </span>
            );
        }
        return req.type_name || 'Congé';
    };

    // Fonction pour afficher les dates
    const getDatesDisplay = (req) => {
        if (isPermission(req)) {
            return (
                <div className="period-cell">
                    <span className="month" style={{ color: '#f59e0b' }}>📅 {formatDate(req.date_permission)}</span>
                    {req.est_demi_journee && (
                        <span className="year" style={{ color: '#f59e0b', fontSize: '11px' }}>
                            Demi-journée
                        </span>
                    )}
                </div>
            );
        }
        return (
            <div className="period-cell">
                <span className="month">{formatDate(req.date_debut)} →</span>
                <span className="year">{formatDate(req.date_fin)}</span>
            </div>
        );
    };

    // Fonction pour afficher la durée
    const getDurationDisplay = (req) => {
        if (isPermission(req)) {
            return (
                <span className="amount" style={{ color: '#f59e0b', fontWeight: '500' }}>
                    {req.duree_heures || 0} h
                </span>
            );
        }
        return (
            <span className="amount">
                {req.nombre_jours || 0} j
            </span>
        );
    };

    // Fonction pour afficher le motif
    const getMotifDisplay = (req) => {
        if (isPermission(req) && req.motif) {
            return req.motif;
        }
        return req.motif || '-';
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '400px' }}>
                <div className="loading-spinner"></div>
                <div>Chargement des demandes...</div>
            </div>
        );
    }

    return (
        <div className="leave-requests-admin">
            <ToastNotification toasts={toasts} removeToast={removeToast} />

            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Gestion des demandes</h1>
                    <p className="dashboard-subtitle">Consultez et gérez toutes les demandes de l'entreprise</p>
                </div>
                <div className="dashboard-header-actions">
                    <button className="btn-refresh" onClick={fetchLeaveRequests}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg>
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Cartes stats */}
            <div className="payroll-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4v16h16V4H4z"/>
                            <line x1="8" y1="9" x2="16" y2="9"/>
                            <line x1="8" y1="13" x2="16" y2="13"/>
                            <line x1="8" y1="17" x2="12" y2="17"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{stats.total}</div>
                        <div className="payroll-stat-label">Total demandes</div>
                    </div>
                </div>
                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon green">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{stats.approved}</div>
                        <div className="payroll-stat-label">Approuvées</div>
                    </div>
                </div>
                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{stats.pending}</div>
                        <div className="payroll-stat-label">En attente</div>
                    </div>
                </div>
                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon red">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{stats.rejected}</div>
                        <div className="payroll-stat-label">Refusées</div>
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="filters-bar">
                <div className="filters-row">
                    <div className="filter-group search-group">
                        <label>🔍 Rechercher</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nom, prénom ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>📊 Période</label>
                        <select className="form-input" value={periodeFilter} onChange={(e) => handlePeriodeChange(e.target.value)}>
                            <option value="all">Toutes</option>
                            <option value="month">Ce mois</option>
                            <option value="quarter">Ce trimestre</option>
                            <option value="year">Cette année</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>🏷️ Statut</label>
                        <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">Tous</option>
                            <option value="pending_manager">En attente manager</option>
                            <option value="pending_admin">En attente admin</option>
                            <option value="approved">Approuvé</option>
                            <option value="rejected">Refusé</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>📝 Type</label>
                        <select className="form-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">Tous</option>
                            <option value="cp">Congés Payés</option>
                            <option value="sans_solde">Congé sans solde</option>
                            <option value="permission">⏰ Permission</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>&nbsp;</label>
                        <button className="reset-btn" onClick={resetFilters}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                            </svg>
                            Réinitialiser
                        </button>
                    </div>
                </div>
                <div className="filters-info">
                    {filteredRequests.length} demande(s) affichée(s)
                </div>
            </div>

            {/* Tableau des demandes */}
            <div className="payroll-table-container">
                <div className="table-header">
                    <h3>Liste des demandes</h3>
                    <div className="table-stats">
                        {filteredRequests.length} résultat(s)
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="payroll-table">
                        <thead>
                            <tr>
                                <th>Employé</th>
                                <th>Service</th>
                                <th>Dates</th>
                                <th>Type</th>
                                <th>Durée</th>
                                <th>Statut</th>
                                <th>Date demande</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        <p>Aucune demande trouvée</p>
                                        <span>Modifiez les filtres ou attendez de nouvelles demandes</span>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => {
                                    const isPerm = isPermission(req);
                                    
                                    return (
                                        <tr key={req.id}>
                                            <td>
                                                <div className="employee-cell">
                                                    <div className="employee-avatar" style={{ 
                                                        background: isPerm ? '#f59e0b' : '#667eea' 
                                                    }}>
                                                        {req.prenom?.charAt(0)}{req.nom?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="employee-name">{req.prenom} {req.nom}</div>
                                                        <div className="employee-email">{req.email || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{req.service || '-'}</td>
                                            <td>{getDatesDisplay(req)}</td>
                                            <td>{getTypeDisplay(req)}</td>
                                            <td>{getDurationDisplay(req)}</td>
                                            <td>{getStatusLabel(req.statut)}</td>
                                            <td className="date-cell">{formatDate(req.cree_le)}</td>
                                            <td>
                                                <button
                                                    className="action-btn view"
                                                    onClick={() => openDetailModal(req)}
                                                    title="Voir détails"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                        <circle cx="12" cy="12" r="3"/>
                                                    </svg>
                                                    Détails
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Détails */}
            {showDetailModal && selectedRequest && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
                    <div className="modal" style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h3>Détail de la demande</h3>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>✖</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-item" style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-tertiary, #f8fafc)', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div className="employee-avatar" style={{ 
                                        background: isPermission(selectedRequest) ? '#f59e0b' : '#667eea', 
                                        width: '48px', 
                                        height: '48px', 
                                        fontSize: '18px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        borderRadius: '12px', 
                                        color: 'white' 
                                    }}>
                                        {selectedRequest.prenom?.charAt(0)}{selectedRequest.nom?.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary, #1e293b)' }}>
                                            {selectedRequest.prenom} {selectedRequest.nom}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                                            {selectedRequest.email}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)' }}>
                                            {selectedRequest.service || 'Service non spécifié'}
                                        </div>
                                    </div>
                                    {isPermission(selectedRequest) && (
                                        <span style={{ 
                                            marginLeft: 'auto',
                                            background: '#fef3c7', 
                                            color: '#92400e', 
                                            padding: '4px 12px', 
                                            borderRadius: '20px', 
                                            fontSize: '12px', 
                                            fontWeight: '600'
                                        }}>
                                            ⏰ Permission
                                        </span>
                                    )}
                                </div>
                                
                                {isPermission(selectedRequest) ? (
                                    // Affichage pour une permission
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                            <span style={{ color: 'var(--text-secondary, #475569)' }}>📅 Date :</span>
                                            <strong style={{ color: 'var(--text-primary, #1e293b)' }}>
                                                {formatDate(selectedRequest.date_permission)}
                                            </strong>
                                        </div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                            <span style={{ color: 'var(--text-secondary, #475569)' }}>⏰ Durée :</span>
                                            <strong style={{ color: 'var(--text-primary, #1e293b)' }}>
                                                {selectedRequest.duree_heures || 0} heure(s)
                                            </strong>
                                        </div>
                                        
                                        {selectedRequest.est_demi_journee && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                                <span style={{ color: 'var(--text-secondary, #475569)' }}>📋 Type :</span>
                                                <strong style={{ color: '#f59e0b' }}>Demi-journée</strong>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // Affichage pour un congé
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                            <span style={{ color: 'var(--text-secondary, #475569)' }}>📅 Période :</span>
                                            <strong style={{ color: 'var(--text-primary, #1e293b)' }}>
                                                {formatDate(selectedRequest.date_debut)} → {formatDate(selectedRequest.date_fin)}
                                            </strong>
                                        </div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                            <span style={{ color: 'var(--text-secondary, #475569)' }}>📊 Durée :</span>
                                            <strong style={{ color: 'var(--text-primary, #1e293b)' }}>
                                                {selectedRequest.nombre_jours} jours
                                            </strong>
                                        </div>
                                    </>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                    <span style={{ color: 'var(--text-secondary, #475569)' }}>📌 Statut :</span>
                                    <strong>{getStatusLabel(selectedRequest.statut)}</strong>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light, #e2e8f0)' }}>
                                    <span style={{ color: 'var(--text-secondary, #475569)' }}>📅 Date demande :</span>
                                    <strong style={{ color: 'var(--text-primary, #1e293b)' }}>
                                        {formatDate(selectedRequest.cree_le)}
                                    </strong>
                                </div>
                                
                                {selectedRequest.motif && (
                                    <div style={{ padding: '12px', marginTop: '12px', background: 'var(--info-bg, #eff6ff)', borderRadius: '10px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--info-text, #1e40af)' }}>📝 Motif :</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-primary, #1e293b)' }}>{selectedRequest.motif}</div>
                                    </div>
                                )}
                                
                                {selectedRequest.motif_refus && (
                                    <div style={{ padding: '12px', marginTop: '12px', background: 'var(--danger-bg, #fee2e2)', borderRadius: '10px' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--danger-text, #dc2626)' }}>❌ Motif du refus :</div>
                                        <div style={{ fontSize: '13px', color: 'var(--danger-text, #dc2626)' }}>{selectedRequest.motif_refus}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowDetailModal(false)} style={{ 
                                background: 'var(--bg-tertiary, #f1f5f9)', 
                                border: '1px solid var(--border-light, #e2e8f0)', 
                                color: 'var(--text-secondary, #475569)'
                            }}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaveRequests;