// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardRouter from './pages/DashboardRouter';

function App() {
    // Utiliser un state pour forcer le re-rendu
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Vérifier le token au chargement
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);

        // Écouter les changements de localStorage (pour la déconnexion)
        const handleStorageChange = () => {
            const newToken = localStorage.getItem('token');
            setIsAuthenticated(!!newToken);
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Vérifier toutes les secondes (fallback)
        const interval = setInterval(() => {
            const newToken = localStorage.getItem('token');
            if (!!newToken !== isAuthenticated) {
                setIsAuthenticated(!!newToken);
            }
        }, 500);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [isAuthenticated]);

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
                    <Route path="/register" element={<Register />} />
                    <Route 
                        path="/dashboard/*" 
                        element={isAuthenticated ? <DashboardRouter onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/login" />}
                    />
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;