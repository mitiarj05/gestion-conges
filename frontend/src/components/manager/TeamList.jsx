// frontend/src/components/manager/TeamList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function TeamList({ teamMembers, onRefresh }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        if (showAddModal) fetchAvailableEmployees();
    }, [showAddModal, refreshTrigger]);

    const fetchAvailableEmployees = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/users/available-employees`, getAuthHeaders());
            setAvailableEmployees(response.data);
        } catch (error) {
            console.error('Erreur fetchAvailableEmployees:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!selectedEmployeeId) { 
            alert('Veuillez sélectionner un employé'); 
            return; 
        }
        
        const selectedEmployee = availableEmployees.find(emp => emp.id === parseInt(selectedEmployeeId));
        if (!selectedEmployee) { 
            alert('Employé non trouvé'); 
            return; 
        }
        
        setLoading(true);
        try {
            await axios.post(`${API_URL}/users/add-team-member`, { employee_id: selectedEmployee.id }, getAuthHeaders());
            alert(`✅ ${selectedEmployee.prenom} ${selectedEmployee.nom} a été ajouté à votre équipe !`);
            setShowAddModal(false);
            setSelectedEmployeeId('');
            setSearchTerm('');
            if (onRefresh) onRefresh();
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erreur ajout:', error);
            alert(error.response?.data?.message || 'Erreur lors de l\'ajout');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (employeeId, employeeName) => {
        if (window.confirm(`Retirer ${employeeName} de votre équipe ?`)) {
            try {
                await axios.delete(`${API_URL}/users/remove-team-member/${employeeId}`, getAuthHeaders());
                alert(`✅ ${employeeName} a été retiré de votre équipe.`);
                if (onRefresh) onRefresh();
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                console.error('Erreur suppression:', error);
                alert('Erreur lors du retrait');
            }
        }
    };

    // Filtrer les employés par recherche
    const getFilteredEmployees = () => {
        if (!searchTerm.trim()) return availableEmployees;
        
        const search = searchTerm.toLowerCase().trim();
        return availableEmployees.filter(emp => {
            return (emp.nom || '').toLowerCase().includes(search) ||
                   (emp.prenom || '').toLowerCase().includes(search) ||
                   (emp.email || '').toLowerCase().includes(search) ||
                   (emp.service || '').toLowerCase().includes(search) ||
                   (emp.telephone || '').toLowerCase().includes(search) ||
                   (emp.id && emp.id.toString().includes(search));
        });
    };

    const filteredEmployees = getFilteredEmployees();

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">👥 Mon équipe ({teamMembers.length} membres)</h1>
                    <p className="dashboard-subtitle">Gérez les membres de votre équipe</p>
                </div>
                <div className="dashboard-header-actions">
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Ajouter un membre
                    </button>
                </div>
            </div>

            {teamMembers.length === 0 ? (
                <div className="empty-state-card">
                    <p> Aucun membre dans votre équipe pour le moment.</p>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Ajouter votre premier membre
                    </button>
                </div>
            ) : (
                <div className="table-wrapper-modern">
                    <table className="modern-table full-width">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Prénom</th>
                                <th>Email</th>
                                <th>Service</th>
                                <th>Téléphone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamMembers.map(member => (
                                <tr key={member.id}>
                                    <td><span className="employee-name-cell">{member.nom}</span></td>
                                    <td><span className="employee-name-cell">{member.prenom}</span></td>
                                    <td>{member.email}</td>
                                    <td>{member.service || '-'}</td>
                                    <td>{member.telephone || '-'}</td>
                                    <td>
                                        <button className="action-btn delete" onClick={() => handleRemoveMember(member.id, `${member.prenom} ${member.nom}`)} title="Retirer de l'équipe">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Ajouter un membre - AVEC LISTE DE RÉSULTATS */}
            {showAddModal && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowAddModal(false);
                        setSearchTerm('');
                        setSelectedEmployeeId('');
                    }
                }}>
                    <div className="modal" style={{ maxWidth: '650px', maxHeight: '85vh', overflow: 'hidden' }}>
                        <div className="modal-header">
                            <h3>➕ Ajouter un membre à mon équipe</h3>
                            <button className="modal-close" onClick={() => {
                                setShowAddModal(false);
                                setSearchTerm('');
                                setSelectedEmployeeId('');
                            }}>✖</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 'calc(85vh - 140px)', overflowY: 'auto', padding: '20px' }}>
                            {loading && availableEmployees.length === 0 ? (
                                <div className="text-center">Chargement des employés...</div>
                            ) : (
                                <>
                                    {/* Barre de recherche */}
                                    <div className="form-group">
                                        <label>🔍 Rechercher un employé</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nom, prénom, email, service ou téléphone..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ marginBottom: '12px' }}
                                            autoFocus
                                        />
                                        {searchTerm && filteredEmployees.length === 0 && (
                                            <small className="info-text" style={{ color: '#ef4444', display: 'block', marginBottom: '12px' }}>
                                                 Aucun employé trouvé pour "{searchTerm}"
                                            </small>
                                        )}
                                    </div>

                                    {/* Liste des employés disponibles */}
                                    {filteredEmployees.length > 0 ? (
                                        <div className="search-results-list" style={{ 
                                            marginBottom: '16px',
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            border: '1px solid var(--border-light, #e2e8f0)',
                                            borderRadius: '12px',
                                            background: 'var(--bg-card, #ffffff)'
                                        }}>
                                            {filteredEmployees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    className={`search-result-item ${selectedEmployeeId === String(emp.id) ? 'selected' : ''}`}
                                                    onClick={() => setSelectedEmployeeId(String(emp.id))}
                                                    style={{
                                                        padding: '12px 16px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border-light, #f1f5f9)',
                                                        transition: 'all 0.2s',
                                                        background: selectedEmployeeId === String(emp.id) ? 'var(--primary-50, #eff6ff)' : 'transparent',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (selectedEmployeeId !== String(emp.id)) {
                                                            e.currentTarget.style.background = 'var(--bg-tertiary, #f8fafc)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedEmployeeId !== String(emp.id)) {
                                                            e.currentTarget.style.background = 'transparent';
                                                        }
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary, #1e293b)' }}>
                                                            {emp.prenom} {emp.nom}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                                                            {emp.email && <span>📧 {emp.email}</span>}
                                                            {emp.service && <span style={{ marginLeft: '12px' }}>🏢 {emp.service}</span>}
                                                            {emp.telephone && <span style={{ marginLeft: '12px' }}>📞 {emp.telephone}</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: '12px', 
                                                        color: 'var(--text-tertiary, #94a3b8)',
                                                        background: 'var(--bg-tertiary, #f1f5f9)',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px'
                                                    }}>
                                                        Disponible
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !searchTerm && (
                                            <div className="info-box" style={{ 
                                                background: '#fef3c7',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                marginBottom: '16px'
                                            }}>
                                                ⚠️ Aucun employé disponible. Les employés doivent avoir le rôle "employé" et ne pas avoir de manager.
                                            </div>
                                        )
                                    )}

                                    {/* Informations de l'employé sélectionné */}
                                    {selectedEmployeeId && availableEmployees.find(emp => emp.id === parseInt(selectedEmployeeId)) && (
                                        <div className="info-box" style={{ 
                                            background: '#ecfdf5', 
                                            borderLeft: '4px solid #10b981',
                                            marginTop: '12px',
                                            padding: '12px 16px',
                                            borderRadius: '8px'
                                        }}>
                                            <strong> Employé sélectionné :</strong><br/>
                                            {(() => {
                                                const emp = availableEmployees.find(e => e.id === parseInt(selectedEmployeeId));
                                                return (
                                                    <>
                                                        <strong style={{ fontSize: '16px' }}>{emp.prenom} {emp.nom}</strong>
                                                        {emp.email && <span style={{ display: 'block', fontSize: '13px', color: '#475569' }}>📧 {emp.email}</span>}
                                                        {emp.service && <span style={{ display: 'block', fontSize: '13px', color: '#475569' }}>🏢 {emp.service}</span>}
                                                        {emp.telephone && <span style={{ display: 'block', fontSize: '13px', color: '#475569' }}>📞 {emp.telephone}</span>}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {!searchTerm && filteredEmployees.length > 0 && (
                                        <div className="info-box" style={{ 
                                            background: 'var(--info-bg, #eff6ff)',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            marginBottom: '16px'
                                        }}>
                                            💡 Tapez un nom, prénom, email ou service pour trouver un employé
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer" style={{ 
                            padding: '16px 20px',
                            borderTop: '1px solid var(--border-light, #e2e8f0)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button 
                                className="btn-primary" 
                                onClick={handleAddMember} 
                                disabled={!selectedEmployeeId || loading}
                            >
                                {loading ? 'Ajout en cours...' : ' Ajouter à l\'équipe'}
                            </button>
                            <button 
                                className="btn-secondary" 
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSearchTerm('');
                                    setSelectedEmployeeId('');
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamList;