// frontend/src/components/manager/ManagerDashboard.jsx
import React, { useState, useEffect } from 'react';

function ManagerDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [pendingRequests, setPendingRequests] = useState([
        { id: 1, name: 'Jean Dupont', start_date: '2024-05-10', end_date: '2024-05-15', type: 'Congés Payés', duration: 5, reason: 'Vacances' },
        { id: 2, name: 'Sophie Martin', start_date: '2024-05-20', end_date: '2024-05-20', type: 'Permission', duration: 2, reason: 'RDV médical' }
    ]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
    }, []);

    const handleApprove = (id) => {
        setPendingRequests(pendingRequests.filter(req => req.id !== id));
        alert(`Demande #${id} approuvée !`);
    };

    const handleReject = (id) => {
        setPendingRequests(pendingRequests.filter(req => req.id !== id));
        alert(`Demande #${id} refusée.`);
    };

    return (
        <>
            <header className="app-header">
                <h2>🏢 Gestion des Congés</h2>
                <div className="user-info">
                    <span className="role-badge">Manager</span>
                    <span>{user.prenom} {user.nom}</span>
                    <button onClick={onLogout} className="logout-btn">Déconnexion</button>
                </div>
            </header>
            
            <div className="app-container">
                <aside className="sidebar">
                    <nav>
                        <a href="#" className="active">📊 Tableau de bord</a>
                        <a href="#">👥 Mon équipe</a>
                        <a href="#">✅ Validations</a>
                        <a href="#">📅 Mes demandes</a>
                        <a href="#">➕ Nouvelle demande</a>
                    </nav>
                </aside>
                
                <main className="main-content">
                    <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
                    
                    <div className="manager-section">
                        <h3>👥 SECTION MANAGER</h3>
                        <div className="cards-grid">
                            <div className="card">
                                <h3>👥 Mon équipe</h3>
                                <div className="value">5 membres</div>
                            </div>
                            <div className="card">
                                <h3>⏳ Demandes en attente</h3>
                                <div className="value">{pendingRequests.length}</div>
                            </div>
                            <div className="card">
                                <h3>✅ Approuvées ce mois</h3>
                                <div className="value">8</div>
                            </div>
                        </div>
                    </div>
                    
                    <h3>📋 Demandes à valider</h3>
                    {pendingRequests.map((req) => (
                        <div key={req.id} className="request-item">
                            <div className="request-info">
                                <strong>{req.name}</strong>
                                <small>{req.start_date} - {req.end_date} • {req.type} • {req.duration} {req.type === 'Permission' ? 'heures' : 'jours'}</small>
                                <small style={{ display: 'block' }}>Motif : {req.reason}</small>
                            </div>
                            <div className="request-actions">
                                <button onClick={() => handleApprove(req.id)} className="btn btn-success btn-sm">✅ Approuver</button>
                                <button onClick={() => handleReject(req.id)} className="btn btn-danger btn-sm">❌ Refuser</button>
                            </div>
                        </div>
                    ))}
                    
                    {pendingRequests.length === 0 && (
                        <div className="info-box">✅ Aucune demande en attente !</div>
                    )}
                    
                    <div className="cards-grid mt-20">
                        <div className="card">
                            <h3>🏖️ Congés Payés</h3>
                            <div className="value">15 jours</div>
                            <div className="small">Mon solde</div>
                        </div>
                        <div className="card">
                            <h3>⚡ RTT</h3>
                            <div className="value">6 jours</div>
                            <div className="small">Mon solde</div>
                        </div>
                        <div className="card">
                            <h3>⏰ Permissions</h3>
                            <div className="value">1h</div>
                            <div className="small">Utilisées ce mois</div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

export default ManagerDashboard;