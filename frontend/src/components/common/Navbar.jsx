// frontend/src/components/common/Navbar.jsx
import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

function Navbar({ user, role, onLogout }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getRoleLabel = () => {
        if (role === 'admin') return 'Administrateur';
        if (role === 'manager') return 'Manager';
        return 'Employé';
    };

    return (
        <header className="app-header">
            <div className="logo-container">
                <div className="logo-icon">🏢</div>
                <h2>Gestion des Congés</h2>
            </div>
            <div className="user-info">
                <ThemeToggle />
                <span className="role-badge">
                    {getRoleLabel()}
                </span>
                {!isMobile && (
                    <span className="user-name">
                        {user?.prenom || ''} {user?.nom || ''}
                    </span>
                )}
            </div>
            {isMobile && (
                <div className="mobile-user-name">
                    {user?.prenom || ''} {user?.nom || ''}
                </div>
            )}
        </header>
    );
}

export default Navbar;