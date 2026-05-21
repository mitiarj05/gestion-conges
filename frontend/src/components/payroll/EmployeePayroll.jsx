// frontend/src/components/payroll/EmployeePayroll.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
            case 'paye': return <span className="status status-approved">Payé</span>;
            case 'valide': return <span className="status status-pending-manager">Validé</span>;
            default: return <span className="status">{statut}</span>;
        }
    };

    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toFixed(0);
    };

    const generatePDF = (bulletin) => {
        const doc = new jsPDF();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        doc.setFillColor(15, 52, 96);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('BULLETIN DE PAIE', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text('Gestion des Congés', 105, 32, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Employé : ${user.prenom} ${user.nom}`, 20, 55);
        doc.text(`Période : ${moisNoms[bulletin.mois - 1]} ${bulletin.annee}`, 20, 62);
        doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 20, 69);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 75, 190, 75);
        
        autoTable(doc, {
            startY: 85,
            head: [['Désignation', 'Montant (Ar)']],
            body: [
                ['Salaire de base', `${formatNumber(bulletin.salaire_base)} Ar`],
                ['Prime', bulletin.prime_transport > 0 ? `${formatNumber(bulletin.prime_transport)} Ar` : '0 Ar'],
                ['Salaire brut', `${formatNumber(parseFloat(bulletin.salaire_base) + parseFloat(bulletin.prime_transport || 0))} Ar`],
                ['Absences non payées', bulletin.jours_absence_non_paye > 0 ? `${bulletin.jours_absence_non_paye} jour(s) (-${formatNumber(bulletin.retenue_absence)} Ar)` : 'Aucune absence'],
                ['', ''],
                ['NET À PAYER', `${formatNumber(bulletin.net_a_payer)} Ar`, '']
            ],
            theme: 'striped',
            headStyles: { fillColor: [15, 52, 96], textColor: [255, 255, 255] },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 60, halign: 'right' }
            }
        });
        
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('Document généré automatiquement par l\'application Gestion des Congés', 105, finalY + 10, { align: 'center' });
        doc.text(`Statut : ${bulletin.statut === 'paye' ? 'Payé' : 'Validé'}`, 105, finalY + 18, { align: 'center' });
        
        doc.save(`bulletin_paie_${moisNoms[bulletin.mois - 1]}_${bulletin.annee}_${user.nom}.pdf`);
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
            <h2>Mes bulletins de paie</h2>

            {bulletins.length > 0 && (
                <div className="cards-grid" style={{ marginBottom: '25px' }}>
                    <div className="card">
                        <h3>Total bulletins</h3>
                        <div className="value">{bulletins.length}</div>
                        <div className="small">12 derniers mois</div>
                    </div>
                    <div className="card">
                        <h3>Total net perçu</h3>
                        <div className="value" style={{ color: '#28a745' }}>{formatNumber(totalNet)} Ar</div>
                        <div className="small">Sur la période</div>
                    </div>
                    <div className="card">
                        <h3>Total primes</h3>
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
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulletins.map(b => (
                                <tr key={b.id}>
                                    <td><strong>{moisNoms[b.mois - 1]} {b.annee}</strong></td>
                                    <td>{formatNumber(b.salaire_base)} Ar</td>
                                    <td>{parseFloat(b.prime_transport || 0) > 0 ? `${formatNumber(b.prime_transport)} Ar` : '-'}</td>
                                    <td>{b.jours_absence_non_paye > 0 ? <span style={{ color: '#dc3545' }}>{b.jours_absence_non_paye}j (-{formatNumber(b.retenue_absence)} Ar)</span> : '-'}</td>
                                    <td><strong style={{ color: '#28a745', fontSize: '16px' }}>{formatNumber(b.net_a_payer)} Ar</strong></td>
                                    <td>{getStatusBadge(b.statut)}</td>
                                    <td>
                                        <button 
                                            className="btn btn-sm btn-primary" 
                                            onClick={() => generatePDF(b)}
                                            style={{ background: '#dc3545' }}
                                        >
                                            PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="info-box">
                <strong>Information :</strong><br/>
                • Les bulletins sont générés chaque mois par l'administrateur.<br/>
                • Le net à payer tient compte des absences non rémunérées (congés sans solde).<br/>
                • La prime est optionnelle (transport, performance, etc.).<br/>
                • Cliquez sur "PDF" pour télécharger votre bulletin au format PDF.
            </div>
        </div>
    );
}

export default EmployeePayroll;