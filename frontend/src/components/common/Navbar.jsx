// frontend/src/components/common/Navbar.jsx
import React from 'react';
import ThemeToggle from './ThemeToggle';

function Navbar({ user, role, onLogout }) {
    const getRoleLabel = () => {
        if (role === 'admin') return 'Administrateur';
        if (role === 'manager') return 'Manager';
        return 'Employé';
    };

    return (
        <header className="app-header">
            <h2>🏢 Gestion des Congés</h2>
            <div className="user-info">
                <ThemeToggle />
                <span className="role-badge">{getRoleLabel()}</span>
                <span>{user?.prenom || ''} {user?.nom || ''}</span>
                <button onClick={onLogout} className="logout-btn">Déconnexion</button>
            </div>
        </header>
    );
}

export default Navbar;