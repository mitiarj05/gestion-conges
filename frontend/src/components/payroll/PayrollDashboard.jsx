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
            case 'paye': return <span className="status status-approved">Payé</span>;
            case 'valide': return <span className="status status-pending-manager">Validé</span>;
            default: return <span className="status">{statut}</span>;
        }
    };

    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toFixed(0);
    };

    const getRoleDisplay = (roles) => {
        if (!roles) return { icon: '👤', text: 'Employé' };
        if (roles.includes('manager')) return { icon: '👔', text: 'Manager' };
        if (roles.includes('admin')) return { icon: '👑', text: 'Admin' };
        return { icon: '👤', text: 'Employé' };
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>Chargement des données de paie...</div>
            </div>
        );
    }

    return (
        <div>
            <h2>Gestion de la Paie</h2>

            {stats && (
                <div className="cards-grid" style={{ marginBottom: '25px' }}>
                    <div className="stat-card blue">
                        <div className="number">{stats.total_employes_payes || 0}</div>
                        <div className="label">Employés payés ce mois</div>
                    </div>
                    <div className="stat-card green">
                        <div className="number">{stats.total_net ? `${formatNumber(stats.total_net)} Ar` : '0 Ar'}</div>
                        <div className="label">Total net versé</div>
                    </div>
                    <div className="stat-card orange">
                        <div className="number">{stats.employes_non_payes || 0}</div>
                        <div className="label">Employés non payés</div>
                    </div>
                    <div className="stat-card red">
                        <div className="number">{stats.moyenne_salaire ? `${formatNumber(stats.moyenne_salaire)} Ar` : '0 Ar'}</div>
                        <div className="label">Salaire moyen</div>
                    </div>
                </div>
            )}

            <div className="actions-bar">
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    Générer un bulletin
                </button>
                <button className="btn btn-secondary" onClick={handleGenererTous}>
                    Générer pour tous ({moisNoms[formData.mois - 1]} {formData.annee})
                </button>
            </div>

            <div className="table-container">
                <h3 style={{ padding: '15px 15px 0 15px' }}>Bulletins de paie</h3>
                <table className="table">
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
                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                                    Aucun bulletin de paie
                                        </td>
                            </tr>
                        ) : (
                            bulletins.map(b => {
                                const role = getRoleDisplay(b.roles);
                                return (
                                    <tr key={b.id}>
                                        <td><strong>{b.prenom} {b.nom}</strong></td>
                                        <td>{role.icon} {role.text}</td>
                                        <td>{moisNoms[b.mois - 1]} {b.annee}</td>
                                        <td>{formatNumber(b.salaire_base)} Ar</td>
                                        <td>{parseFloat(b.prime_transport || 0) > 0 ? `${formatNumber(b.prime_transport)} Ar` : '-'}</td>
                                        <td>{b.jours_absence_non_paye > 0 ? `${b.jours_absence_non_paye}j (-${formatNumber(b.retenue_absence)} Ar)` : '-'}</td>
                                        <td><strong style={{ color: '#28a745' }}>{formatNumber(b.net_a_payer)} Ar</strong></td>
                                        <td>{getStatusBadge(b.statut)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {b.statut !== 'paye' && (
                                                    <>
                                                        <button 
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleModifier(b)}
                                                            style={{ background: '#ff9800', color: 'white' }}
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleMarquerPaye(b.id)}
                                                        >
                                                            Payé
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleSupprimer(b.id)}
                                                >
                                                    Supprimer
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => generatePDF(b)}
                                                    style={{ background: '#dc3545' }}
                                                >
                                                    PDF
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

            {showModal && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) { setShowModal(false); resetForm(); }
                }}>
                    <div className="modal" style={{ maxWidth: '650px' }}>
                        <h3>{selectedBulletin ? 'Modifier le bulletin' : 'Générer un bulletin de paie'}</h3>

                        {message && (
                            <div className={message.includes('succès') ? 'success-message' : 'error-message'}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={selectedBulletin ? handleSaveModification : handleGenererBulletin}>
                            {!selectedBulletin && (
                                <>
                                    <div className="filters-bar" style={{ marginBottom: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                                        <div className="form-row">
                                            <div className="form-group" style={{ flex: 2 }}>
                                                <label>Rechercher</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Nom, prénom ou email..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
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
                                                <div className="form-group">
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
                                            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                                                <label>&nbsp;</label>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm btn-secondary" 
                                                    onClick={resetFilters}
                                                    style={{ marginTop: '5px' }}
                                                >
                                                    Réinitialiser
                                                </button>
                                            </div>
                                        </div>
                                        <div className="info-text" style={{ fontSize: '12px', marginTop: '10px' }}>
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
                                        {filteredEmployees.length === 0 && employees.length > 0 && (
                                            <small className="info-text" style={{ color: '#ff9800', display: 'block', marginTop: '5px' }}>
                                                Aucun employé ne correspond aux critères de recherche. Modifiez vos filtres.
                                            </small>
                                        )}
                                        {employees.length === 0 && (
                                            <small className="info-text" style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                                                Aucun employé trouvé. Veuillez créer un employé depuis "Gestion des utilisateurs".
                                            </small>
                                        )}
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
                                <small className="info-text">Salaire mensuel de base en Ariary</small>
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
                                <small className="info-text">Prime exceptionnelle en Ariary (transport, performance, etc.)</small>
                            </div>

                            <div className="info-box" style={{ background: '#e8f4fd', marginTop: '15px' }}>
                                <strong>Aperçu :</strong><br/>
                                Salaire brut : {formatNumber(parseFloat(formData.salaire_base || 0) + parseFloat(formData.prime || 0))} Ar<br/>
                                Prime : {formatNumber(formData.prime || 0)} Ar<br/>
                                <strong>Net estimé : {formatNumber((parseFloat(formData.salaire_base) || 0) + (parseFloat(formData.prime) || 0))} Ar</strong>
                                <br/><small style={{ color: '#888' }}>* Les retenues pour absences seront calculées automatiquement</small>
                            </div>

                            <div className="btn-group" style={{ marginTop: '20px' }}>
                                <button type="submit" className="btn btn-primary">
                                    {selectedBulletin ? 'Enregistrer' : 'Générer le bulletin'}
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                >
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