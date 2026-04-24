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

    if (loading) return <div>Chargement...</div>;

    return (
        <div>
            <h2>👥 Gestion des utilisateurs</h2>
            <div className="actions-bar">
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>➕ Ajouter employé</button>
                <button className="btn btn-primary" onClick={() => setShowPromoteModal(true)}>👔 Promouvoir manager</button>
                <button className="btn btn-primary" onClick={handleExportExcel}>📊 Exporter Excel</button>
            </div>
            <div className="table-container">
                <table>
                    <thead><tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Service</th><th>Rôle</th><th>Actions</th></tr></thead>
                    <tbody>{users.map(u => (
                        <tr key={u.id}>
                            <td>{u.nom}</td><td>{u.prenom}</td><td>{u.email}</td><td>{u.service || '-'}</td>
                            <td>{getRoleLabel(u.roles)}</td>
                            <td>{!u.roles.includes('admin') && (<>
                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditUser(u); setShowEditModal(true); }}>✏️</button>
                                <button className="btn btn-sm btn-secondary" onClick={() => { setResetUser(u); setShowResetModal(true); }}>🔑</button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u.id, `${u.prenom} ${u.nom}`)}>🗑️</button>
                            </>)}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>

            {/* Modal Création */}
            {showCreateModal && <div className="modal-overlay"><div className="modal"><h3>➕ Ajouter un employé</h3>
            <form onSubmit={handleCreateEmployee}>
                <div className="form-row"><input type="text" className="form-input" placeholder="Nom" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required />
                <input type="text" className="form-input" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} required /></div>
                <input type="email" className="form-input" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input type="password" className="form-input" placeholder="Mot de passe" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                <input type="tel" className="form-input" placeholder="Téléphone" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                <input type="text" className="form-input" placeholder="Service" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} />
                <div className="btn-group"><button type="submit" className="btn btn-primary">Créer</button><button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button></div>
            </form></div></div>}

            {/* Modal Promotion */}
            {showPromoteModal && <div className="modal-overlay"><div className="modal"><h3>👔 Promouvoir en Manager</h3>
            <select className="form-input" value={selectedEmployee?.id || ''} onChange={e => setSelectedEmployee(employeesOnly.find(emp => emp.id === parseInt(e.target.value)))}>
                <option value="">-- Sélectionner --</option>{employeesOnly.map(emp => <option key={emp.id} value={emp.id}>{emp.prenom} {emp.nom} - {emp.email}</option>)}
            </select>
            <div className="btn-group"><button className="btn btn-primary" onClick={handlePromoteToManager}>Promouvoir</button><button className="btn btn-secondary" onClick={() => setShowPromoteModal(false)}>Annuler</button></div></div></div>}

            {/* Modal Modification */}
            {showEditModal && editUser && <div className="modal-overlay"><div className="modal"><h3>✏️ Modifier {editUser.prenom} {editUser.nom}</h3>
            <form onSubmit={handleEditUser}>
                <div className="form-row"><input type="text" className="form-input" placeholder="Nom" value={editUser.nom} onChange={e => setEditUser({...editUser, nom: e.target.value})} required />
                <input type="text" className="form-input" placeholder="Prénom" value={editUser.prenom} onChange={e => setEditUser({...editUser, prenom: e.target.value})} required /></div>
                <input type="email" className="form-input" placeholder="Email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} required />
                <input type="tel" className="form-input" placeholder="Téléphone" value={editUser.telephone || ''} onChange={e => setEditUser({...editUser, telephone: e.target.value})} />
                <input type="text" className="form-input" placeholder="Service" value={editUser.service || ''} onChange={e => setEditUser({...editUser, service: e.target.value})} />
                <select className="form-input" value={editUser.statut} onChange={e => setEditUser({...editUser, statut: e.target.value})}><option value="actif">Actif</option><option value="inactif">Inactif</option></select>
                <div className="btn-group"><button type="submit" className="btn btn-primary">Enregistrer</button><button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button></div>
            </form></div></div>}

            {/* Modal Reset Password */}
            {showResetModal && resetUser && <div className="modal-overlay"><div className="modal"><h3>🔑 Réinitialiser mot de passe</h3>
            <p>Utilisateur : <strong>{resetUser.prenom} {resetUser.nom}</strong></p>
            <div className="form-group"><label>Nouveau mot de passe</label><input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="btn-group"><button className="btn btn-primary" onClick={handleResetPassword}>Réinitialiser</button><button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>Annuler</button></div></div></div>}
        </div>
    );
}

export default UserManagement;