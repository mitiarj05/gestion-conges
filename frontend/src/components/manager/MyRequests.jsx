// frontend/src/components/manager/MyRequests.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveService } from '../../services/apiService';
import { formatDate } from '../../utils/dateUtils';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import ToastNotification from '../notifications/ToastNotification';
import FileUpload from '../common/FileUpload';

function ManagerMyRequests() {
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingRequest, setEditingRequest] = useState({
        type_id: 1,
        start_date: '',
        end_date: '',
        date_permission: '',
        duree_heures: 1,
        est_demi_journee: false,
        motif: '',
        isPermission: false
    });
    const [toasts, setToasts] = useState([]);
    const [errors, setErrors] = useState([]);
    const [justificatifs, setJustificatifs] = useState({});
    
    // Filtres
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const navigate = useNavigate();

    const addToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => removeToast(id), duration);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const fetchMyRequests = useCallback(async () => {
        setLoading(true);
        try {
            const response = await leaveService.getMyRequests();
            const formattedRequests = response.data.map(req => {
                const isPermission = req.type_id === 3 || req.request_type === 'permission';
                
                let displayDates = '';
                let displayDuration = '';
                
                if (isPermission) {
                    displayDates = req.date_permission || req.start_date;
                    displayDuration = `${req.duree_heures || 0} heure(s)`;
                } else {
                    displayDates = `${formatDate(req.start_date)} → ${formatDate(req.end_date)}`;
                    displayDuration = `${req.duration || req.nombre_jours || 0} jour(s)`;
                }
                
                return {
                    ...req,
                    isPermission: isPermission,
                    displayDates: displayDates,
                    displayDuration: displayDuration
                };
            });
            setRequests(formattedRequests);
            
            // Récupérer les justificatifs
            const justifs = {};
            for (const req of formattedRequests) {
                if (!req.isPermission) {
                    try {
                        const justifResponse = await leaveService.getJustificatifs(req.id);
                        justifs[req.id] = justifResponse.data;
                    } catch (e) {
                        justifs[req.id] = [];
                    }
                } else {
                    justifs[req.id] = [];
                }
            }
            setJustificatifs(justifs);
        } catch (error) {
            console.error('Erreur chargement demandes:', error);
            addToast('Erreur lors du chargement des demandes', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const filterRequests = useCallback(() => {
        let filtered = [...requests];
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(r => r.statut === filterStatus);
        }
        
        if (filterType !== 'all') {
            if (filterType === 'permission') {
                filtered = filtered.filter(r => r.isPermission === true);
            } else {
                filtered = filtered.filter(r => r.type_id === parseInt(filterType));
            }
        }
        
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(r => {
                return (r.start_date || '').toLowerCase().includes(searchLower) ||
                       (r.end_date || '').toLowerCase().includes(searchLower) ||
                       (r.date_permission || '').toLowerCase().includes(searchLower) ||
                       (r.motif || '').toLowerCase().includes(searchLower) ||
                       (r.type || '').toLowerCase().includes(searchLower);
            });
        }
        
        setFilteredRequests(filtered);
    }, [requests, filterStatus, filterType, searchTerm]);

    useEffect(() => {
        fetchMyRequests();
    }, [fetchMyRequests]);

    useEffect(() => {
        filterRequests();
    }, [filterRequests]);

    const handleEdit = (request) => {
        setSelectedRequest(request);
        setEditingRequest({
            type_id: request.type_id || 1,
            start_date: request.start_date || '',
            end_date: request.end_date || '',
            date_permission: request.date_permission || '',
            duree_heures: request.duree_heures || 1,
            est_demi_journee: request.est_demi_journee || false,
            motif: request.motif || '',
            isPermission: request.isPermission || false
        });
        setErrors([]);
        setShowEditModal(true);
    };

    const handleDelete = (request) => {
        setSelectedRequest(request);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedRequest) return;
        
        try {
            await leaveService.cancelRequest(selectedRequest.id);
            addToast('Demande annulée avec succès', 'success');
            fetchMyRequests();
            setShowDeleteModal(false);
            setSelectedRequest(null);
        } catch (error) {
            console.error('Erreur annulation:', error);
            const errorMsg = error.response?.data?.message || 'Erreur lors de l\'annulation';
            addToast(errorMsg, 'error');
        }
    };

    const handleCancelApprovedRequest = async (request) => {
        // Si c'est une permission, annulation simplifiée
        if (request.isPermission) {
            const motif = prompt('Motif de l\'annulation (obligatoire) :');
            if (!motif || motif.trim() === '') {
                addToast('Veuillez fournir un motif pour annuler votre permission.', 'error');
                return;
            }
            if (window.confirm(`Confirmer l'annulation de votre permission du ${request.date_permission} ?`)) {
                try {
                    const response = await leaveService.cancelApprovedRequest(request.id, motif.trim());
                    if (response.data.success) {
                        addToast(response.data.message, 'success');
                        fetchMyRequests();
                    }
                } catch (error) {
                    const errorMsg = error.response?.data?.message || 'Erreur lors de l\'annulation';
                    addToast(errorMsg, 'error');
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
            addToast(`Impossible d'annuler : votre congé commence dans moins de 48h (${diffDays} jour(s) restants). Veuillez contacter l'administrateur.`, 'error');
            return;
        }
        
        const motif = prompt('Motif de l\'annulation (obligatoire) :\n\nVeuillez expliquer la raison de l\'annulation de votre congé.');
        
        if (!motif || motif.trim() === '') {
            addToast('Veuillez fournir un motif pour annuler votre congé.', 'error');
            return;
        }
        
        if (window.confirm(`Confirmer l'annulation de votre congé ?\n\n📅 Dates : ${request.start_date} → ${request.end_date}\n📊 Durée : ${request.duration} jour(s)\n📝 Motif : ${motif}\n\n⚠️ Attention : Cette action est irréversible.`)) {
            try {
                const response = await leaveService.cancelApprovedRequest(request.id, motif.trim());
                if (response.data.success) {
                    addToast(response.data.message, 'success');
                    fetchMyRequests();
                }
            } catch (error) {
                const errorMsg = error.response?.data?.message || 'Erreur lors de l\'annulation';
                addToast(errorMsg, 'error');
            }
        }
    };

    const handleUpdateRequest = async (e) => {
        e.preventDefault();
        
        // Validation pour la permission
        if (editingRequest.isPermission) {
            if (!editingRequest.date_permission) {
                setErrors(['Veuillez sélectionner la date de la permission']);
                return;
            }
            if (!editingRequest.duree_heures || editingRequest.duree_heures <= 0) {
                setErrors(['Veuillez saisir une durée valide']);
                return;
            }
            if (editingRequest.duree_heures > 4) {
                setErrors(['La permission ne peut pas dépasser 4 heures']);
                return;
            }
            
            try {
                await leaveService.updateRequest(selectedRequest.id, {
                    type_id: 3,
                    date_permission: editingRequest.date_permission,
                    duree_heures: parseFloat(editingRequest.duree_heures),
                    est_demi_journee: editingRequest.est_demi_journee,
                    motif: editingRequest.motif
                });
                addToast('Permission modifiée avec succès. L\'administrateur a été notifié.', 'success');
                fetchMyRequests();
                setShowEditModal(false);
                setSelectedRequest(null);
                setEditingRequest({ type_id: 1, start_date: '', end_date: '', date_permission: '', duree_heures: 1, est_demi_journee: false, motif: '', isPermission: false });
            } catch (error) {
                console.error('Erreur modification permission:', error);
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                } else {
                    setErrors([error.response?.data?.message || 'Erreur lors de la modification']);
                }
            }
            return;
        }

        // Validation pour les congés
        if (!editingRequest.start_date || !editingRequest.end_date) {
            setErrors(['Veuillez sélectionner les dates de début et de fin']);
            return;
        }
        
        if (new Date(editingRequest.start_date) > new Date(editingRequest.end_date)) {
            setErrors(['La date de début doit être antérieure à la date de fin']);
            return;
        }
        
        try {
            await leaveService.updateRequest(selectedRequest.id, {
                type_id: parseInt(editingRequest.type_id),
                start_date: editingRequest.start_date,
                end_date: editingRequest.end_date,
                motif: editingRequest.motif
            });
            addToast('Demande modifiée avec succès. L\'administrateur a été notifié.', 'success');
            fetchMyRequests();
            setShowEditModal(false);
            setSelectedRequest(null);
            setEditingRequest({ type_id: 1, start_date: '', end_date: '', date_permission: '', duree_heures: 1, est_demi_journee: false, motif: '', isPermission: false });
        } catch (error) {
            console.error('Erreur modification:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors([error.response?.data?.message || 'Erreur lors de la modification']);
            }
        }
    };

    const handleJustificatifUpload = () => {
        fetchMyRequests();
        addToast('Justificatif ajouté avec succès !', 'success');
    };

    const getStatusLabel = (status, motif_refus) => {
        switch(status) {
            case 'pending_manager':
                return <span className="status-badge status-pending">En attente validation manager</span>;
            case 'pending_admin':
                return <span className="status-badge status-admin">En attente validation admin</span>;
            case 'approved':
                return <span className="status-badge status-approved">Approuvé</span>;
            case 'rejected':
                return (
                    <>
                        <span className="status-badge status-rejected">Refusé</span>
                        {motif_refus && <div className="rejection-reason">Motif : {motif_refus}</div>}
                    </>
                );
            case 'cancelled':
                return <span className="status-badge status-cancelled">Annulé</span>;
            default:
                return <span className="status-badge status-pending">En attente</span>;
        }
    };

    const resetFilters = () => {
        setFilterStatus('all');
        setFilterType('all');
        setSearchTerm('');
    };

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getMinPermissionDate = () => {
        const date = new Date();
        date.setHours(date.getHours() + 24);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayDate = getTodayDate();
    const minPermissionDate = getMinPermissionDate();

    if (loading) return <LoadingSpinner />;

    return (
        <div className="my-requests-page">
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            
            <div className="page-header">
                <h2>Mes demandes</h2>
                <p className="page-subtitle">Historique complet de toutes vos demandes (congés et permissions)</p>
            </div>
            
            {/* Filtres */}
            <div className="filters-bar">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Statut</label>
                        <select 
                            className="form-input" 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="pending_manager">En attente manager</option>
                            <option value="pending_admin">En attente admin</option>
                            <option value="approved">Approuvé</option>
                            <option value="rejected">Refusé</option>
                            <option value="cancelled">Annulé</option>
                        </select>
                    </div>
                    
                    <div className="filter-group">
                        <label>Type de demande</label>
                        <select 
                            className="form-input" 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">Tous les types</option>
                            <option value="1">Congés Payés</option>
                            <option value="2">Congé sans solde</option>
                            <option value="permission">⏰ Permission</option>
                        </select>
                    </div>
                    
                    <div className="filter-group search-group">
                        <label>Rechercher</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Date ou motif..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {(filterStatus !== 'all' || filterType !== 'all' || searchTerm) && (
                        <button className="btn btn-sm btn-secondary reset-btn" onClick={resetFilters}>
                            Réinitialiser
                        </button>
                    )}
                </div>
                
                <div className="filters-info">
                    {filteredRequests.length} demande(s) trouvée(s) sur {requests.length}
                </div>
            </div>
            
            {/* Tableau des demandes */}
            <div className="table-wrapper-modern">
                <table className="modern-table">
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
                            const isApproved = req.statut === 'approved';
                            const startDate = new Date(req.start_date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const canCancelApproved = isApproved && startDate > today;
                            const canEdit = req.statut === 'pending_manager' || req.statut === 'pending_admin';
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
                                    <td>{getStatusLabel(req.statut, req.motif_refus)}</td>
                                    <td>
                                        {justificatifs[req.id]?.length > 0 ? (
                                            <span className="badge-success">Fichier(s)</span>
                                        ) : (canEdit && !isPermission && (
                                            <FileUpload demandeId={req.id} onUploadComplete={handleJustificatifUpload} />
                                        ))}
                                        {isPermission && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Non requis</span>}
                                    </td>
                                    <td>
                                        {canEdit && (
                                            <div className="action-buttons">
                                                <button className="action-btn edit" onClick={() => handleEdit(req)} title="Modifier">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M17 3l4 4-7 7H10v-4l7-7z"/>
                                                        <path d="M4 20h16"/>
                                                    </svg>
                                                </button>
                                                <button className="action-btn delete" onClick={() => handleDelete(req)} title="Supprimer">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        {req.statut === 'approved' && canCancelApproved && (
                                            <div className="action-buttons">
                                                <button className="action-btn cancel" onClick={() => handleCancelApprovedRequest(req)} title="Annuler">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 6L6 18M6 6l12 12"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        {req.statut === 'approved' && !canCancelApproved && (
                                            <span className="info-text">Non annulable (délai dépassé)</span>
                                        )}
                                        {(req.statut === 'rejected' || req.statut === 'cancelled') && (
                                            <span className="info-text">Non modifiable</span>
                                        )}
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
            
            {/* Boutons d'action */}
            <div className="actions-bar-bottom">
                <button className="btn-primary" onClick={() => navigate('/dashboard/manager/new-request')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Nouvelle demande
                </button>
                <button className="btn-secondary" onClick={resetFilters}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Réinitialiser les filtres
                </button>
            </div>

            {/* Modal de modification */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ Modifier ma demande">
                <form onSubmit={handleUpdateRequest} className="edit-request-form">
                    {errors.length > 0 && (
                        <div className="error-messages">
                            {errors.map((err, idx) => (
                                <div key={idx} className="error-message">⚠️ {err}</div>
                            ))}
                        </div>
                    )}
                    
                    {editingRequest.isPermission ? (
                        // Formulaire de modification pour une permission
                        <>
                            <div className="info-box" style={{ background: '#fef3c7', marginBottom: '15px', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                                <strong>⏰ Modification d'une permission</strong><br/>
                                • Vous modifiez une permission en attente de validation.<br/>
                                • Après modification, l'administrateur devra la revalider.<br/>
                                • ⚠️ La date doit être aujourd'hui ou dans le futur (préavis 24h).
                            </div>

                            <div className="form-group">
                                <label>Date de la permission <span style={{ color: '#ef4444' }}>*</span></label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={editingRequest.date_permission} 
                                    onChange={(e) => setEditingRequest({...editingRequest, date_permission: e.target.value})} 
                                    min={minPermissionDate}
                                    required 
                                />
                                <small className="info-text">⏰ Préavis minimum : 24h</small>
                            </div>

                            <div className="form-group">
                                <label>Durée (heures) <span style={{ color: '#ef4444' }}>*</span></label>
                                <select 
                                    className="form-input" 
                                    value={editingRequest.duree_heures} 
                                    onChange={(e) => setEditingRequest({...editingRequest, duree_heures: parseFloat(e.target.value)})}
                                    required
                                >
                                    <option value="0.5">0.5 heure (30 min)</option>
                                    <option value="1">1 heure</option>
                                    <option value="1.5">1.5 heures</option>
                                    <option value="2">2 heures</option>
                                    <option value="2.5">2.5 heures</option>
                                    <option value="3">3 heures</option>
                                    <option value="3.5">3.5 heures</option>
                                    <option value="4">4 heures (max)</option>
                                </select>
                                <small className="info-text">⏰ Maximum 4 heures par permission</small>
                            </div>

                            <div className="form-group">
                                <label>Demi-journée</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={editingRequest.est_demi_journee} 
                                            onChange={(e) => setEditingRequest({...editingRequest, est_demi_journee: e.target.checked})}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '14px', color: '#475569' }}>Demi-journée (matin ou après-midi)</span>
                                    </label>
                                </div>
                                <small className="info-text">📋 Cochez si la permission concerne une demi-journée</small>
                            </div>
                        </>
                    ) : (
                        // Formulaire de modification pour un congé
                        <>
                            <div className="form-group">
                                <label>Type de congé</label>
                                <select value={editingRequest.type_id} onChange={(e) => setEditingRequest({...editingRequest, type_id: parseInt(e.target.value)})} required>
                                    <option value="1">🏖️ Congés Payés</option>
                                    <option value="2">📝 Congé sans solde</option>
                                </select>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date de début</label>
                                    <input type="date" value={editingRequest.start_date} onChange={(e) => setEditingRequest({...editingRequest, start_date: e.target.value})} min={todayDate} required />
                                </div>
                                <div className="form-group">
                                    <label>Date de fin</label>
                                    <input type="date" value={editingRequest.end_date} onChange={(e) => setEditingRequest({...editingRequest, end_date: e.target.value})} min={editingRequest.start_date || todayDate} required />
                                </div>
                            </div>

                            <div className="info-note">
                                <p>⚠️ <strong>Information importante :</strong></p>
                                <ul>
                                    <li>Vous modifiez une demande en attente de validation par l'administrateur.</li>
                                    <li>L'administrateur recevra une notification du changement.</li>
                                    <li>Les dates doivent être aujourd'hui ou dans le futur.</li>
                                </ul>
                            </div>
                        </>
                    )}
                    
                    <div className="form-group">
                        <label>Motif (optionnel)</label>
                        <textarea 
                            value={editingRequest.motif} 
                            onChange={(e) => setEditingRequest({...editingRequest, motif: e.target.value})} 
                            rows="3" 
                            placeholder="Précisez le motif de votre demande..."
                        />
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Annuler</button>
                        <button type="submit" className="btn-submit">Enregistrer les modifications</button>
                    </div>
                </form>
            </Modal>

            {/* Modal de confirmation suppression */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="🗑️ Annuler la demande">
                <div className="delete-confirmation">
                    <p>Êtes-vous sûr de vouloir annuler cette demande ?</p>
                    {selectedRequest && (
                        <div className="request-summary">
                            <p><strong>Type :</strong> {selectedRequest.isPermission ? '⏰ Permission' : selectedRequest.type}</p>
                            <p><strong>Dates :</strong> {selectedRequest.displayDates}</p>
                            <p><strong>Durée :</strong> {selectedRequest.displayDuration}</p>
                        </div>
                    )}
                    <p className="warning-text">Cette action est irréversible.</p>
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Non, garder</button>
                        <button type="button" className="btn-danger" onClick={confirmDelete}>Oui, annuler la demande</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default ManagerMyRequests;