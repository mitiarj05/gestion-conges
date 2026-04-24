// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        confirmPassword: '',
        telephone: '',
        code_inscription: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            setLoading(false);
            return;
        }

        try {
            // Appel API
            const response = await axios.post('http://localhost:5000/api/auth/register', {
                nom: formData.nom,
                prenom: formData.prenom,
                email: formData.email,
                password: formData.password,
                telephone: formData.telephone,
                code_inscription: formData.code_inscription
            });

            // Utilisation de response (supprime le warning)
            if (response.status === 201) {
                alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>📝 Créer mon compte</h1>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <input
                            type="text"
                            name="nom"
                            className="form-input"
                            placeholder="Nom"
                            value={formData.nom}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="text"
                            name="prenom"
                            className="form-input"
                            placeholder="Prénom"
                            value={formData.prenom}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="Email professionnel"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <input
                            type="tel"
                            name="telephone"
                            className="form-input"
                            placeholder="Téléphone (optionnel)"
                            value={formData.telephone}
                            onChange={handleChange}
                        />
                    </div>
                    
                    <div className="form-group">
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            placeholder="Mot de passe (min. 6 caractères)"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-input"
                            placeholder="Confirmer le mot de passe"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="info-box">
                        <strong>💡 Code d'inscription (optionnel)</strong><br/>
                        • Sans code → Vous êtes <strong>EMPLOYÉ</strong><br/>
                        • Code <code>MGR2024</code> → Vous êtes <strong>MANAGER</strong><br/>
                        • Code <code>ADMIN2024</code> → Vous êtes <strong>ADMIN</strong>
                    </div>
                    
                    <div className="form-group">
                        <input
                            type="text"
                            name="code_inscription"
                            className="form-input"
                            placeholder="Code d'inscription"
                            value={formData.code_inscription}
                            onChange={handleChange}
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Inscription...' : "S'inscrire"}
                    </button>
                </form>
                
                <div className="links">
                    <a href="/login">Déjà un compte ? Se connecter</a>
                </div>
            </div>
        </div>
    );
}

export default Register;