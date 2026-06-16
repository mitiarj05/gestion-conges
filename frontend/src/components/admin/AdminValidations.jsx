// frontend/src/components/admin/AdminValidations.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';

function AdminValidations() {
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [filteredApprovals, setFilteredApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [stats, setStats] = useState({ total: 0, permissions: 0, conges: 0 });

    const { toasts, removeToast, success, error: toastError } = useToast();

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchPendingApprovals();
        const interval = setInterval(fetchPendingApprovals, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterApprovals();
    }, [pendingApprovals, searchTerm, filterType]);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/pending-approvals`, getAuthHeaders());
            setPendingApprovals(response.data);
            calculateStats(response.data);
        } catch (error) {
            console.error('Erreur chargement validations:', error);
            toastError('Erreur lors du chargement des validations');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (approvals) => {
        const permissions = approvals.filter(r => r.type_conge_id === 3 || r.request_type === 'permission').length;
        const conges = approvals.length - permissions;
        setStats({
            total: approvals.length,
            permissions: permissions,
            conges: conges
        });
    };

    const filterApprovals = () => {
        let filtered = [...pendingApprovals];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(req =>
                (req.prenom && req.prenom.toLowerCase().includes(term)) ||
                (req.nom && req.nom.toLowerCase().includes(term)) ||
                (req.email && req.email.toLowerCase().includes(term))
            );
        }

        if (filterType !== 'all') {
            if (filterType === 'permission') {
                filtered = filtered.filter(req => req.type_conge_id === 3 || req.request_type === 'permission');
            } else if (filterType === 'conges') {
                filtered = filtered.filter(req => req.type_conge_id !== 3 && req.request_type !== 'permission');
            }
        }

        setFilteredApprovals(filtered);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterType('all');
    };

    const handleFinalApprove = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'la permission' : 'le congé';
        if (!window.confirm(`Approuver définitivement ${typeLabel} ?`)) return;
        setProcessingId(id);
        try {
            await axios.put(`${API_URL}/admin/final-approve/${id}`, 
                { request_type }, getAuthHeaders());
            success('Demande approuvée définitivement');
            fetchPendingApprovals();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur approbation');
        } finally {
            setProcessingId(null);
        }
    };

    const handleFinalReject = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'la permission' : 'le congé';
        const motif = prompt(`Motif du refus de ${typeLabel} :`);
        if (!motif) return;
        setProcessingId(id);
        try {
            await axios.put(`${API_URL}/admin/final-reject/${id}`, 
                { motif, request_type }, getAuthHeaders());
            success('Demande refusée');
            fetchPendingApprovals();
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur refus');
        } finally {
            setProcessingId(null);
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

    const getStatusLabel = (statut) => {
        switch(statut) {
            case 'pending_manager': return <span className="status-badge status-badge-pending">En attente manager</span>;
            case 'pending_admin': return <span className="status-badge status-badge-admin">En attente validation</span>;
            case 'approved': return <span className="status-badge status-badge-approved">Approuvé</span>;
            case 'rejected': return <span className="status-badge status-badge-rejected">Refusé</span>;
            default: return <span className="status-badge">{statut}</span>;
        }
    };

    const isPermission = (req) => {
        return req.type_conge_id === 3 || req.request_type === 'permission';
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '400px' }}>
                <div className="loading-spinner"></div>
                <div>Chargement des validations...</div>
            </div>
        );
    }

    return (
        <div className="admin-validations">
            <ToastNotification toasts={toasts} removeToast={removeToast} />

            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Validations en attente</h1>
                    <p className="dashboard-subtitle">Validez ou refusez les demandes pré-approuvées par les managers</p>
                </div>
                <div className="dashboard-header-actions">
                    <button className="btn-refresh" onClick={fetchPendingApprovals}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg>
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Statistiques */}
            {stats.total > 0 && (
                <div className="payroll-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="payroll-stat-card">
                        <div className="payroll-stat-icon orange">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                        </div>
                        <div className="payroll-stat-info">
                            <div className="payroll-stat-value">{stats.total}</div>
                            <div className="payroll-stat-label">Total à valider</div>
                        </div>
                    </div>
                    <div className="payroll-stat-card">
                        <div className="payroll-stat-icon green">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                        </div>
                        <div className="payroll-stat-info">
                            <div className="payroll-stat-value">{stats.conges}</div>
                            <div className="payroll-stat-label">Congés</div>
                        </div>
                    </div>
                    <div className="payroll-stat-card">
                        <div className="payroll-stat-icon orange" style={{ background: '#fef3c7', color: '#92400e' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div className="payroll-stat-info">
                            <div className="payroll-stat-value" style={{ color: '#92400e' }}>{stats.permissions}</div>
                            <div className="payroll-stat-label" style={{ color: '#92400e' }}>Permissions</div>
                        </div>
                    </div>
                </div>
            )}

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
                        <label>📝 Type</label>
                        <select className="form-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">Tous</option>
                            <option value="conges">Congés</option>
                            <option value="permission">Permissions</option>
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
                    {filteredApprovals.length} demande(s) à valider
                </div>
            </div>

            {/* Liste des validations */}
            {filteredApprovals.length === 0 ? (
                <div className="empty-state-card">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <p>Aucune validation en attente</p>
                    <span>Toutes les demandes ont été traitées</span>
                </div>
            ) : (
                <div className="requests-list-modern">
                    {filteredApprovals.map(req => {
                        const isPerm = isPermission(req);
                        
                        return (
                            <div key={`${req.request_type}-${req.id}`} className="request-card" style={{
                                borderLeft: isPerm ? '4px solid #f59e0b' : '4px solid #667eea',
                                marginBottom: '12px'
                            }}>
                                <div className="request-card-info">
                                    <div className="request-employee">
                                        <div className="employee-avatar" style={{ 
                                            background: isPerm ? '#f59e0b' : '#667eea',
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: '600',
                                            fontSize: '18px'
                                        }}>
                                            {req.prenom?.charAt(0)}{req.nom?.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="employee-name" style={{ fontSize: '16px', fontWeight: '600' }}>
                                                {req.prenom} {req.nom}
                                            </div>
                                            <div className="request-details" style={{ fontSize: '13px', color: '#64748b' }}>
                                                {isPerm ? (
                                                    <>
                                                        📅 {formatDate(req.date_permission)} • ⏰ {req.duree_heures || 0}h
                                                        {req.est_demi_journee ? ' • Demi-journée' : ''}
                                                    </>
                                                ) : (
                                                    <>
                                                        📅 {formatDate(req.date_debut)} → {formatDate(req.date_fin)} • {req.type_name} • {req.nombre_jours} jours
                                                    </>
                                                )}
                                            </div>
                                            {isPerm && (
                                                <div className="request-type-badge" style={{
                                                    display: 'inline-block',
                                                    background: '#fef3c7',
                                                    color: '#92400e',
                                                    padding: '2px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    marginTop: '6px'
                                                }}>
                                                    ⏰ Permission
                                                </div>
                                            )}
                                            {!isPerm && (
                                                <div className="request-type-badge" style={{
                                                    display: 'inline-block',
                                                    background: '#dbeafe',
                                                    color: '#1e40af',
                                                    padding: '2px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    marginTop: '6px'
                                                }}>
                                                    {req.type_name}
                                                </div>
                                            )}
                                            {req.manager_nom && (
                                                <div className="request-manager" style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                                    Pré-validé par : {req.manager_prenom} {req.manager_nom}
                                                </div>
                                            )}
                                            {req.motif && (
                                                <div className="request-motive" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                                    📝 Motif : {req.motif}
                                                </div>
                                            )}
                                            <div className="request-status-info" style={{ 
                                                color: '#f59e0b', 
                                                fontSize: '12px', 
                                                marginTop: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <polyline points="12 6 12 12 16 14"/>
                                                </svg>
                                                En attente de votre validation finale (2ème étape)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="request-card-actions" style={{ 
                                    display: 'flex', 
                                    gap: '12px',
                                    marginTop: '12px',
                                    paddingTop: '12px',
                                    borderTop: '1px solid #e2e8f0'
                                }}>
                                    <button 
                                        className="btn-approve" 
                                        onClick={() => handleFinalApprove(req.id, req.request_type)} 
                                        disabled={processingId === req.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 24px',
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                        {processingId === req.id ? '...' : 'Approuver'}
                                    </button>
                                    <button 
                                        className="btn-reject" 
                                        onClick={() => handleFinalReject(req.id, req.request_type)} 
                                        disabled={processingId === req.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 24px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12"/>
                                        </svg>
                                        Refuser
                                    </button>
                                    <button 
                                        className="btn-view" 
                                        onClick={() => {
                                            // Afficher les détails de la demande
                                            alert(`Détails de la demande :\n\nEmployé : ${req.prenom} ${req.nom}\nType : ${isPerm ? 'Permission' : req.type_name}\nDates : ${isPerm ? req.date_permission : req.date_debut + ' → ' + req.date_fin}\nDurée : ${isPerm ? req.duree_heures + 'h' : req.nombre_jours + ' jours'}\nStatut : En attente de validation\nMotif : ${req.motif || 'Non spécifié'}\nPré-validé par : ${req.manager_prenom || ''} ${req.manager_nom || 'Non spécifié'}`);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 20px',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                        Détails
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="info-card-tip">
                <div className="tip-icon">ℹ️</div>
                <div className="tip-content">
                    <strong>Processus de validation :</strong><br/>
                    • Les demandes affichées ont déjà été validées par le manager (1ère étape).<br/>
                    • Vous devez effectuer la validation finale (2ème étape).<br/>
                    • Une fois approuvée, la demande est définitivement validée.<br/>
                    • En cas de refus, un motif est demandé pour informer l'employé.
                </div>
            </div>
        </div>
    );
}

export default AdminValidations;