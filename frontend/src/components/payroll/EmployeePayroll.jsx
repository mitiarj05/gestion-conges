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
            case 'paye': return <span className="badge-paid">Payé</span>;
            case 'valide': return <span className="badge-valid">Validé</span>;
            default: return <span className="badge-default">{statut}</span>;
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
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement de vos bulletins...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Mes bulletins de paie</h1>
                    <p className="dashboard-subtitle">Consultez et téléchargez vos bulletins de salaire</p>
                </div>
            </div>

            {bulletins.length > 0 && (
                <div className="payroll-stats-grid">
                    <div className="payroll-stat-card">
                        <div className="payroll-stat-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </div>
                        <div className="payroll-stat-info">
                            <div className="payroll-stat-value">{bulletins.length}</div>
                            <div className="payroll-stat-label">Total bulletins</div>
                            <div className="payroll-stat-trend">12 derniers mois</div>
                        </div>
                    </div>

                    <div className="payroll-stat-card">
                        <div className="payroll-stat-icon green">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </div>
                        <div className="payroll-stat-info">
                            <div className="payroll-stat-value">{formatNumber(totalNet)} Ar</div>
                            <div className="payroll-stat-label">Total net perçu</div>
                            <div className="payroll-stat-trend">Sur la période</div>
                        </div>
                    </div>

                    <div className="payroll-stat-card">
                        <div className="payroll-stat-icon orange">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                            </svg>
                        </div>
                        <div className="payroll-stat-info">
                            <div className="payroll-stat-value">{formatNumber(totalPrimes)} Ar</div>
                            <div className="payroll-stat-label">Total primes</div>
                            <div className="payroll-stat-trend">Primes reçues</div>
                        </div>
                    </div>
                </div>
            )}

            {bulletins.length === 0 ? (
                <div className="empty-state-card">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p>Aucun bulletin de paie disponible</p>
                    <span>Vos bulletins de paie apparaîtront ici une fois générés par l'administrateur.</span>
                </div>
            ) : (
                <div className="payroll-table-container">
                    <div className="table-header">
                        <h3>Bulletins de paie</h3>
                        <div className="table-stats">
                            {bulletins.length} bulletin(s)
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table className="payroll-table">
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
                                        <td>
                                            <div className="period-cell">
                                                <span className="month">{moisNoms[b.mois - 1]}</span>
                                                <span className="year">{b.annee}</span>
                                            </div>
                                        </td>
                                        <td className="amount">{formatNumber(b.salaire_base)} Ar</td>
                                        <td className="amount">{parseFloat(b.prime_transport || 0) > 0 ? `${formatNumber(b.prime_transport)} Ar` : '-'}</td>
                                        <td className="absence-cell">
                                            {b.jours_absence_non_paye > 0 ? (
                                                <span className="absence-badge">
                                                    {b.jours_absence_non_paye}j (-{formatNumber(b.retenue_absence)} Ar)
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="net-amount">{formatNumber(b.net_a_payer)} Ar</td>
                                        <td>{getStatusBadge(b.statut)}</td>
                                        <td>
                                            <button 
                                                className="action-btn pdf" 
                                                onClick={() => generatePDF(b)} 
                                                title="Télécharger le PDF"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                                    <path d="M14 2v6h6"/>
                                                    <path d="M12 18v-4M9 16h6"/>
                                                </svg>
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="info-card-tip">
                <div className="tip-icon">ℹ️</div>
                <div className="tip-content">
                    <strong>Information :</strong><br/>
                    • Les bulletins sont générés chaque mois par l'administrateur.<br/>
                    • Le net à payer tient compte des absences non rémunérées (congés sans solde).<br/>
                    • La prime est optionnelle (transport, performance, etc.).<br/>
                    • Cliquez sur "PDF" pour télécharger votre bulletin au format PDF.
                </div>
            </div>
        </div>
    );
}

export default EmployeePayroll;