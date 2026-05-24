// frontend/src/components/payroll/PayrollDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../common/Modal';
import ToastNotification from '../notifications/ToastNotification';

function PayrollDashboard() {
    const [bulletins, setBulletins] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showMassGenerateModal, setShowMassGenerateModal] = useState(false);
    const [selectedBulletin, setSelectedBulletin] = useState(null);
    const [message, setMessage] = useState('');
    const [toasts, setToasts] = useState([]);
    
    // Filtres pour la liste des employés
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterService, setFilterService] = useState('all');
    const [services, setServices] = useState([]);
    
    // Filtres pour la génération massive
    const [massGenerateFilters, setMassGenerateFilters] = useState({
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    prime_fixe: 0,
    prime_pourcentage: 0,
    services: [],
    exclure_payes: true,
    employes_selectionnes: [],
    envoyer_email: true  // Par défaut true
});
    
    // Aperçu avant génération massive
    const [previewData, setPreviewData] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Sélection manuelle des employés
    const [selectAllMode, setSelectAllMode] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    const addToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => removeToast(id), duration);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        filterEmployees();
    }, [employees, searchTerm, filterRole, filterService]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [bulletinsRes, employeesRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/payroll/tous-bulletins`, getAuthHeaders()),
                axios.get(`${API_URL}/admin/employees-for-payroll`, getAuthHeaders()),
                axios.get(`${API_URL}/payroll/stats`, getAuthHeaders())
            ]);
            
            setBulletins(bulletinsRes.data);
            setEmployees(employeesRes.data);
            setFilteredEmployees(employeesRes.data);
            setStats(statsRes.data);
            
            const uniqueServices = [...new Set(employeesRes.data.map(emp => emp.service).filter(s => s))];
            setServices(uniqueServices);
        } catch (error) {
            console.error('Erreur chargement:', error);
            addToast('Erreur lors du chargement des données', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterEmployees = () => {
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
    };

    const resetForm = () => {
        setSelectedBulletin(null);
        setMessage('');
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

    const [formData, setFormData] = useState({
        utilisateur_id: '',
        mois: new Date().getMonth() + 1,
        annee: new Date().getFullYear(),
        salaire_base: '',
        prime: 0
    });

    const handleGenererBulletin = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!formData.utilisateur_id) {
            setMessage('Veuillez sélectionner un employé');
            return;
        }

        try {
            const response = await axios.post(
                `${API_URL}/payroll/generer-bulletin`,
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
            addToast(response.data.message, 'success');
            setTimeout(() => {
                setShowModal(false);
                resetForm();
                fetchAllData();
            }, 1500);
        } catch (error) {
            console.error('Erreur génération:', error);
            const errorMsg = error.response?.data?.message || 'Erreur lors de la génération';
            setMessage(errorMsg);
            addToast(errorMsg, 'error');
        }
    };

    // ============ APERÇU AVANT GÉNÉRATION MASSIVE ============
    const handlePreviewMassGenerate = async () => {
        const { mois, annee, prime_fixe, prime_pourcentage, services, exclure_payes, employes_selectionnes } = massGenerateFilters;
        
        // Filtrer les employés
        let employesCibles = [...employees];
        
        // Filtrer par services
        if (services && services.length > 0) {
            employesCibles = employesCibles.filter(emp => services.includes(emp.service));
        }
        
        // Filtrer par sélection manuelle (si mode sélection actif)
        if (selectAllMode === false && selectedEmployeeIds.length > 0) {
            employesCibles = employesCibles.filter(emp => selectedEmployeeIds.includes(emp.id));
        }
        
        const employesAvecBulletins = [];
        let bulletinsExistants = 0;
        let totalNet = 0;
        let totalSalaireBase = 0;
        let totalPrime = 0;
        
        for (const emp of employesCibles) {
            // Vérifier si bulletin existe déjà
            const existe = bulletins.some(b => 
                b.utilisateur_id === emp.id && 
                b.mois === mois && 
                b.annee === annee
            );
            
            // Exclure les employés déjà payés si l'option est activée
            if (exclure_payes && existe) {
                bulletinsExistants++;
                continue;
            }
            
            const salaireBase = emp.salaire_base || 500000;
            const primeCalculee = parseFloat(prime_fixe) + (salaireBase * parseFloat(prime_pourcentage) / 100);
            const netEstime = Math.round((salaireBase + primeCalculee) * 100) / 100;
            
            totalNet += netEstime;
            totalSalaireBase += salaireBase;
            totalPrime += primeCalculee;
            
            employesAvecBulletins.push({
                ...emp,
                salaire_base: salaireBase,
                prime_calculee: Math.round(primeCalculee * 100) / 100,
                net_estime: netEstime,
                bulletin_existe: existe
            });
        }
        
        // Statistiques par service
        const statsParService = {};
        employesAvecBulletins.forEach(emp => {
            const service = emp.service || 'Sans service';
            if (!statsParService[service]) {
                statsParService[service] = { count: 0, totalNet: 0 };
            }
            statsParService[service].count++;
            statsParService[service].totalNet += emp.net_estime;
        });
        
        setPreviewData({
            employes: employesAvecBulletins,
            total_employes: employesAvecBulletins.length,
            bulletins_existants: bulletinsExistants,
            total_net: totalNet,
            total_salaire_base: totalSalaireBase,
            total_prime: totalPrime,
            prime_moyenne: employesAvecBulletins.length > 0 ? totalPrime / employesAvecBulletins.length : 0,
            stats_par_service: statsParService
        });
        
        setShowPreviewModal(true);
    };

    // ============ GÉNÉRATION MASSIVE ============
    const handleMassGenerate = async () => {
    if (!previewData || previewData.employes.length === 0) {
        addToast('Aucun employé à générer', 'warning');
        return;
    }
    
    if (!window.confirm(`⚠️ Génération massive de bulletins\n\n` +
        `📊 ${previewData.employes.length} bulletin(s) vont être générés\n` +
        `💰 Total net estimé: ${previewData.total_net.toLocaleString()} Ar\n` +
        `📧 ${massGenerateFilters.envoyer_email ? 'Les employés recevront une notification par email' : 'Aucun email ne sera envoyé'}\n\n` +
        `Confirmez-vous cette opération ?`)) {
        return;
    }
    
    try {
        const response = await axios.post(
            `${API_URL}/payroll/generer-bulletins-equipe`,
            { 
                mois: massGenerateFilters.mois, 
                annee: massGenerateFilters.annee,
                envoyer_email: massGenerateFilters.envoyer_email
            },
            getAuthHeaders()
        );
        
        let message = response.data.message;
        if (response.data.emailSentCount > 0) {
            message += `\n\n📧 ${response.data.emailSentCount} email(s) envoyé(s) aux employés.`;
        }
        if (response.data.emailErrors && response.data.emailErrors.length > 0) {
            message += `\n⚠️ ${response.data.emailErrors.length} erreur(s) d'envoi d'email.`;
        }
        
        alert(message);
        
        if (response.data.details && response.data.details.length > 0) {
            console.log('Détails:', response.data.details);
        }
        
        setShowMassGenerateModal(false);
        setShowPreviewModal(false);
        setPreviewData(null);
        setSelectedEmployeeIds([]);
        setSelectAllMode(true);
        fetchAllData();
        
        if (response.data.successCount > 0) {
            addToast(`✅ ${response.data.successCount} bulletin(s) généré(s) avec succès`, 'success');
        }
        if (response.data.emailSentCount > 0) {
            addToast(`📧 ${response.data.emailSentCount} email(s) envoyé(s) aux employés`, 'success');
        }
    } catch (error) {
        console.error('Erreur:', error);
        addToast('Erreur lors de la génération massive', 'error');
    }
};

    const handleMarquerPaye = async (id) => {
        if (!window.confirm('Marquer ce bulletin comme payé ?')) return;
        try {
            await axios.put(
                `${API_URL}/payroll/marquer-paye/${id}`,
                {},
                getAuthHeaders()
            );
            addToast('Bulletin marqué comme payé', 'success');
            fetchAllData();
        } catch (error) {
            addToast('Erreur', 'error');
        }
    };

    const handleSupprimer = async (id) => {
        if (!window.confirm('Supprimer ce bulletin ? Cette action est irréversible.')) return;
        try {
            await axios.delete(
                `${API_URL}/payroll/bulletin/${id}`,
                getAuthHeaders()
            );
            addToast('Bulletin supprimé', 'success');
            fetchAllData();
        } catch (error) {
            addToast('Erreur lors de la suppression', 'error');
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
                `${API_URL}/payroll/bulletin/${selectedBulletin.id}`,
                {
                    salaire_base: parseFloat(formData.salaire_base),
                    prime: parseFloat(formData.prime) || 0
                },
                getAuthHeaders()
            );
            setMessage(response.data.message);
            addToast(response.data.message, 'success');
            setTimeout(() => {
                setShowModal(false);
                setSelectedBulletin(null);
                resetForm();
                fetchAllData();
            }, 1500);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Erreur';
            setMessage(errorMsg);
            addToast(errorMsg, 'error');
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

    const toggleServiceSelection = (service) => {
        setMassGenerateFilters(prev => {
            const newServices = prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service];
            return { ...prev, services: newServices };
        });
    };

    const toggleEmployeeSelection = (employeeId) => {
        setSelectedEmployeeIds(prev => 
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
        setSelectAllMode(false);
    };

    const selectAllEmployees = () => {
        setSelectAllMode(true);
        setSelectedEmployeeIds([]);
    };

    const deselectAllEmployees = () => {
        setSelectAllMode(false);
        setSelectedEmployeeIds([]);
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
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            
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

            {/* Cartes statistiques */}
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
                <button className="btn-secondary" onClick={() => { setShowMassGenerateModal(true); setPreviewData(null); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Génération massive
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

            {/* MODAL GÉNÉRATION INDIVIDUELLE */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="📄 Générer un bulletin">
                {message && (
                    <div className={message.includes('succès') ? 'success-message' : 'error-message'}>
                        {message}
                    </div>
                )}
                <form onSubmit={selectedBulletin ? handleSaveModification : handleGenererBulletin}>
                    <div className="form-group">
                        <label>Employé *</label>
                        <select
                            className="form-input"
                            value={formData.utilisateur_id}
                            onChange={handleEmployeChange}
                            required
                            disabled={!!selectedBulletin}
                        >
                            <option value="">-- Sélectionner un employé --</option>
                            {filteredEmployees.map(emp => {
                                const role = getRoleDisplay(emp.roles);
                                return (
                                    <option key={emp.id} value={emp.id}>
                                        {role.icon} {emp.prenom} {emp.nom} - {role.text}
                                        {emp.service ? ` (${emp.service})` : ''}
                                        {' - Salaire: '}{formatNumber(emp.salaire_base || 500000)} Ar
                                    </option>
                                );
                            })}
                        </select>
                    </div>

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

                    <div className="form-actions">
                        <button type="submit" className="btn-primary">
                            {selectedBulletin ? 'Enregistrer' : 'Générer le bulletin'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                            Annuler
                        </button>
                    </div>
                </form>
            </Modal>

             {/* MODAL GÉNÉRATION INDIVIDUELLE - Avec bouton Annuler rouge */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="📄 Générer un bulletin">
                {message && (
                    <div className={message.includes('succès') ? 'success-message' : 'error-message'}>
                        {message}
                    </div>
                )}
                <form onSubmit={selectedBulletin ? handleSaveModification : handleGenererBulletin}>
                    <div className="form-group">
                        <label>Employé *</label>
                        <select
                            className="form-input"
                            value={formData.utilisateur_id}
                            onChange={handleEmployeChange}
                            required
                            disabled={!!selectedBulletin}
                        >
                            <option value="">-- Sélectionner un employé --</option>
                            {filteredEmployees.map(emp => {
                                const role = getRoleDisplay(emp.roles);
                                return (
                                    <option key={emp.id} value={emp.id}>
                                        {role.icon} {emp.prenom} {emp.nom} - {role.text}
                                        {emp.service ? ` (${emp.service})` : ''}
                                        {' - Salaire: '}{formatNumber(emp.salaire_base || 500000)} Ar
                                    </option>
                                );
                            })}
                        </select>
                    </div>

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

                    <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary">
                            {selectedBulletin ? 'Enregistrer' : 'Générer le bulletin'}
                        </button>
                        <button type="button" className="btn-cancel-danger" onClick={() => { setShowModal(false); resetForm(); }} style={{ 
                            background: '#dc3545', 
                            color: 'white', 
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                        }} onMouseEnter={(e) => e.target.style.background = '#c82333'} onMouseLeave={(e) => e.target.style.background = '#dc3545'}>
                            Annuler
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL GÉNÉRATION MASSIVE - Avec bouton Annuler rouge */}
            <Modal isOpen={showMassGenerateModal} onClose={() => { setShowMassGenerateModal(false); setPreviewData(null); }} title="🚀 Génération massive de bulletins">
                <div className="mass-generate-form">
                    <div className="info-box-massive" style={{ 
                        background: 'var(--info-bg, #e8f4fd)', 
                        color: 'var(--info-text, #1e40af)',
                        marginBottom: '20px', 
                        padding: '16px', 
                        borderRadius: '12px',
                        borderLeft: '4px solid #3b82f6'
                    }}>
                        <strong style={{ color: 'var(--info-text, #1e40af)' }}>ℹ️ Information :</strong><br/>
                        <span style={{ color: 'var(--info-text, #1e40af)' }}>Cette fonction va générer des bulletins pour les employés sélectionnés.
                        Vous pouvez filtrer par service, exclure les déjà payés, ou sélectionner manuellement.</span>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label style={{ color: 'var(--text-secondary, #475569)' }}>Mois</label>
                            <select 
                                className="form-input" 
                                value={massGenerateFilters.mois} 
                                onChange={(e) => setMassGenerateFilters({...massGenerateFilters, mois: parseInt(e.target.value)})}
                                style={{ background: 'var(--bg-input, white)', color: 'var(--text-primary, #1e293b)', borderColor: 'var(--border-light, #e2e8f0)' }}
                            >
                                {moisNoms.map((mois, idx) => (
                                    <option key={idx} value={idx + 1}>{mois}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ color: 'var(--text-secondary, #475569)' }}>Année</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={massGenerateFilters.annee} 
                                onChange={(e) => setMassGenerateFilters({...massGenerateFilters, annee: parseInt(e.target.value)})}
                                style={{ background: 'var(--bg-input, white)', color: 'var(--text-primary, #1e293b)', borderColor: 'var(--border-light, #e2e8f0)' }}
                            />
                        </div>
                    </div>
                    
                    <div className="info-box-prime" style={{ 
                        background: 'var(--success-bg, #f0fdf4)', 
                        color: 'var(--success-text, #065f46)',
                        marginBottom: '20px', 
                        padding: '16px', 
                        borderRadius: '12px',
                        borderLeft: '4px solid #10b981'
                    }}>
                        <strong style={{ color: 'var(--success-text, #065f46)' }}>💰 Options de prime :</strong>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label style={{ color: 'var(--text-secondary, #475569)' }}>Prime fixe (Ar)</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={massGenerateFilters.prime_fixe} 
                                onChange={(e) => setMassGenerateFilters({...massGenerateFilters, prime_fixe: parseInt(e.target.value) || 0})}
                                placeholder="Ex: 50000"
                                style={{ background: 'var(--bg-input, white)', color: 'var(--text-primary, #1e293b)', borderColor: 'var(--border-light, #e2e8f0)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ color: 'var(--text-secondary, #475569)' }}>Prime en % du salaire</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={massGenerateFilters.prime_pourcentage} 
                                onChange={(e) => setMassGenerateFilters({...massGenerateFilters, prime_pourcentage: parseInt(e.target.value) || 0})}
                                placeholder="Ex: 5 pour 5%"
                                style={{ background: 'var(--bg-input, white)', color: 'var(--text-primary, #1e293b)', borderColor: 'var(--border-light, #e2e8f0)' }}
                            />
                            <small className="info-text" style={{ color: 'var(--text-tertiary, #64748b)' }}>Calculé sur le salaire de base</small>
                        </div>
                    </div>
                    
                    {/* Filtres par service */}
                    {services.length > 0 && (
                        <div className="form-group">
                            <label style={{ color: 'var(--text-secondary, #475569)' }}>🏢 Filtrer par service</label>
                            <div className="services-checkboxes" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                                {services.map(service => (
                                    <label key={service} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #475569)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={massGenerateFilters.services.includes(service)}
                                            onChange={() => toggleServiceSelection(service)}
                                        />
                                        {service}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary, #475569)' }}>
                            <input 
                                type="checkbox" 
                                checked={massGenerateFilters.exclure_payes} 
                                onChange={(e) => setMassGenerateFilters({...massGenerateFilters, exclure_payes: e.target.checked})}
                            />
                            <span>Exclure les employés ayant déjà un bulletin pour cette période</span>
                        </label>
                    </div>
                    
                    <div className="form-group">
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary, #475569)' }}>
                            <input 
                                type="checkbox" 
                                checked={massGenerateFilters.envoyer_email} 
                                onChange={(e) => setMassGenerateFilters({...massGenerateFilters, envoyer_email: e.target.checked})}
                            />
                            <span>Envoyer une notification email aux employés</span>
                        </label>
                    </div>
                    
                    {/* Sélection manuelle des employés */}
                    <div className="form-group">
                        <label style={{ color: 'var(--text-secondary, #475569)' }}>👥 Sélection manuelle des employés</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <button type="button" className="btn-sm" onClick={selectAllEmployees} style={{ 
                                background: 'var(--bg-tertiary, #f1f5f9)', 
                                border: '1px solid var(--border-light, #e2e8f0)', 
                                padding: '4px 12px', 
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: 'var(--text-secondary, #475569)'
                            }}>
                                Tout sélectionner
                            </button>
                            <button type="button" className="btn-sm" onClick={deselectAllEmployees} style={{ 
                                background: 'var(--bg-tertiary, #f1f5f9)', 
                                border: '1px solid var(--border-light, #e2e8f0)', 
                                padding: '4px 12px', 
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: 'var(--text-secondary, #475569)'
                            }}>
                                Tout désélectionner
                            </button>
                        </div>
                        <div className="employees-selection-list" style={{ 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            border: '1px solid var(--border-light, #e2e8f0)', 
                            borderRadius: '8px', 
                            padding: '8px',
                            background: 'var(--bg-card, white)'
                        }}>
                            {filteredEmployees.map(emp => (
                                <label key={emp.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    padding: '6px 8px', 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid var(--border-light, #f1f5f9)',
                                    color: 'var(--text-secondary, #475569)'
                                }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectAllMode ? true : selectedEmployeeIds.includes(emp.id)}
                                        onChange={() => toggleEmployeeSelection(emp.id)}
                                        disabled={selectAllMode}
                                    />
                                    <span><strong style={{ color: 'var(--text-primary, #1e293b)' }}>{emp.prenom} {emp.nom}</strong></span>
                                    <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}>{emp.service || 'Sans service'}</span>
                                    <span style={{ marginLeft: 'auto', fontWeight: '500', color: 'var(--text-secondary, #475569)' }}>{formatNumber(emp.salaire_base || 500000)} Ar</span>
                                </label>
                            ))}
                        </div>
                        <small className="info-text" style={{ color: 'var(--text-tertiary, #64748b)' }}>Si "Tout sélectionner" est actif, tous les employés (après filtres) seront inclus</small>
                    </div>
                    
                    <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: '20px', display: 'flex', gap: '12px' }}>
                        <button type="button" className="btn-secondary" onClick={handlePreviewMassGenerate}>
                            👁️ Aperçu avant génération
                        </button>
                        <div>
                            <button type="button" className="btn-cancel-danger" onClick={() => { setShowMassGenerateModal(false); setPreviewData(null); }} style={{ 
                                background: '#dc3545', 
                                color: 'white', 
                                border: 'none',
                                padding: '8px 20px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                            }} onMouseEnter={(e) => e.target.style.background = '#c82333'} onMouseLeave={(e) => e.target.style.background = '#dc3545'}>
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL APERÇU AVANT GÉNÉRATION */}
            <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title="📊 Aperçu de la génération massive">
                {previewData && (
                    <div className="preview-section">
                        <div className="stats-cards-grid" style={{ marginBottom: '16px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="stat-card small" style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#4f46e5' }}>{previewData.total_employes}</div>
                                <div className="stat-label" style={{ fontSize: '12px', color: '#64748b' }}>Nouveaux bulletins</div>
                            </div>
                            <div className="stat-card small warning" style={{ background: '#fff3cd', padding: '12px', borderRadius: '12px' }}>
                                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>{previewData.bulletins_existants}</div>
                                <div className="stat-label" style={{ fontSize: '12px', color: '#856404' }}>Déjà existants</div>
                            </div>
                            <div className="stat-card small" style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{previewData.total_net.toLocaleString()} Ar</div>
                                <div className="stat-label" style={{ fontSize: '12px', color: '#64748b' }}>Total net estimé</div>
                            </div>
                            <div className="stat-card small" style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{Math.round(previewData.prime_moyenne).toLocaleString()} Ar</div>
                                <div className="stat-label" style={{ fontSize: '12px', color: '#64748b' }}>Prime moyenne</div>
                            </div>
                        </div>
                        
                        {/* Statistiques par service */}
                        {Object.keys(previewData.stats_par_service).length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>📊 Par service :</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {Object.entries(previewData.stats_par_service).map(([service, data]) => (
                                        <div key={service} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px' }}>
                                            <strong>{service}</strong>: {data.count} employé(s) - {data.totalNet.toLocaleString()} Ar
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Liste des employés */}
                        {previewData.employes.length > 0 ? (
                            <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table className="modern-table compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Employé</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Service</th>
                                            <th style={{ padding: '8px', textAlign: 'right' }}>Salaire base</th>
                                            <th style={{ padding: '8px', textAlign: 'right' }}>Prime</th>
                                            <th style={{ padding: '8px', textAlign: 'right' }}>Net estimé</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.employes.map(emp => (
                                            <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '8px' }}><strong>{emp.prenom} {emp.nom}</strong></td>
                                                <td style={{ padding: '8px' }}>{emp.service || '-'}</td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>{emp.salaire_base.toLocaleString()} Ar</td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>{Math.round(emp.prime_calculee).toLocaleString()} Ar</td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}><strong>{emp.net_estime.toLocaleString()} Ar</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="info-box" style={{ background: '#fff3cd', marginTop: '16px' }}>
                                Aucun employé à générer pour la période sélectionnée.
                            </div>
                        )}
                        
                        <div className="form-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-cancel" onClick={() => setShowPreviewModal(false)}>
                                Retour
                            </button>
                            <button type="button" className="btn-submit" onClick={handleMassGenerate} disabled={previewData.employes.length === 0}>
                                Confirmer la génération ({previewData.employes.length} bulletins)
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default PayrollDashboard;