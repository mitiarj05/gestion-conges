import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardRouter from './pages/DashboardRouter';
import './styles/darkTheme.css';
import './index.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);

        const handleStorageChange = () => {
            const newToken = localStorage.getItem('token');
            setIsAuthenticated(!!newToken);
        };

        window.addEventListener('storage', handleStorageChange);
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
        <ThemeProvider>
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
        </ThemeProvider>
    );
}

export default App;