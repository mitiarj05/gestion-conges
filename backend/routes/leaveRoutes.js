// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { 
    sendNewRequestToManagerEmail,
    sendManagerApprovalEmail,
    sendManagerRejectionEmail 
} = require('../utils/emailService');

// ============ FONCTION DE VALIDATION SIMPLIFIÉE (2 TYPES) ============

const validateLeaveRequest = async (userId, type_id, start_date, end_date, isModification = false, excludeRequestId = null) => {
    const errors = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    // Règle 1: Pas de date passée
    if (start < today) {
        errors.push("La date de début ne peut pas être dans le passé");
    }
    
    // Règle 2: Dates cohérentes
    if (start > end) {
        errors.push("La date de début doit être antérieure à la date de fin");
    }
    
    // Calcul des jours
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Règle 3: Max jours consécutifs selon type
    // type_id 1 = CP (max 20j), type_id 2 = Sans solde (max 5j)
    const maxConsecutif = (type_id === 2) ? 5 : 20;
    
    if (days > maxConsecutif) {
        const typeNom = (type_id === 1) ? "Congés Payés" : "Congé sans solde";
        errors.push(`${typeNom} : maximum ${maxConsecutif} jours consécutifs (vous demandez ${days} jours)`);
    }
    
    // Règle 4: Préavis
    const preavisMin = (type_id === 2) ? 1 : 2;
    const preavisDate = new Date();
    preavisDate.setDate(preavisDate.getDate() + preavisMin);
    
    if (start < preavisDate && !isModification) {
        errors.push(`Vous devez faire votre demande au moins ${preavisMin} jours à l'avance`);
    }
    
    // Règle 5: Vérification du solde (UNIQUEMENT pour Congés Payés - type_id = 1)
    if (type_id === 1) {
        const currentYear = new Date().getFullYear();
        const soldeResult = await pool.query(
            `SELECT restant_jours FROM solde_conges 
             WHERE utilisateur_id = $1 AND annee = $2 AND type_conge_id = 1`,
            [userId, currentYear]
        );
        
        if (soldeResult.rows.length > 0) {
            const restant = parseFloat(soldeResult.rows[0].restant_jours);
            if (restant < days) {
                errors.push(`Solde CP insuffisant. Il vous reste ${restant} jours sur 25.`);
            }
        } else {
            errors.push("Solde CP non trouvé. Contactez l'administrateur.");
        }
    }
    
    // Règle 6: Pas de chevauchement avec d'autres demandes
    let overlappingQuery;
    let overlappingParams;
    
    if (isModification && excludeRequestId) {
        overlappingQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 AND statut IN ('pending_manager', 'pending_admin', 'approved')
            AND id != $2
            AND ((date_debut <= $3 AND date_fin >= $3) 
                 OR (date_debut <= $4 AND date_fin >= $4) 
                 OR (date_debut >= $3 AND date_fin <= $4))`;
        overlappingParams = [userId, excludeRequestId, start_date, end_date];
    } else {
        overlappingQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 AND statut IN ('pending_manager', 'pending_admin', 'approved')
            AND ((date_debut <= $2 AND date_fin >= $2) 
                 OR (date_debut <= $3 AND date_fin >= $3) 
                 OR (date_debut >= $2 AND date_fin <= $3))`;
        overlappingParams = [userId, start_date, end_date];
    }
    
    const overlapping = await pool.query(overlappingQuery, overlappingParams);
    
    if (parseInt(overlapping.rows[0].count) > 0) {
        errors.push("Vous avez déjà une demande de congé sur cette période");
    }
    
    return { isValid: errors.length === 0, errors, days };
};

