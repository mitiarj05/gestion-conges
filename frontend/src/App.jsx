// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import DashboardRouter from './pages/DashboardRouter';
import './styles/darkTheme.css';
import './index.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Vérifier le token au chargement
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            // Vérifier si le token est encore valide (optionnel)
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
        setLoading(false);

        // Écouter les changements de localStorage
        const handleStorageChange = () => {
            const newToken = localStorage.getItem('token');
            setIsAuthenticated(!!newToken);
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Vérification périodique (toutes les 30 secondes)
        const interval = setInterval(() => {
            const newToken = localStorage.getItem('token');
            if (!!newToken !== isAuthenticated) {
                setIsAuthenticated(!!newToken);
            }
        }, 30000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [isAuthenticated]);

    // Fonction de déconnexion
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement de l'application...</div>
            </div>
        );
    }

    return (
        <ThemeProvider>
            <Router>
                <div className="App">
                    <Routes>
                        {/* Routes publiques */}
                        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/contact" element={<Contact />} />
                        
                        {/* Routes protégées (dashboard) */}
                        <Route 
                            path="/dashboard/*" 
                            element={
                                isAuthenticated ? 
                                <DashboardRouter onLogout={handleLogout} /> : 
                                <Navigate to="/login" replace />
                            } 
                        />
                        
                        {/* Redirection par défaut */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
    );
}

export default App;