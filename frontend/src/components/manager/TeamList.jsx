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
            console.log('Employés disponibles:', response.data);
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
            <div className="actions-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>👥 Mon équipe ({teamMembers.length} membres)</h2>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Ajouter un membre</button>
            </div>
            
            {teamMembers.length === 0 ? (
                <div className="info-box" style={{ textAlign: 'center', padding: '30px' }}>
                    <p>📭 Aucun membre dans votre équipe pour le moment.</p>
                    <button className="btn btn-primary mt-20" onClick={() => setShowAddModal(true)}>
                        ➕ Ajouter votre premier membre
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
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
                                    <td>{member.nom}</td>
                                    <td>{member.prenom}</td>
                                    <td>{member.email}</td>
                                    <td>{member.service || '-'}</td>
                                    <td>
                                        <button 
                                            className="btn btn-sm btn-danger" 
                                            onClick={() => handleRemoveMember(member.id, `${member.prenom} ${member.nom}`)}
                                        >
                                            🗑️ Retirer
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
                        <h3>➕ Ajouter un membre à mon équipe</h3>
                        
                        {loading && availableEmployees.length === 0 ? (
                            <div className="text-center">Chargement des employés...</div>
                        ) : availableEmployees.length === 0 ? (
                            <div className="info-box" style={{ background: '#fff3cd', borderLeftColor: '#ffc107' }}>
                                <p>📢 Aucun employé disponible actuellement.</p>
                                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                                    💡 Les employés sont disponibles s'ils :<br/>
                                    - Ont le rôle "employé"<br/>
                                    - N'ont pas encore de manager assigné<br/>
                                    - Ne sont pas déjà dans une équipe
                                </p>
                                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                                    Si vous avez créé des employés via l'admin, assurez-vous qu'ils n'ont pas déjà un manager.
                                </p>
                                <button 
                                    className="btn btn-secondary mt-20" 
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Fermer
                                </button>
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
                                <div className="btn-group" style={{ marginTop: '20px' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleAddMember} 
                                        disabled={!selectedEmployeeId || loading}
                                    >
                                        {loading ? 'Ajout en cours...' : '✅ Ajouter à l\'équipe'}
                                    </button>
                                    <button 
                                        className="btn btn-secondary" 
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