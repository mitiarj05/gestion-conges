// frontend/src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';

function AdminDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [users, setUsers] = useState([
        { id: 1, nom: 'Dupont', prenom: 'Jean', email: 'jean@test.com', service: 'Commercial', role: 'employe' },
        { id: 2, nom: 'Martin', prenom: 'Marie', email: 'marie@test.com', service: 'Commercial', role: 'manager' },
        { id: 3, nom: 'Durand', prenom: 'Paul', email: 'paul@test.com', service: 'IT', role: 'employe' }
    ]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
    }, []);

    return (
        <>
            <header className="app-header">
                <h2>🏢 Gestion des Congés</h2>
                <div className="user-info">
                    <span className="role-badge">Administrateur</span>
                    <span>{user.prenom} {user.nom}</span>
                    <button onClick={onLogout} className="logout-btn">Déconnexion</button>
                </div>
            </header>
            
            <div className="app-container">
                <aside className="sidebar">
                    <nav>
                        <a href="#" className="active">📊 Dashboard Admin</a>
                        <a href="#">👥 Utilisateurs</a>
                        <a href="#">🔐 Gestion codes</a>
                        <a href="#">📜 Logs système</a>
                        <a href="#">⚙️ Configuration</a>
                    </nav>
                </aside>
                
                <main className="main-content">
                    <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
                    
                    <div className="cards-grid">
                        <div className="stat-card">
                            <div className="number">128</div>
                            <div className="label">Employés</div>
                        </div>
                        <div className="stat-card orange">
                            <div className="number">12</div>
                            <div className="label">Demandes en attente</div>
                        </div>
                        <div className="stat-card red">
                            <div className="number">8</div>
                            <div className="label">Alertes solde faible</div>
                        </div>
                        <div className="stat-card green">
                            <div className="number">6</div>
                            <div className="label">Services</div>
                        </div>
                    </div>
                    
                    <div className="admin-section">
                        <h3>⚙️ Actions Administrateur</h3>
                        <div className="btn-group">
                            <button className="btn btn-primary">➕ Ajouter employé</button>
                            <button className="btn btn-secondary">📥 Importer Excel</button>
                            <button className="btn btn-secondary">⚙️ Paramètres</button>
                            <button className="btn btn-secondary">📊 Exports</button>
                            <button className="btn btn-secondary">🔐 Gérer codes</button>
                        </div>
                    </div>
                    
                    <div className="admin-section">
                        <h3>👥 Gestion des utilisateurs</h3>
                        <div className="table-container">
                            <table>
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
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.nom}</td>
                                            <td>{u.prenom}</td>
                                            <td>{u.email}</td>
                                            <td>{u.service}</td>
                                            <td>{u.role === 'admin' ? '👑 Admin' : u.role === 'manager' ? '👔 Manager' : '👤 Employé'}</td>
                                            <td>
                                                <button className="btn btn-sm btn-secondary" style={{ marginRight: '5px' }}>✏️</button>
                                                <button className="btn btn-sm btn-danger">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="admin-section">
                        <h3>🔐 Codes d'inscription actifs</h3>
                        <div className="code-list">
                            <code>EMP2024 → Rôle EMPLOYÉ (utilisation illimitée)</code>
                            <code>MGR2024 → Rôle MANAGER (50 utilisations max)</code>
                            <code>ADMIN2024 → Rôle ADMIN (5 utilisations max)</code>
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: '10px' }}>➕ Générer nouveau code</button>
                    </div>
                </main>
            </div>
        </>
    );
}

export default AdminDashboard;