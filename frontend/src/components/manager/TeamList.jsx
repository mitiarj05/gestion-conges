import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TeamList({ teamMembers, onRefresh }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const getAuthHeaders = () => ({ 
        headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}` 
        } 
    });

    useEffect(() => {
        if (showAddModal) {
            fetchAvailableEmployees();
        }
    }, [showAddModal, refreshTrigger]);

    const fetchAvailableEmployees = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/users/available-employees', getAuthHeaders());
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
            await axios.post('http://localhost:5000/api/users/add-team-member', 
                { employee_id: selectedEmployee.id }, 
                getAuthHeaders()
            );
            alert(`✅ ${selectedEmployee.prenom} ${selectedEmployee.nom} a été ajouté à votre équipe !`);
            setShowAddModal(false);
            setSelectedEmployeeId('');
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
                await axios.delete(`http://localhost:5000/api/users/remove-team-member/${employeeId}`, getAuthHeaders());
                alert(`✅ ${employeeName} a été retiré de votre équipe.`);
                if (onRefresh) onRefresh();
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                console.error('Erreur suppression:', error);
                alert('Erreur lors du retrait');
            }
        }
    };

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
                    <p>📭 Aucun membre dans votre équipe pour le moment.</p>
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
                                    <td>
                                        <button 
                                            className="action-btn delete" 
                                            onClick={() => handleRemoveMember(member.id, `${member.prenom} ${member.nom}`)}
                                            title="Retirer de l'équipe"
                                        >
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

            {/* Modal Ajout Membre */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>➕ Ajouter un membre à mon équipe</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>✖</button>
                        </div>
                        
                        {loading && availableEmployees.length === 0 ? (
                            <div className="text-center">Chargement des employés...</div>
                        ) : availableEmployees.length === 0 ? (
                            <div className="info-card-tip" style={{ background: '#fff3cd' }}>
                                <div className="tip-icon">📢</div>
                                <div className="tip-content">
                                    <p>Aucun employé disponible actuellement.</p>
                                    <p style={{ fontSize: '12px', marginTop: '10px' }}>
                                        💡 Les employés sont disponibles s'ils :<br/>
                                        - Ont le rôle "employé"<br/>
                                        - N'ont pas encore de manager assigné<br/>
                                        - Ne sont pas déjà dans une équipe
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Sélectionner un employé</label>
                                    <select 
                                        className="form-input" 
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        value={selectedEmployeeId}
                                    >
                                        <option value="">-- Choisir un employé --</option>
                                        {availableEmployees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.prenom} {emp.nom} - {emp.email} {emp.service ? `(${emp.service})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        className="btn-primary" 
                                        onClick={handleAddMember} 
                                        disabled={!selectedEmployeeId || loading}
                                    >
                                        {loading ? 'Ajout en cours...' : '✅ Ajouter à l\'équipe'}
                                    </button>
                                    <button 
                                        className="btn-secondary" 
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setSelectedEmployeeId('');
                                        }}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamList;