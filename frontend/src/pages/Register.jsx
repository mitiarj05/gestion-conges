import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
    const [formData, setFormData] = useState({
        nom: '', prenom: '', email: '', password: '', confirmPassword: '', telephone: '', role_souhaite: 'employe', adminCode: '', adminSecretKey: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [adminAlreadyExists, setAdminAlreadyExists] = useState(true);
    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdminExists = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/auth/admin-exists');
                setAdminAlreadyExists(response.data.adminExists);
            } catch (err) { console.error(err); }
            finally { setCheckingAdmin(false); }
        };
        checkAdminExists();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleRoleChange = (role) => setFormData({ ...formData, role_souhaite: role, adminCode: '', adminSecretKey: '' });

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
            const payload = {
                nom: formData.nom, prenom: formData.prenom, email: formData.email,
                password: formData.password, telephone: formData.telephone, role_souhaite: formData.role_souhaite
            };
            if (formData.role_souhaite === 'admin') {
                payload.adminCode = formData.adminCode;
                payload.adminSecretKey = formData.adminSecretKey;
            }
            const response = await axios.post('http://localhost:5000/api/auth/register', payload);
            if (response.status === 201) {
                alert(response.data.message);
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
        } finally { setLoading(false); }
    };

    if (checkingAdmin) return (<div className="auth-container"><div className="auth-card"><div className="text-center">Chargement...</div></div></div>);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>📝 Créer mon compte</h1>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <input type="text" name="nom" className="form-input" placeholder="Nom" value={formData.nom} onChange={handleChange} required />
                        <input type="text" name="prenom" className="form-input" placeholder="Prénom" value={formData.prenom} onChange={handleChange} required />
                    </div>
                    <div className="form-group"><input type="email" name="email" className="form-input" placeholder="Email professionnel" value={formData.email} onChange={handleChange} required /></div>
                    <div className="form-group"><input type="tel" name="telephone" className="form-input" placeholder="Téléphone (optionnel)" value={formData.telephone} onChange={handleChange} /></div>
                    <div className="form-group"><input type="password" name="password" className="form-input" placeholder="Mot de passe (min. 6 caractères)" value={formData.password} onChange={handleChange} required /></div>
                    <div className="form-group"><input type="password" name="confirmPassword" className="form-input" placeholder="Confirmer le mot de passe" value={formData.confirmPassword} onChange={handleChange} required /></div>
                    
                    <div className="form-group">
                        <label>Rôle souhaité :</label>
                        <div className="role-options">
                            <label className="role-option"><input type="radio" name="role" value="employe" checked={formData.role_souhaite === 'employe'} onChange={() => handleRoleChange('employe')} /> 👤 Employé</label>
                            {!adminAlreadyExists && (<label className="role-option"><input type="radio" name="role" value="admin" checked={formData.role_souhaite === 'admin'} onChange={() => handleRoleChange('admin')} /> 👑 Administrateur</label>)}
                        </div>
                        {adminAlreadyExists && <small className="info-text">ℹ️ L'option Admin n'est plus disponible car un administrateur existe déjà.</small>}
                    </div>
                    
                    {formData.role_souhaite === 'admin' && !adminAlreadyExists && (
                        <div className="extra-fields">
                            <div className="info-box warning">⚠️ Vous êtes sur le point de créer le compte Administrateur principal.</div>
                            <div className="form-group"><label>Code Admin *</label><input type="password" name="adminCode" className="form-input" placeholder="Code Admin" value={formData.adminCode} onChange={handleChange} required /></div>
                            <div className="form-group"><label>Clé d'activation *</label><input type="password" name="adminSecretKey" className="form-input" placeholder="Clé d'activation" value={formData.adminSecretKey} onChange={handleChange} required /></div>
                        </div>
                    )}
                    
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Inscription...' : "S'inscrire"}</button>
                </form>
                <div className="links"><a href="/login">Déjà un compte ? Se connecter</a></div>
            </div>
        </div>
    );
}

export default Register;