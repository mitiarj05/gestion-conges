// frontend/src/components/payroll/EmployeePayroll.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EmployeePayroll() {
    const [bulletins, setBulletins] = useState([]);
    const [loading, setLoading] = useState(true);

    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    useEffect(() => {
        fetchMesBulletins();
    }, []);

    const fetchMesBulletins = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/payroll/mes-bulletins', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBulletins(response.data);
        } catch (error) {
            console.error('Erreur chargement bulletins:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (statut) => {
        switch (statut) {
            case 'paye': return <span className="status status-approved">✅ Payé</span>;
            case 'valide': return <span className="status status-pending-manager">📋 Validé</span>;
            default: return <span className="status">{statut}</span>;
        }
    };

    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toFixed(0);
    };

    const totalNet = bulletins.reduce((sum, b) => sum + parseFloat(b.net_a_payer || 0), 0);
    const totalPrimes = bulletins.reduce((sum, b) => sum + parseFloat(b.prime_transport || 0), 0);

    if (loading) {
        return (
            <div className="text-center" style={{ padding: '40px' }}>
                <div className="loading-spinner" style={{ width: '30px', height: '30px', margin: '0 auto 20px' }}></div>
                <div>Chargement de vos bulletins...</div>
            </div>
        );
    }

    return (
        <div>
            <h2>💰 Mes bulletins de paie</h2>

            {bulletins.length > 0 && (
                <div className="cards-grid" style={{ marginBottom: '25px' }}>
                    <div className="card">
                        <h3>📋 Total bulletins</h3>
                        <div className="value">{bulletins.length}</div>
                        <div className="small">12 derniers mois</div>
                    </div>
                    <div className="card">
                        <h3>💶 Total net perçu</h3>
                        <div className="value" style={{ color: '#28a745' }}>{formatNumber(totalNet)} Ar</div>
                        <div className="small">Sur la période</div>
                    </div>
                    <div className="card">
                        <h3>🎁 Total primes</h3>
                        <div className="value" style={{ color: '#ff9800' }}>{formatNumber(totalPrimes)} Ar</div>
                        <div className="small">Primes reçues</div>
                    </div>
                </div>
            )}

            {bulletins.length === 0 ? (
                <div className="info-box" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ fontSize: '48px' }}>📭</p>
                    <p style={{ fontSize: '18px', marginTop: '10px' }}>Aucun bulletin de paie disponible</p>
                    <p style={{ color: '#888', marginTop: '10px' }}>
                        Vos bulletins de paie apparaîtront ici une fois générés par l'administrateur.
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Période</th>
                                <th>Salaire base</th>
                                <th>Prime</th>
                                <th>Absences</th>
                                <th>Net à payer</th>
                                <th>Statut</th>
                                <th>Date paiement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulletins.map(b => (
                                <tr key={b.id}>
                                    <td><strong>{moisNoms[b.mois - 1]} {b.annee}</strong></td>
                                    <td>{formatNumber(b.salaire_base)} Ar</td>
                                    <td>{parseFloat(b.prime_transport || 0) > 0 ? `${formatNumber(b.prime_transport)} Ar` : '-'}</td>
                                    <td>
                                        {b.jours_absence_non_paye > 0 
                                            ? <span style={{ color: '#dc3545' }}>{b.jours_absence_non_paye}j (-{formatNumber(b.retenue_absence)} Ar)</span>
                                            : '-'}
                                    </td>
                                    <td><strong style={{ color: '#28a745', fontSize: '16px' }}>{formatNumber(b.net_a_payer)} Ar</strong></td>
                                    <td>{getStatusBadge(b.statut)}</td>
                                    <td>{b.date_paiement ? new Date(b.date_paiement).toLocaleDateString('fr-FR') : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="info-box">
                <strong>ℹ️ Information :</strong><br/>
                • Les bulletins sont générés chaque mois par l'administrateur.<br/>
                • Le net à payer tient compte des absences non rémunérées (congés sans solde).<br/>
                • La prime est optionnelle (transport, performance, etc.).<br/>
                • En cas d'erreur, contactez votre administrateur.
            </div>
        </div>
    );
}

export default EmployeePayroll;