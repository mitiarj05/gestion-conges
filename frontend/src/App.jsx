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
import { API_URL } from './config/api';
import './styles/darkTheme.css';
import './index.css';

console.log('🚀 [APP] Démarrage de l\'application');

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    console.log('🔧 [APP] API URL:', API_URL);

    useEffect(() => {
        console.log('📦 [APP] Montage du composant App');
        
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        console.log(`🔐 [APP] Token présent: ${!!token}, User présent: ${!!user}`);
        
        if (token && user) {
            console.log('✅ [APP] Utilisateur authentifié');
            setIsAuthenticated(true);
        } else {
            console.log('❌ [APP] Utilisateur non authentifié');
            setIsAuthenticated(false);
        }
        setLoading(false);

        const handleStorageChange = () => {
            const newToken = localStorage.getItem('token');
            console.log(`🔄 [APP] Changement storage - nouveau token: ${!!newToken}`);
            setIsAuthenticated(!!newToken);
        };

        window.addEventListener('storage', handleStorageChange);
        
        const interval = setInterval(() => {
            const newToken = localStorage.getItem('token');
            if (!!newToken !== isAuthenticated) {
                console.log(`🔄 [APP] Synchronisation token: ${!!newToken}`);
                setIsAuthenticated(!!newToken);
            }
        }, 30000);

        return () => {
            console.log('🗑️ [APP] Nettoyage du composant App');
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [isAuthenticated]);

    const handleLogout = () => {
        console.log('🚪 [APP] Déconnexion utilisateur');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
    };

    if (loading) {
        console.log('⏳ [APP] Chargement en cours...');
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement de l'application...</div>
            </div>
        );
    }

    console.log(`🎨 [APP] Rendu principal - authentifié: ${isAuthenticated}`);

    return (
        <ThemeProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route 
                            path="/dashboard/*" 
                            element={
                                isAuthenticated ? 
                                <DashboardRouter onLogout={handleLogout} /> : 
                                <Navigate to="/login" replace />
                            } 
                        />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
    );
}

export default App;