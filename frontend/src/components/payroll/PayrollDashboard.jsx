// frontend/src/components/payroll/PayrollDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function PayrollDashboard() {
    const [bulletins, setBulletins] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedBulletin, setSelectedBulletin] = useState(null);
    const [message, setMessage] = useState('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterService, setFilterService] = useState('all');
    const [services, setServices] = useState([]);
    
    const [formData, setFormData] = useState({
        utilisateur_id: '',
        mois: new Date().getMonth() + 1,
        annee: new Date().getFullYear(),
        salaire_base: '',
        prime: 0
    });

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        let filtered = [...employees];
        
        if (searchTerm && searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(emp => 
                (emp.nom && emp.nom.toLowerCase().includes(term)) ||
                (emp.prenom && emp.prenom.toLowerCase().includes(term)) ||
                (emp.email && emp.email.toLowerCase().includes(term))
            );
        }
        
        if (filterRole !== 'all') {
            filtered = filtered.filter(emp => {
                const roles = emp.roles || [];
                if (filterRole === 'manager') {
                    return roles.includes('manager');
                } else if (filterRole === 'employe') {
                    return roles.includes('employe') && !roles.includes('manager');
                }
                return true;
            });
        }
        
        if (filterService !== 'all' && filterService) {
            filtered = filtered.filter(emp => emp.service === filterService);
        }
        
        setFilteredEmployees(filtered);
    }, [employees, searchTerm, filterRole, filterService]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [bulletinsRes, employeesRes, statsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/payroll/tous-bulletins', getAuthHeaders()),
                axios.get('http://localhost:5000/api/admin/employees-for-payroll', getAuthHeaders()),
                axios.get('http://localhost:5000/api/payroll/stats', getAuthHeaders())
            ]);
            
            setBulletins(bulletinsRes.data);
            setEmployees(employeesRes.data);
            setFilteredEmployees(employeesRes.data);
            setStats(statsRes.data);
            
            const uniqueServices = [...new Set(employeesRes.data.map(emp => emp.service).filter(s => s))];
            setServices(uniqueServices);
        } catch (error) {
            console.error('Erreur chargement:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            utilisateur_id: '',
            mois: new Date().getMonth() + 1,
            annee: new Date().getFullYear(),
            salaire_base: '',
            prime: 0
        });
        setSelectedBulletin(null);
        setMessage('');
        setSearchTerm('');
        setFilterRole('all');
        setFilterService('all');
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterRole('all');
        setFilterService('all');
    };

    const handleEmployeChange = (e) => {
        const employeId = e.target.value;
        const selectedEmploye = employees.find(emp => emp.id === parseInt(employeId));
        if (selectedEmploye) {
            setFormData({
                ...formData,
                utilisateur_id: employeId,
                salaire_base: selectedEmploye.salaire_base || 500000
            });
        }
    };

    const handleGenererBulletin = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!formData.utilisateur_id) {
            setMessage('Veuillez sélectionner un employé');
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:5000/api/payroll/generer-bulletin',
                {
                    utilisateur_id: parseInt(formData.utilisateur_id),
                    mois: parseInt(formData.mois),
                    annee: parseInt(formData.annee),
                    salaire_base: parseFloat(formData.salaire_base),
                    prime: parseFloat(formData.prime) || 0
                },
                getAuthHeaders()
            );
            setMessage(response.data.message);
            setTimeout(() => {
                setShowModal(false);
                resetForm();
                fetchAllData();
            }, 1500);
        } catch (error) {
            console.error('Erreur génération:', error);
            setMessage('Erreur: ' + (error.response?.data?.message || 'Erreur'));
        }
    };

    const handleGenererTous = async () => {
        if (!window.confirm(`Générer les bulletins pour tous les employés (${moisNoms[formData.mois - 1]} ${formData.annee}) ?\n\nChaque employé utilisera son propre salaire de base.`)) {
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:5000/api/payroll/generer-bulletins-equipe',
                { 
                    mois: parseInt(formData.mois), 
                    annee: parseInt(formData.annee) 
                },
                getAuthHeaders()
            );
            
            let detailMessage = 'Détail des bulletins générés :\n\n';
            if (response.data.details && response.data.details.length > 0) {
                response.data.details.forEach(detail => {
                    detailMessage += `• ${detail}\n`;
                });
            }
            alert(response.data.message + '\n\n' + detailMessage);
            fetchAllData();
        } catch (error) {
            alert('Erreur: ' + (error.response?.data?.message || 'Erreur'));
        }
    };

    const handleMarquerPaye = async (id) => {
        if (!window.confirm('Marquer ce bulletin comme payé ?')) return;
        try {
            await axios.put(
                `http://localhost:5000/api/payroll/marquer-paye/${id}`,
                {},
                getAuthHeaders()
            );
            alert('Bulletin marqué comme payé');
            fetchAllData();
        } catch (error) {
            alert('Erreur');
        }
    };

    const handleSupprimer = async (id) => {
        if (!window.confirm('Supprimer ce bulletin ? Cette action est irréversible.')) return;

        try {
            await axios.delete(
                `http://localhost:5000/api/payroll/bulletin/${id}`,
                getAuthHeaders()
            );
            alert('Bulletin supprimé');
            fetchAllData();
        } catch (error) {
            alert('Erreur lors de la suppression');
        }
    };

    const handleModifier = (bulletin) => {
        setSelectedBulletin(bulletin);
        setFormData({
            utilisateur_id: bulletin.utilisateur_id,
            mois: bulletin.mois,
            annee: bulletin.annee,
            salaire_base: parseFloat(bulletin.salaire_base) || 0,
            prime: parseFloat(bulletin.prime_transport) || 0
        });
        setShowModal(true);
    };

    const handleSaveModification = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const response = await axios.put(
                `http://localhost:5000/api/payroll/bulletin/${selectedBulletin.id}`,
                {
                    salaire_base: parseFloat(formData.salaire_base),
                    prime: parseFloat(formData.prime) || 0
                },
                getAuthHeaders()
            );
            setMessage(response.data.message);
            setTimeout(() => {
                setShowModal(false);
                setSelectedBulletin(null);
                resetForm();
                fetchAllData();
            }, 1500);
        } catch (error) {
            setMessage('Erreur: ' + (error.response?.data?.message || 'Erreur'));
        }
    };

    const generatePDF = (bulletin) => {
        const doc = new jsPDF();
        
        doc.setFillColor(15, 52, 96);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('BULLETIN DE PAIE', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text('Gestion des Congés', 105, 32, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Employé : ${bulletin.prenom} ${bulletin.nom}`, 20, 55);
        doc.text(`Période : ${moisNoms[bulletin.mois - 1]} ${bulletin.annee}`, 20, 62);
        doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, 20, 69);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 75, 190, 75);
        
        const formatNumber = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? '0' : num.toFixed(0);
        };
        
        autoTable(doc, {
            startY: 85,
            head: [['Désignation', 'Montant (Ar)']],
            body: [
                ['Salaire de base', `${formatNumber(bulletin.salaire_base)} Ar`],
                ['Prime', bulletin.prime_transport > 0 ? `${formatNumber(bulletin.prime_transport)} Ar` : '0 Ar'],
                ['Salaire brut', `${formatNumber(parseFloat(bulletin.salaire_base) + parseFloat(bulletin.prime_transport || 0))} Ar`],
                ['Absences non payées', bulletin.jours_absence_non_paye > 0 ? `${bulletin.jours_absence_non_paye} jour(s) (-${formatNumber(bulletin.retenue_absence)} Ar)` : 'Aucune absence'],
                ['', ''],
                ['NET À PAYER', `${formatNumber(bulletin.net_a_payer)} Ar`]
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
        
        doc.save(`bulletin_paie_${moisNoms[bulletin.mois - 1]}_${bulletin.annee}_${bulletin.nom}.pdf`);
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

    const getRoleDisplay = (roles) => {
        if (!roles) return { icon: '👤', text: 'Employé', color: '#10b981' };
        if (roles.includes('manager')) return { icon: '👔', text: 'Manager', color: '#4f46e5' };
        if (roles.includes('admin')) return { icon: '👑', text: 'Admin', color: '#8b5cf6' };
        return { icon: '👤', text: 'Employé', color: '#10b981' };
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement des données de paie...</div>
            </div>
        );
    }

    const totalNet = stats?.total_net || 0;
    const totalEmployesPayes = stats?.total_employes_payes || 0;
    const employesNonPayes = stats?.employes_non_payes || 0;
    const moyenneSalaire = stats?.moyenne_salaire || 0;

    return (
        <div className="payroll-dashboard">
            {/* En-tête */}
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Gestion de la Paie</h1>
                    <p className="dashboard-subtitle">Générez et gérez les bulletins de salaire</p>
                </div>
                <div className="dashboard-header-actions">
                    <button className="btn-refresh" onClick={fetchAllData}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                        </svg>
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Cartes statistiques modernes */}
            <div className="payroll-stats-grid">
                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{totalEmployesPayes}</div>
                        <div className="payroll-stat-label">Employés payés</div>
                        <div className="payroll-stat-trend">ce mois</div>
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
                        <div className="payroll-stat-label">Total net versé</div>
                        <div className="payroll-stat-trend">cumulé</div>
                    </div>
                </div>

                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{employesNonPayes}</div>
                        <div className="payroll-stat-label">Non payés</div>
                        <div className="payroll-stat-trend">à traiter</div>
                    </div>
                </div>

                <div className="payroll-stat-card">
                    <div className="payroll-stat-icon purple">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                    </div>
                    <div className="payroll-stat-info">
                        <div className="payroll-stat-value">{formatNumber(moyenneSalaire)} Ar</div>
                        <div className="payroll-stat-label">Salaire moyen</div>
                        <div className="payroll-stat-trend">par employé</div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="payroll-actions">
                <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Générer un bulletin
                </button>
                <button className="btn-secondary" onClick={handleGenererTous}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Générer pour tous ({moisNoms[formData.mois - 1]} {formData.annee})
                </button>
            </div>

            {/* Liste des bulletins */}
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
                                <th>Employé</th>
                                <th>Poste</th>
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
                            {bulletins.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="empty-state">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        <p>Aucun bulletin de paie</p>
                                        <span>Générez un bulletin pour commencer</span>
                                    </td>
                                </tr>
                            ) : (
                                bulletins.map(b => {
                                    const role = getRoleDisplay(b.roles);
                                    return (
                                        <tr key={b.id}>
                                            <td>
                                                <div className="employee-cell">
                                                    <div className="employee-avatar" style={{ background: role.color }}>
                                                        {b.prenom?.charAt(0)}{b.nom?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="employee-name">{b.prenom} {b.nom}</div>
                                                        <div className="employee-email">{b.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="role-badge" style={{ background: `${role.color}15`, color: role.color }}>
                                                    {role.icon} {role.text}
                                                </span>
                                            </td>
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
                                                <div className="action-buttons">
                                                    {b.statut !== 'paye' && (
                                                        <>
                                                            <button className="action-btn edit" onClick={() => handleModifier(b)} title="Modifier">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M17 3l4 4-7 7H10v-4l7-7z"/>
                                                                    <path d="M4 20h16"/>
                                                                </svg>
                                                            </button>
                                                            <button className="action-btn pay" onClick={() => handleMarquerPaye(b.id)} title="Marquer payé">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M20 6L9 17l-5-5"/>
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                    <button className="action-btn delete" onClick={() => handleSupprimer(b.id)} title="Supprimer">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                                        </svg>
                                                    </button>
                                                    <button className="action-btn pdf" onClick={() => generatePDF(b)} title="PDF">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                                            <path d="M14 2v6h6"/>
                                                            <path d="M12 18v-4M9 16h6"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de génération/modification */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) { setShowModal(false); resetForm(); }
                }}>
                    <div className="modal" style={{ maxWidth: '650px' }}>
                        <div className="modal-header">
                            <h3>{selectedBulletin ? 'Modifier le bulletin' : 'Générer un bulletin de paie'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✖</button>
                        </div>

                        {message && (
                            <div className={message.includes('succès') ? 'success-message' : 'error-message'}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={selectedBulletin ? handleSaveModification : handleGenererBulletin}>
                            {!selectedBulletin && (
                                <>
                                    <div className="filters-section">
                                        <div className="filter-row">
                                            <div className="filter-field">
                                                <label>Rechercher</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Nom, prénom ou email..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <div className="filter-field">
                                                <label>Rôle</label>
                                                <select
                                                    className="form-input"
                                                    value={filterRole}
                                                    onChange={(e) => setFilterRole(e.target.value)}
                                                >
                                                    <option value="all">Tous les rôles</option>
                                                    <option value="employe">Employés</option>
                                                    <option value="manager">Managers</option>
                                                </select>
                                            </div>
                                            {services.length > 0 && (
                                                <div className="filter-field">
                                                    <label>Service</label>
                                                    <select
                                                        className="form-input"
                                                        value={filterService}
                                                        onChange={(e) => setFilterService(e.target.value)}
                                                    >
                                                        <option value="all">Tous les services</option>
                                                        {services.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="filter-field">
                                                <label>&nbsp;</label>
                                                <button type="button" className="btn-reset" onClick={resetFilters}>
                                                    Réinitialiser
                                                </button>
                                            </div>
                                        </div>
                                        <div className="filter-info">
                                            {filteredEmployees.length} employé(s) trouvé(s) sur {employees.length}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Employé *</label>
                                        <select
                                            className="form-input"
                                            value={formData.utilisateur_id}
                                            onChange={handleEmployeChange}
                                            required
                                            size="5"
                                            style={{ height: 'auto', minHeight: '150px' }}
                                        >
                                            <option value="">-- Sélectionner un employé --</option>
                                            {filteredEmployees.map(emp => {
                                                const role = getRoleDisplay(emp.roles);
                                                return (
                                                    <option key={emp.id} value={emp.id} style={{ padding: '8px' }}>
                                                        {role.icon} {emp.prenom} {emp.nom} - {role.text}
                                                        {emp.service ? ` (${emp.service})` : ''}
                                                        {' - Salaire: '}{formatNumber(emp.salaire_base || 500000)} Ar
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mois</label>
                                    <select
                                        className="form-input"
                                        value={formData.mois}
                                        onChange={(e) => setFormData({ ...formData, mois: parseInt(e.target.value) })}
                                    >
                                        {moisNoms.map((nom, index) => (
                                            <option key={index + 1} value={index + 1}>{nom}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Année</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.annee}
                                        onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                                        min="2024"
                                        max="2030"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Salaire de base (Ar) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.salaire_base}
                                    onChange={(e) => setFormData({ ...formData, salaire_base: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    step="10000"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Prime (Ar) - Optionnel</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.prime}
                                    onChange={(e) => setFormData({ ...formData, prime: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                    step="10000"
                                />
                            </div>

                            <div className="preview-box">
                                <div className="preview-title">Aperçu</div>
                                <div className="preview-content">
                                    <div className="preview-line">
                                        <span>Salaire brut :</span>
                                        <strong>{formatNumber(parseFloat(formData.salaire_base || 0) + parseFloat(formData.prime || 0))} Ar</strong>
                                    </div>
                                    <div className="preview-line">
                                        <span>Prime :</span>
                                        <span>{formatNumber(formData.prime || 0)} Ar</span>
                                    </div>
                                    <div className="preview-line net">
                                        <span>Net estimé :</span>
                                        <strong style={{ color: '#10b981' }}>{formatNumber((parseFloat(formData.salaire_base) || 0) + (parseFloat(formData.prime) || 0))} Ar</strong>
                                    </div>
                                </div>
                                <div className="preview-note">* Les retenues pour absences seront calculées automatiquement</div>
                            </div>

                            <div className="btn-group" style={{ marginTop: '20px' }}>
                                <button type="submit" className="btn-primary">
                                    {selectedBulletin ? 'Enregistrer' : 'Générer le bulletin'}
                                </button>
                                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PayrollDashboard;