// ============ SOLDE ============

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();
        
        // Solde CP (type_id = 1)
        const cpResult = await pool.query(
            `SELECT total_jours, pris_jours, restant_jours 
             FROM solde_conges 
             WHERE utilisateur_id = $1 AND annee = $2 AND type_conge_id = 1`,
            [userId, currentYear]
        );
        
        let cp_total = 25, cp_pris = 0, cp_restant = 25;
        
        if (cpResult.rows.length > 0) {
            cp_total = parseFloat(cpResult.rows[0].total_jours) || 25;
            cp_pris = parseFloat(cpResult.rows[0].pris_jours) || 0;
            cp_restant = parseFloat(cpResult.rows[0].restant_jours) || 25;
        }
        
        res.json({
            cp_total: cp_total,
            cp_pris: cp_pris,
            cp_restant: cp_restant
        });
        
    } catch (error) {
        console.error('Erreur balance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ MES DEMANDES ============

router.get('/my-requests', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT 
                dc.id,
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as start_date,
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as end_date,
                dc.type_conge_id as type_id,
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    ELSE '📝 Congé sans solde'
                END as type,
                dc.nombre_jours as duration,
                dc.statut,
                dc.motif,
                dc.motif_refus,
                dc.cree_le,
                'conges' as request_type
             FROM demandes_conges dc
             WHERE dc.utilisateur_id = $1
             ORDER BY dc.cree_le DESC`,
            [userId]
        );
        
        res.json(congesResult.rows);
    } catch (error) {
        console.error('Erreur my-requests:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ DEMANDE DE CONGÉ ============

router.post('/request', authMiddleware, async (req, res) => {
    const { type_id, start_date, end_date, motif } = req.body;
    const userId = req.user.id;
    
    try {
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date);
        
        if (!validation.isValid) {
            return res.status(400).json({ message: "Règles non respectées", errors: validation.errors });
        }
        
        const days = validation.days;
        
        const result = await pool.query(
            `INSERT INTO demandes_conges 
             (utilisateur_id, type_conge_id, date_debut, date_fin, nombre_jours, motif, statut)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending_manager')
             RETURNING id`,
            [userId, type_id, start_date, end_date, days, motif]
        );
        
        // Notification au manager
        const managerResult = await pool.query(`SELECT manager_id FROM users WHERE id = $1`, [userId]);
        const managerId = managerResult.rows[0]?.manager_id;
        
        if (managerId) {
            const userInfo = await pool.query(`SELECT nom, prenom FROM users WHERE id = $1`, [userId]);
            const employe = userInfo.rows[0];
            const typeNom = (type_id === 1) ? "Congés Payés" : "Congé sans solde";
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_recue', 'Nouvelle demande de congé', 
                         $2, '/dashboard/manager/validations', NOW())`,
                [managerId, `${employe.prenom} ${employe.nom} a fait une demande de ${typeNom} du ${start_date} au ${end_date} (${days} jours)`]
            );
            
            // Email au manager
            try {
                const managerEmailResult = await pool.query(`SELECT email, prenom FROM users WHERE id = $1`, [managerId]);
                if (managerEmailResult.rows.length > 0) {
                    const manager = managerEmailResult.rows[0];
                    await sendNewRequestToManagerEmail(
                        manager.email,
                        manager.prenom,
                        `${employe.prenom} ${employe.nom}`,
                        `${start_date} au ${end_date}`,
                        days
                    );
                }
            } catch (emailError) {
                console.error('Erreur envoi email:', emailError);
            }
        }
        
        res.status(201).json({ 
            message: 'Demande créée avec succès',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Erreur create request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ MODIFIER UNE DEMANDE ============

router.put('/update-request/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { type_id, start_date, end_date, motif } = req.body;
    
    try {
        const requestCheck = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_manager'`,
            [requestId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non modifiable' });
        }
        
        const demande = requestCheck.rows[0];
        
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date, true, parseInt(requestId));
        
        if (!validation.isValid) {
            return res.status(400).json({ message: "Règles non respectées", errors: validation.errors });
        }
        
        const days = validation.days;
        
        await pool.query(
            `UPDATE demandes_conges 
             SET type_conge_id = $1, date_debut = $2, date_fin = $3, nombre_jours = $4, motif = $5, statut = 'pending_manager'
             WHERE id = $6`,
            [type_id, start_date, end_date, days, motif || demande.motif, requestId]
        );
        
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_modifiee', 'Demande de congé modifiée',
                         $2, '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `${demande.prenom} ${demande.nom} a modifié sa demande de congé.`]
            );
        }
        
        res.json({ message: 'Demande modifiée avec succès' });
        
    } catch (error) {
        console.error('Erreur update request:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ ANNULER UNE DEMANDE ============

router.delete('/cancel-request/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.user.id;
    
    try {
        const requestCheck = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_manager'`,
            [requestId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non annulable' });
        }
        
        const demande = requestCheck.rows[0];
        
        await pool.query(`DELETE FROM demandes_conges WHERE id = $1`, [requestId]);
        
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_annulee', 'Demande de congé annulée',
                         $2, '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `${demande.prenom} ${demande.nom} a annulé sa demande de congé.`]
            );
        }
        
        res.json({ message: 'Demande annulée avec succès' });
        
    } catch (error) {
        console.error('Erreur cancel request:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ VALIDATION MANAGER ============

router.get('/team-pending', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT 
                dc.id,
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                dc.nombre_jours, dc.motif, dc.statut,
                u.nom, u.prenom, u.email, u.service, 
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    ELSE '📝 Congé sans solde'
                END as type_name,
                'conges' as request_type,
                dc.cree_le
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
             ORDER BY dc.cree_le ASC`,
            [managerId]
        );
        
        res.json(congesResult.rows);
    } catch (error) {
        console.error('Erreur team pending:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/team-pending-filtered', authMiddleware, async (req, res) => {
    const { periode } = req.query;
    const managerId = req.user.id;
    
    let dateCondition = "";
    
    switch(periode) {
        case 'month':
            dateCondition = `AND dc.date_debut >= DATE_TRUNC('month', CURRENT_DATE)`;
            break;
        case 'quarter':
            dateCondition = `AND dc.date_debut >= DATE_TRUNC('quarter', CURRENT_DATE)`;
            break;
        case 'year':
            dateCondition = `AND dc.date_debut >= DATE_TRUNC('year', CURRENT_DATE)`;
            break;
        default:
            dateCondition = "";
    }
    
    try {
        const congesResult = await pool.query(`
            SELECT 
                dc.id,
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                dc.nombre_jours, dc.motif, dc.statut,
                u.nom, u.prenom, u.email, u.service, 
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    ELSE '📝 Congé sans solde'
                END as type_name,
                'conges' as request_type,
                dc.cree_le
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE u.manager_id = $1 ${dateCondition}
             ORDER BY dc.cree_le DESC
        `, [managerId]);
        
        res.json(congesResult.rows);
    } catch (error) {
        console.error('Erreur team pending filtered:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/manager-approve/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { request_type } = req.body;
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.statut = 'pending_manager'`,
            [requestId]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée' });
        }
        
        const demande = requestResult.rows[0];
        
        if (demande.manager_id !== managerId) {
            return res.status(403).json({ message: 'Vous n\'êtes pas le manager' });
        }
        
        await pool.query(
            `UPDATE demandes_conges SET statut = 'pending_admin', approbateur_id = $1, date_approbation = NOW()
             WHERE id = $2`,
            [managerId, requestId]
        );
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'pre_approuve', 'Demande pré-approuvée', 
                     $2, '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id, `Votre demande de congé a été validée par votre manager.`]
        );
        
        const adminResult = await pool.query(
            `SELECT u.id FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'admin' LIMIT 1`
        );
        
        if (adminResult.rows.length > 0) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'validation_requise', 'Demande à valider', 
                         $2, '/dashboard/admin', NOW())`,
                [adminResult.rows[0].id, `Une demande de congé de ${demande.prenom} ${demande.nom} attend votre validation.`]
            );
        }
        
        // Email à l'employé
        try {
            const employeEmailResult = await pool.query(`SELECT email, prenom FROM users WHERE id = $1`, [demande.utilisateur_id]);
            if (employeEmailResult.rows.length > 0) {
                const employe = employeEmailResult.rows[0];
                await sendManagerApprovalEmail(
                    employe.email,
                    `${employe.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    demande.nombre_jours
                );
            }
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError);
        }
        
        res.json({ message: 'Demande pré-approuvée' });
        
    } catch (error) {
        console.error('Erreur manager approve:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/manager-reject/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { motif, request_type } = req.body;
    const motifFinal = motif || 'Non spécifié';
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.statut = 'pending_manager'`,
            [requestId]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée' });
        }
        
        const demande = requestResult.rows[0];
        
        if (demande.manager_id !== managerId) {
            return res.status(403).json({ message: 'Vous n\'êtes pas le manager' });
        }
        
        await pool.query(
            `UPDATE demandes_conges SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
             WHERE id = $3`,
            [managerId, motifFinal, requestId]
        );
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'refus_manager', 'Demande de congé refusée', 
                     $2, '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id, `Votre demande de congé a été refusée par votre manager. Motif : ${motifFinal}`]
        );
        
        // Email à l'employé
        try {
            const employeEmailResult = await pool.query(`SELECT email, prenom FROM users WHERE id = $1`, [demande.utilisateur_id]);
            if (employeEmailResult.rows.length > 0) {
                const employe = employeEmailResult.rows[0];
                await sendManagerRejectionEmail(
                    employe.email,
                    `${employe.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    motifFinal
                );
            }
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError);
        }
        
        res.json({ message: 'Demande refusée' });
        
    } catch (error) {
        console.error('Erreur manager reject:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ CALENDRIER ÉQUIPE ============

router.get('/team-absences', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT 
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut, 
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin, 
                dc.statut, 
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    ELSE '📝 Congé sans solde'
                END as type_name,
                u.nom, u.prenom, u.id as user_id
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE u.manager_id = $1 AND dc.statut IN ('approved', 'pending_manager', 'pending_admin')
             ORDER BY dc.date_debut ASC`,
            [managerId]
        );
        
        res.json(congesResult.rows);
    } catch (error) {
        console.error('Erreur team absences:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ CALENDRIER GLOBAL (ADMIN) ============

router.get('/all-absences', authMiddleware, async (req, res) => {
    try {
        const congesResult = await pool.query(
            `SELECT 
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut, 
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin, 
                dc.statut, 
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    ELSE '📝 Congé sans solde'
                END as type_name,
                u.nom, u.prenom, u.id as user_id,
                u.service
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.statut IN ('approved', 'pending_manager', 'pending_admin')
             ORDER BY dc.date_debut ASC`,
            []
        );
        
        res.json(congesResult.rows);
    } catch (error) {
        console.error('Erreur all absences:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ STATISTIQUES MANAGER DASHBOARD ============

router.get('/manager-dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const teamResult = await pool.query(
            `SELECT id FROM users WHERE manager_id = $1`,
            [managerId]
        );
        
        const teamIds = teamResult.rows.map(m => m.id);
        
        if (teamIds.length === 0) {
            return res.json({
                totalDemandes: 0,
                approuvees: 0,
                enAttente: 0,
                refusees: 0,
                demandesParMois: [],
                demandesParEmploye: []
            });
        }
        
        const globalStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN statut = 'approved' THEN 1 ELSE 0 END) as approuvees,
                SUM(CASE WHEN statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as enAttente,
                SUM(CASE WHEN statut = 'rejected' THEN 1 ELSE 0 END) as refusees
            FROM demandes_conges
            WHERE utilisateur_id = ANY($1::int[])
        `, [teamIds]);
        
        const parMois = await pool.query(`
            SELECT 
                EXTRACT(YEAR FROM date_debut) as annee,
                EXTRACT(MONTH FROM date_debut) as mois,
                COUNT(*) as total
            FROM demandes_conges
            WHERE utilisateur_id = ANY($1::int[])
            AND date_debut >= NOW() - INTERVAL '12 months'
            GROUP BY annee, mois
            ORDER BY annee DESC, mois DESC
        `, [teamIds]);
        
        const parEmploye = await pool.query(`
            SELECT 
                u.id, u.nom, u.prenom,
                COUNT(dc.*) as total,
                SUM(CASE WHEN dc.statut = 'approved' THEN 1 ELSE 0 END) as approuvees,
                SUM(CASE WHEN dc.statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as enAttente,
                SUM(CASE WHEN dc.statut = 'rejected' THEN 1 ELSE 0 END) as refusees
            FROM users u
            LEFT JOIN demandes_conges dc ON u.id = dc.utilisateur_id
            WHERE u.manager_id = $1
            GROUP BY u.id
            ORDER BY total DESC
        `, [managerId]);
        
        res.json({
            totalDemandes: parseInt(globalStats.rows[0].total) || 0,
            approuvees: parseInt(globalStats.rows[0].approuvees) || 0,
            enAttente: parseInt(globalStats.rows[0].enAttente) || 0,
            refusees: parseInt(globalStats.rows[0].refusees) || 0,
            demandesParMois: parMois.rows,
            demandesParEmploye: parEmploye.rows.map(row => ({
                id: row.id,
                nom: row.nom,
                prenom: row.prenom,
                total: parseInt(row.total) || 0,
                approuvees: parseInt(row.approuvees) || 0,
                enAttente: parseInt(row.enAttente) || 0,
                refusees: parseInt(row.refusees) || 0
            }))
        });
        
    } catch (error) {
        console.error('Erreur manager dashboard stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ PERMISSION BALANCE (gardé pour compatibilité) ============

router.get('/permission-balance', authMiddleware, async (req, res) => {
    res.json({ used: 0, max: 4, remaining: 4 });
});

router.post('/permission-request', authMiddleware, async (req, res) => {
    res.status(400).json({ message: 'Fonctionnalité désactivée - Utilisez la demande de congé standard' });
});

router.delete('/cancel-permission/:id', authMiddleware, async (req, res) => {
    res.status(400).json({ message: 'Fonctionnalité désactivée' });
});

// ============ STATISTIQUES ÉQUIPE POUR MANAGER ============
router.get('/team-stats', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        // Récupérer les membres de l'équipe
        const teamResult = await pool.query(
            `SELECT id FROM users WHERE manager_id = $1`,
            [managerId]
        );
        
        const teamIds = teamResult.rows.map(m => m.id);
        
        if (teamIds.length === 0) {
            return res.json({
                totalRequests: 0,
                approvedRequests: 0,
                pendingRequests: 0,
                rejectedRequests: 0,
                totalDaysTaken: 0,
                requestsByEmployee: [],
                requestsByType: { CP: 0, SANS_SOLDE: 0 },
                monthlyData: []
            });
        }
        
        // Statistiques globales
        const globalStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN statut = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN statut = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN statut = 'approved' THEN nombre_jours ELSE 0 END) as total_days
            FROM demandes_conges
            WHERE utilisateur_id = ANY($1::int[])
        `, [teamIds]);
        
        // Demandes par employé
        const parEmploye = await pool.query(`
            SELECT 
                u.id, u.nom, u.prenom,
                COUNT(dc.*) as total,
                SUM(CASE WHEN dc.statut = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN dc.statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN dc.statut = 'rejected' THEN 1 ELSE 0 END) as rejected,
                COALESCE(SUM(CASE WHEN dc.statut = 'approved' THEN dc.nombre_jours ELSE 0 END), 0) as total_days
            FROM users u
            LEFT JOIN demandes_conges dc ON u.id = dc.utilisateur_id
            WHERE u.manager_id = $1
            GROUP BY u.id
            ORDER BY total DESC
        `, [managerId]);
        
        // Demandes par type (CP = type_conge_id 1, Sans solde = type_conge_id 2)
        const parType = await pool.query(`
            SELECT 
                dc.type_conge_id,
                COUNT(*) as total
            FROM demandes_conges dc
            WHERE dc.utilisateur_id = ANY($1::int[])
            GROUP BY dc.type_conge_id
        `, [teamIds]);
        
        let requestsByType = { CP: 0, SANS_SOLDE: 0 };
        parType.rows.forEach(row => {
            if (row.type_conge_id === 1) {
                requestsByType.CP = parseInt(row.total);
            } else if (row.type_conge_id === 2) {
                requestsByType.SANS_SOLDE = parseInt(row.total);
            }
        });
        
        // Demandes par mois - VERSION CORRIGÉE AVEC TOUS LES MOIS
        const currentYear = new Date().getFullYear();
        const monthlyResult = await pool.query(`
            WITH months AS (
                SELECT generate_series(1, 12) AS mois_num
            ),
            stats AS (
                SELECT 
                    EXTRACT(MONTH FROM date_debut) as mois,
                    COUNT(*) as total
                FROM demandes_conges
                WHERE utilisateur_id = ANY($1::int[])
                AND EXTRACT(YEAR FROM date_debut) = $2
                GROUP BY EXTRACT(MONTH FROM date_debut)
            )
            SELECT 
                months.mois_num as mois,
                COALESCE(stats.total, 0) as total,
                $2 as annee
            FROM months
            LEFT JOIN stats ON months.mois_num = stats.mois
            ORDER BY months.mois_num ASC
        `, [teamIds, currentYear]);
        
        res.json({
            totalRequests: parseInt(globalStats.rows[0].total) || 0,
            approvedRequests: parseInt(globalStats.rows[0].approved) || 0,
            pendingRequests: parseInt(globalStats.rows[0].pending) || 0,
            rejectedRequests: parseInt(globalStats.rows[0].rejected) || 0,
            totalDaysTaken: parseInt(globalStats.rows[0].total_days) || 0,
            requestsByEmployee: parEmploye.rows.map(row => ({
                id: row.id,
                nom: row.nom,
                prenom: row.prenom,
                total: parseInt(row.total) || 0,
                approved: parseInt(row.approved) || 0,
                pending: parseInt(row.pending) || 0,
                rejected: parseInt(row.rejected) || 0,
                totalDays: parseInt(row.total_days) || 0
            })),
            requestsByType: requestsByType,
            monthlyData: monthlyResult.rows
        });
        
    } catch (error) {
        console.error('Erreur team stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ NOTIFICATIONS ============

router.get('/notifications', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isManager = userRoles.includes('manager');
        
        let notifications = [];
        
        // 1. Notifications personnelles de l'utilisateur
        const personalNotifs = await pool.query(
            `SELECT * FROM notifications 
             WHERE utilisateur_id = $1 
             ORDER BY cree_le DESC 
             LIMIT 30`,
            [userId]
        );
        notifications.push(...personalNotifs.rows);
        
        // 2. Si manager, ajouter les notifications concernant son équipe
        if (isManager) {
            const teamNotifs = await pool.query(`
                SELECT 
                    n.*,
                    'team' as source
                FROM notifications n
                JOIN users u ON n.utilisateur_id = u.id
                WHERE u.manager_id = $1
                ORDER BY n.cree_le DESC
                LIMIT 20
            `, [userId]);
            notifications.push(...teamNotifs.rows);
            
            // Demandes en attente de validation manager
            const pendingManagerNotifs = await pool.query(`
                SELECT 
                    'demande_attente' as type,
                    'Nouvelle demande à valider' as titre,
                    CONCAT(u.prenom, ' ', u.nom, ' a fait une demande de congé') as message,
                    '/dashboard/manager/validations' as lien,
                    dc.cree_le,
                    false as est_lu
                FROM demandes_conges dc
                JOIN users u ON dc.utilisateur_id = u.id
                WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
                ORDER BY dc.cree_le DESC
            `, [userId]);
            notifications.push(...pendingManagerNotifs.rows);
        }
        
        // 3. Si admin, ajouter les notifications système
        if (isAdmin) {
            const adminNotifs = await pool.query(`
                SELECT 
                    'system' as type,
                    'Information système' as titre,
                    message,
                    lien,
                    cree_le,
                    false as est_lu
                FROM notifications
                WHERE utilisateur_id IS NULL AND type IN ('admin_broadcast', 'system')
                ORDER BY cree_le DESC
                LIMIT 10
            `);
            notifications.push(...adminNotifs.rows);
        }
        
        // Supprimer les doublons par id
        const uniqueNotifs = [];
        const seenIds = new Set();
        for (const notif of notifications) {
            if (notif.id && !seenIds.has(notif.id)) {
                seenIds.add(notif.id);
                uniqueNotifs.push(notif);
            } else if (!notif.id) {
                uniqueNotifs.push(notif);
            }
        }
        
        // Trier par date décroissante
        uniqueNotifs.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
        
        res.json(uniqueNotifs.slice(0, 30));
    } catch (error) {
        console.error('Erreur notifications:', error);
        res.json([]);
    }
});

router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await pool.query(`UPDATE notifications SET est_lu = true WHERE id = $1 AND utilisateur_id = $2`, 
            [req.params.id, req.user.id]);
        res.json({ message: 'Notification lue' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;