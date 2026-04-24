// frontend/src/components/employee/EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EmployeeDashboard({ onLogout }) {
    const [user, setUser] = useState({});
    const [balance, setBalance] = useState({
        paid: 12.5,
        rtt: 4,
        permission: 2
    });
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        fetchBalance();
        fetchRequests();
    }, []);

    const fetchBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/leaves/balance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(response.data);
        } catch (error) {
            console.error('Erreur chargement solde:', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/leaves/my-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (error) {
            setRequests([
                { id: 1, start_date: '2024-05-10', end_date: '2024-05-15', type: 'Congés Payés', duration: 5, status: 'pending' },
                { id: 2, start_date: '2024-03-20', end_date: '2024-03-22', type: 'Congés Payés', duration: 3, status: 'approved' },
                { id: 3, start_date: '2024-03-05', end_date: '2024-03-05', type: 'Permission', duration: 2, status: 'approved' }
            ]);
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'pending': return <span className="status status-pending">⏳ En attente</span>;
            case 'approved': return <span className="status status-approved">✅ Approuvé</span>;
            case 'rejected': return <span className="status status-rejected">❌ Refusé</span>;
            default: return <span className="status">{status}</span>;
        }
    };

    return (
        <>
            <header className="app-header">
                <h2>🏢 Gestion des Congés</h2>
                <div className="user-info">
                    <span className="role-badge">Employé</span>
                    <span>{user.prenom} {user.nom}</span>
                    <button onClick={onLogout} className="logout-btn">Déconnexion</button>
                </div>
            </header>
            
            <div className="app-container">
                <aside className="sidebar">
                    <nav>
                        <a href="#" className="active">📊 Tableau de bord</a>
                        <a href="#">📅 Mes demandes</a>
                        <a href="#">➕ Nouvelle demande</a>
                        <a href="#">👤 Mon compte</a>
                    </nav>
                </aside>
                
                <main className="main-content">
                    <h1>👋 Bonjour {user.prenom} {user.nom}</h1>
                    
                    <div className="cards-grid">
                        <div className="card">
                            <h3>🏖️ Congés Payés</h3>
                            <div className="value">{balance.paid || 12.5} jours</div>
                            <div className="small">Restants sur 25</div>
                        </div>
                        <div className="card">
                            <h3>⚡ RTT</h3>
                            <div className="value">{balance.rtt || 4} jours</div>
                            <div className="small">Restants sur 12</div>
                        </div>
                        <div className="card">
                            <h3>⏰ Permissions</h3>
                            <div className="value">{balance.permission || 2}h</div>
                            <div className="small">Restantes ce mois / 4h max</div>
                        </div>
                    </div>
                    
                    <div className="actions-bar">
                        <button className="btn btn-primary">📅 Demander un congé</button>
                        <button className="btn btn-secondary">⏰ Demander une permission</button>
                    </div>
                    
                    <div className="table-container">
                        <h3 style={{ padding: '15px 15px 0 15px' }}>📋 Mes demandes récentes</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Dates</th>
                                    <th>Type</th>
                                    <th>Durée</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id}>
                                        <td>{req.start_date} - {req.end_date}</td>
                                        <td>{req.type}</td>
                                        <td>{req.duration} {req.type === 'Permission' ? 'heures' : 'jours'}</td>
                                        <td>{getStatusLabel(req.status)}</td>
                                        <td>
                                            {req.status === 'pending' && (
                                                <button className="btn btn-sm btn-secondary">Modifier</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </>
    );
}

export default EmployeeDashboard;