import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [employeesOnly, setEmployeesOnly] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editUser, setEditUser] = useState(null);
    const [resetUser, setResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', password: '', telephone: '', service: '' });

    const API_URL = 'http://localhost:5000/api';
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchEmployeesOnly()]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`, getAuthHeaders());
            setUsers(response.data);
        } catch (error) { console.error('Erreur:', error); }
    };

    const fetchEmployeesOnly = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/employees-only`, getAuthHeaders());
            setEmployeesOnly(response.data);
        } catch (error) { console.error('Erreur:', error); }
    };

    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        if (formData.password.length < 6) { alert('Mot de passe trop court'); return; }
        try {
            await axios.post(`${API_URL}/admin/create-employee`, formData, getAuthHeaders());
            alert('Employé créé !');
            setShowCreateModal(false);
            setFormData({ nom: '', prenom: '', email: '', password: '', telephone: '', service: '' });
            fetchAll();
        } catch (error) { alert(error.response?.data?.message || 'Erreur'); }
    };

    const handlePromoteToManager = async () => {
        if (!selectedEmployee) { alert('Sélectionnez un employé'); return; }
        if (window.confirm(`Promouvoir ${selectedEmployee.prenom} ${selectedEmployee.nom} ?`)) {
            try {
                await axios.post(`${API_URL}/admin/promote-to-manager`, { userId: selectedEmployee.id }, getAuthHeaders());
                alert(`${selectedEmployee.prenom} ${selectedEmployee.nom} est maintenant Manager !`);
                setSelectedEmployee(null);
                setShowPromoteModal(false);
                fetchAll();
            } catch (error) { alert(error.response?.data?.message || 'Erreur'); }
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/admin/users/${editUser.id}`, editUser, getAuthHeaders());
            alert('Utilisateur modifié !');
            setShowEditModal(false);
            setEditUser(null);
            fetchAll();
        } catch (error) { alert('Erreur'); }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) { alert('Mot de passe trop court'); return; }
        if (window.confirm(`Réinitialiser le mot de passe de ${resetUser?.prenom} ${resetUser?.nom} ?`)) {
            try {
                await axios.put(`${API_URL}/admin/users/${resetUser.id}/reset-password`, { password: newPassword }, getAuthHeaders());
                alert('Mot de passe réinitialisé !');
                setShowResetModal(false);
                setResetUser(null);
                setNewPassword('');
            } catch (error) { alert('Erreur'); }
        }
    };

    const handleDeleteUser = async (id, name) => {
        if (window.confirm(`Supprimer ${name} ?`)) {
            try {
                await axios.delete(`${API_URL}/admin/users/${id}`, getAuthHeaders());
                fetchAll();
            } catch (error) { alert('Erreur'); }
        }
    };

    const handleExportExcel = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/export-users`, { ...getAuthHeaders(), responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `utilisateurs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            alert('Export terminé !');
        } catch (error) { alert('Erreur export'); }
    };

    const getRoleLabel = (roles) => {
        if (roles.includes('admin')) return <span className="role-badge-admin">👑 Admin</span>;
        if (roles.includes('manager')) return <span className="role-badge-manager">👔 Manager</span>;
        return <span className="role-badge-employee">👤 Employé</span>;
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div><div>Chargement...</div></div>;

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Gestion des utilisateurs</h1>
                    <p className="dashboard-subtitle">Gérez les comptes utilisateur de l'application</p>
                </div>
            </div>

            <div className="payroll-actions">
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Ajouter employé
                </button>
                <button className="btn-primary" onClick={() => setShowPromoteModal(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Promouvoir manager
                </button>
                <button className="btn-secondary" onClick={handleExportExcel}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Export Excel
                </button>
            </div>

            <div className="table-wrapper-modern">
                <table className="modern-table full-width">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Prénom</th>
                            <th>Email</th>
                            <th>Service</th>
                            <th>Rôle</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td><span className="employee-name-cell">{u.nom}</span></td>
                                <td><span className="employee-name-cell">{u.prenom}</span></td>
                                <td>{u.email}</td>
                                <td>{u.service || '-'}</td>
                                <td>{getRoleLabel(u.roles)}</td>
                                <td>
                                    {!u.roles.includes('admin') && (
                                        <div className="action-buttons">
                                            <button className="action-btn edit" onClick={() => { setEditUser(u); setShowEditModal(true); }} title="Modifier">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M17 3l4 4-7 7H10v-4l7-7z"/>
                                                    <path d="M4 20h16"/>
                                                </svg>
                                            </button>
                                            <button className="action-btn key" onClick={() => { setResetUser(u); setShowResetModal(true); }} title="Réinitialiser mot de passe">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                                </svg>
                                            </button>
                                            <button className="action-btn delete" onClick={() => handleDeleteUser(u.id, `${u.prenom} ${u.nom}`)} title="Supprimer">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Création */}
            {showCreateModal && <div className="modal-overlay"><div className="modal"><div className="modal-header"><h3>➕ Ajouter un employé</h3><button className="modal-close" onClick={() => setShowCreateModal(false)}>✖</button></div>
            <form onSubmit={handleCreateEmployee}>
                <div className="form-row"><input type="text" className="form-input" placeholder="Nom" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required />
                <input type="text" className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} required /></div>
                <input type="email" className="form-input" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input type="password" className="form-input" placeholder="Mot de passe" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <input type="tel" className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                <input type="text" className="form-input" placeholder="Service" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} />
                <div className="modal-footer"><button type="submit" className="btn-primary">Créer</button><button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button></div>
            </form></div></div>}

            {/* Modal Promotion */}
            {showPromoteModal && <div className="modal-overlay"><div className="modal"><div className="modal-header"><h3>👔 Promouvoir en Manager</h3><button className="modal-close" onClick={() => setShowPromoteModal(false)}>✖</button></div>
            <select className="form-input" value={selectedEmployee?.id || ''} onChange={e => setSelectedEmployee(employeesOnly.find(emp => emp.id === parseInt(e.target.value)))}>
                <option value="">-- Sélectionner --</option>{employeesOnly.map(emp => <option key={emp.id} value={emp.id}>{emp.prenom} {emp.nom} - {emp.email}</option>)}
            </select>
            <div className="modal-footer"><button className="btn-primary" onClick={handlePromoteToManager}>Promouvoir</button><button className="btn-secondary" onClick={() => setShowPromoteModal(false)}>Annuler</button></div></div></div>}

            {/* Modal Modification */}
            {showEditModal && editUser && <div className="modal-overlay"><div className="modal"><div className="modal-header"><h3>✏️ Modifier {editUser.prenom} {editUser.nom}</h3><button className="modal-close" onClick={() => setShowEditModal(false)}>✖</button></div>
            <form onSubmit={handleEditUser}>
                <div className="form-row"><input type="text" className="form-input" placeholder="Nom" value={editUser.nom} onChange={e => setEditUser({...editUser, nom: e.target.value})} required />
                <input type="text" className="form-input" placeholder="Prénom" value={editUser.prenom} onChange={e => setEditUser({...editUser, prenom: e.target.value})} required /></div>
                <input type="email" className="form-input" placeholder="Email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} required />
                <input type="tel" className="form-input" placeholder="Téléphone" value={editUser.telephone || ''} onChange={e => setEditUser({...editUser, telephone: e.target.value})} />
                <input type="text" className="form-input" placeholder="Service" value={editUser.service || ''} onChange={e => setEditUser({...editUser, service: e.target.value})} />
                <select className="form-input" value={editUser.statut} onChange={e => setEditUser({...editUser, statut: e.target.value})}><option value="actif">Actif</option><option value="inactif">Inactif</option></select>
                <div className="modal-footer"><button type="submit" className="btn-primary">Enregistrer</button><button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button></div>
            </form></div></div>}

            {/* Modal Reset Password */}
            {showResetModal && resetUser && <div className="modal-overlay"><div className="modal"><div className="modal-header"><h3>🔑 Réinitialiser mot de passe</h3><button className="modal-close" onClick={() => setShowResetModal(false)}>✖</button></div>
            <p>Utilisateur : <strong>{resetUser.prenom} {resetUser.nom}</strong></p>
            <div className="form-group"><label>Nouveau mot de passe</label><input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="modal-footer"><button className="btn-primary" onClick={handleResetPassword}>Réinitialiser</button><button className="btn-secondary" onClick={() => setShowResetModal(false)}>Annuler</button></div></div></div>}
        </div>
    );
}

export default UserManagement;