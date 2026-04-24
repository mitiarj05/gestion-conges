// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });

            const { token, user } = response.data;
            
            // Stocker dans localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Notifier App du changement
            if (onLogin) onLogin();

            console.log('=== LOGIN SUCCESS ===');
            console.log('Rôles:', user.roles);

            // Redirection selon le rôle
            if (user.roles.includes('admin')) {
                navigate('/dashboard/admin', { replace: true });
            } else if (user.roles.includes('manager')) {
                navigate('/dashboard/manager', { replace: true });
            } else {
                navigate('/dashboard/employee', { replace: true });
            }
        } catch (err) {
            console.error('Erreur login:', err);
            setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>🏢 Gestion des Congés</h1>
                <h2>Connexion</h2>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email professionnel</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
                
                <div className="links">
                    <a href="/register">Pas de compte ? S'inscrire</a>
                </div>
            </div>
        </div>
    );
}

export default Login;