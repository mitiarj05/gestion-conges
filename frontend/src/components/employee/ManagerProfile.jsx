// frontend/src/components/employee/ManagerProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ManagerProfile() {
    const [manager, setManager] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchManagerInfo();
    }, []);

    const fetchManagerInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Vous n\'êtes pas authentifié');
                setLoading(false);
                return;
            }
            
            const response = await axios.get('http://localhost:5000/api/users/my-manager', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Infos manager reçues:', response.data);
            setManager(response.data);
            setError('');
        } catch (error) {
            console.error('Erreur fetchManager:', error);
            if (error.response?.status === 404) {
                setError(error.response?.data?.message || 'Vous n\'avez pas de manager assigné. Veuillez contacter votre administrateur.');
            } else {
                setError('Impossible de récupérer les informations du manager. Veuillez réessayer plus tard.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center" style={{ padding: '40px' }}>
                <div className="loading-spinner" style={{ width: '30px', height: '30px', margin: '0 auto 20px' }}></div>
                <div>Chargement des informations...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h2>👨‍💼 Mon manager</h2>
                <div className="info-box" style={{ background: '#fff3cd', borderLeftColor: '#ffc107' }}>
                    <strong>⚠️ {error}</strong>
                    <br/><br/>
                    <p>Pour être rattaché à un manager :</p>
                    <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                        <li>Contactez votre administrateur</li>
                        <li>Demandez à être ajouté à l'équipe d'un manager</li>
                    </ul>
                </div>
            </div>
        );
    }

    if (!manager) {
        return (
            <div>
                <h2>👨‍💼 Mon manager</h2>
                <div className="info-box" style={{ background: '#fff3cd', borderLeftColor: '#ffc107' }}>
                    <strong>ℹ️ Aucun manager trouvé</strong>
                    <br/>
                    Vous n'êtes actuellement rattaché à aucun manager. Veuillez contacter votre administrateur.
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2>👨‍💼 Mon manager</h2>
            
            <div className="cards-grid">
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '10px' }}>👔</div>
                    <h3 style={{ color: '#0f3460', marginBottom: '5px' }}>{manager.prenom} {manager.nom}</h3>
                    <p style={{ color: '#666', marginBottom: '15px' }}>Manager</p>
                    
                    <div className="info-box" style={{ textAlign: 'left', marginTop: '15px', background: '#f8f9fa' }}>
                        <p><strong>📧 Email :</strong> <a href={`mailto:${manager.email}`} style={{ color: '#0f3460' }}>{manager.email}</a></p>
                        {manager.telephone && (
                            <p><strong>📞 Téléphone :</strong> <a href={`tel:${manager.telephone}`} style={{ color: '#0f3460' }}>{manager.telephone}</a></p>
                        )}
                        {manager.service && (
                            <p><strong>🏢 Service :</strong> {manager.service}</p>
                        )}
                        {manager.poste && (
                            <p><strong>📌 Poste :</strong> {manager.poste}</p>
                        )}
                        <p><strong>👥 Nombre d'employés dans son équipe :</strong> {manager.team_count || 0}</p>
                    </div>
                </div>
            </div>

            <div className="info-box" style={{ marginTop: '20px', background: '#e8f4fd' }}>
                <strong>💡 Conseils :</strong><br/>
                • Pour toute question sur vos congés, n'hésitez pas à contacter votre manager par email ou téléphone.<br/>
                • Les demandes de congé sont validées en 2 étapes (manager puis admin).<br/>
                • Vous serez notifié à chaque étape de validation.<br/>
                • Si vous avez besoin de changer de manager, contactez l'administrateur.
            </div>
        </div>
    );
}

export default ManagerProfile;