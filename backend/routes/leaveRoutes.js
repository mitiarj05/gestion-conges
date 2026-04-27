// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// ============ FONCTIONS UTILITAIRES DE VALIDATION ============

const validateLeaveRequest = async (userId, type_id, start_date, end_date, isModification = false) => {
    const errors = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (start < today) {
        errors.push("La date de début ne peut pas être dans le passé");
    }
    
    if (start > end) {
        errors.push("La date de début doit être antérieure à la date de fin");
    }
    
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const typeRules = await pool.query(
        `SELECT id, code, nom, jours_par_defaut FROM types_conges WHERE id = $1`,
        [type_id]
    );
    
    if (typeRules.rows.length === 0) {
        errors.push("Type de congé invalide");
        return { isValid: false, errors };
    }
    
    const typeRule = typeRules.rows[0];
    const currentYear = new Date().getFullYear();
    
    if (type_id !== 3) {
        const soldeResult = await pool.query(
            `SELECT restant_jours FROM solde_conges 
             WHERE utilisateur_id = $1 AND annee = $2 AND type_conge_id = $3`,
            [userId, currentYear, type_id]
        );
        
        if (soldeResult.rows.length > 0) {
            const restant = parseFloat(soldeResult.rows[0].restant_jours);
            if (restant < days) {
                errors.push(`Solde insuffisant pour ${typeRule.nom}. Il vous reste ${restant} jours.`);
            }
        } else {
            errors.push(`Vous n'avez pas de solde pour ${typeRule.nom}`);
        }
    }
    
    let maxConsecutif = 20;
    if (type_id === 2) maxConsecutif = 10;
    if (type_id === 3) maxConsecutif = 5;
    
    if (days > maxConsecutif) {
        errors.push(`Vous ne pouvez pas prendre plus de ${maxConsecutif} jours consécutifs pour ${typeRule.nom}`);
    }
    
    let preavisMin = 2;
    if (type_id === 2) preavisMin = 1;
    if (type_id === 3) preavisMin = 5;
    
    const preavisDate = new Date();
    preavisDate.setDate(preavisDate.getDate() + preavisMin);
    if (start < preavisDate && !isModification) {
        errors.push(`Vous devez faire votre demande au moins ${preavisMin} jours à l'avance`);
    }
    
    const overlapping = await pool.query(
        `SELECT COUNT(*) FROM demandes_conges 
         WHERE utilisateur_id = $1 
         AND statut IN ('pending_manager', 'pending_admin', 'approved')
         AND id != $2
         AND (
            (date_debut <= $3 AND date_fin >= $3) OR
            (date_debut <= $4 AND date_fin >= $4) OR
            (date_debut >= $3 AND date_fin <= $4)
         )`,
        [userId, isModification ? 0 : -1, start_date, end_date]
    );
    
    if (parseInt(overlapping.rows[0].count) > 0) {
        errors.push("Vous avez déjà une demande de congé sur cette période");
    }
    
    const lastRequest = await pool.query(
        `SELECT date_fin FROM demandes_conges 
         WHERE utilisateur_id = $1 
         AND statut IN ('approved', 'pending_manager', 'pending_admin')
         AND id != $2
         ORDER BY date_fin DESC LIMIT 1`,
        [userId, isModification ? 0 : -1]
    );
    
    if (lastRequest.rows.length > 0 && !isModification) {
        const lastEnd = new Date(lastRequest.rows[0].date_fin);
        const minGap = new Date(lastEnd);
        minGap.setDate(minGap.getDate() + 7);
        if (start < minGap) {
            errors.push("Vous devez attendre 7 jours entre deux demandes de congé");
        }
    }
    
    const yearTotal = await pool.query(
        `SELECT SUM(nombre_jours) as total 
         FROM demandes_conges 
         WHERE utilisateur_id = $1 
         AND EXTRACT(YEAR FROM date_debut) = $2
         AND statut IN ('approved', 'pending_manager', 'pending_admin')
         AND id != $3`,
        [userId, currentYear, isModification ? 0 : -1]
    );
    
    const totalUsed = parseFloat(yearTotal.rows[0].total) || 0;
    const maxAnnual = 30;
    if (totalUsed + days > maxAnnual && type_id !== 3) {
        errors.push(`Vous dépassez le plafond annuel de ${maxAnnual} jours de congé (tous types confondus)`);
    }
    
    return { isValid: errors.length === 0, errors, days, typeRule };
};

// ============ SOLDE DE L'UTILISATEUR ============

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();
        
        const result = await pool.query(
            `SELECT sc.*, tc.nom as type_name, tc.code
             FROM solde_conges sc
             JOIN types_conges tc ON sc.type_conge_id = tc.id
             WHERE sc.utilisateur_id = $1 AND sc.annee = $2`,
            [userId, currentYear]
        );
        
        const balance = {
            cp_total: 0, cp_pris: 0, cp_restant: 0,
            rtt_total: 0, rtt_pris: 0, rtt_restant: 0,
            ss_total: 0, ss_pris: 0, ss_restant: 0,
            permission: 0
        };
        
        result.rows.forEach(row => {
            const typeCode = row.code;
            const total = parseFloat(row.total_jours) || 0;
            const pris = parseFloat(row.pris_jours) || 0;
            const restant = parseFloat(row.restant_jours) || 0;
            
            if (typeCode === 'CP') {
                balance.cp_total = total;
                balance.cp_pris = pris;
                balance.cp_restant = restant;
            } else if (typeCode === 'RTT') {
                balance.rtt_total = total;
                balance.rtt_pris = pris;
                balance.rtt_restant = restant;
            } else if (typeCode === 'SS') {
                balance.ss_total = total;
                balance.ss_pris = pris;
                balance.ss_restant = restant;
            }
        });
        
        const currentMonth = new Date().getMonth() + 1;
        const currentYearForPerm = new Date().getFullYear();
        
        const permissionResult = await pool.query(
            `SELECT COALESCE(SUM(duree_heures), 0) as total_used
             FROM demandes_permissions
             WHERE utilisateur_id = $1 
             AND EXTRACT(MONTH FROM date_permission) = $2
             AND EXTRACT(YEAR FROM date_permission) = $3
             AND statut = 'approved'`,
            [userId, currentMonth, currentYearForPerm]
        );
        
        const usedHours = parseFloat(permissionResult.rows[0].total_used) || 0;
        balance.permission = Math.max(0, 4 - usedHours);
        
        res.json(balance);
    } catch (error) {
        console.error('Erreur balance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ MES DEMANDES (CONGÉS + PERMISSIONS) ============

router.get('/my-requests', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT 
                dc.id,
                dc.date_debut as start_date,
                dc.date_fin as end_date,
                dc.type_conge_id as type_id,
                tc.nom as type,
                dc.nombre_jours as duration,
                dc.statut,
                dc.motif,
                dc.motif_refus,
                dc.cree_le,
                'conges' as request_type,
                NULL as date_permission,
                NULL as heure_debut,
                NULL as heure_fin,
                NULL as duree_heures
             FROM demandes_conges dc
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE dc.utilisateur_id = $1
             ORDER BY dc.cree_le DESC`,
            [userId]
        );
        
        const permissionsResult = await pool.query(
            `SELECT 
                dp.id,
                dp.date_permission as start_date,
                dp.date_permission as end_date,
                4 as type_id,
                'Permission' as type,
                dp.duree_heures as duration,
                dp.statut,
                dp.motif,
                dp.motif_refus,
                dp.cree_le,
                'permission' as request_type,
                dp.date_permission,
                dp.heure_debut,
                dp.heure_fin,
                dp.duree_heures
             FROM demandes_permissions dp
             WHERE dp.utilisateur_id = $1
             ORDER BY dp.cree_le DESC`,
            [userId]
        );
        
        const allRequests = [...congesResult.rows, ...permissionsResult.rows];
        allRequests.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
        
        res.json(allRequests);
    } catch (error) {
        console.error('Erreur my-requests:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ DEMANDE DE CONGÉ ============

router.get('/request/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;
        
        const result = await pool.query(
            `SELECT dc.*, tc.nom as type_name
             FROM demandes_conges dc
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE dc.id = $1 AND dc.utilisateur_id = $2`,
            [requestId, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur get request:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/request', authMiddleware, async (req, res) => {
    const { type_id, start_date, end_date, motif } = req.body;
    const userId = req.user.id;
    
    try {
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date);
        
        if (!validation.isValid) {
            return res.status(400).json({ 
                message: "Règles non respectées",
                errors: validation.errors 
            });
        }
        
        const days = validation.days;
        
        const result = await pool.query(
            `INSERT INTO demandes_conges 
             (utilisateur_id, type_conge_id, date_debut, date_fin, nombre_jours, motif, statut)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending_manager')
             RETURNING id`,
            [userId, type_id, start_date, end_date, days, motif]
        );
        
        const managerResult = await pool.query(
            `SELECT manager_id FROM users WHERE id = $1`,
            [userId]
        );
        
        const managerId = managerResult.rows[0]?.manager_id;
        
        if (managerId) {
            const userInfo = await pool.query(
                `SELECT nom, prenom FROM users WHERE id = $1`,
                [userId]
            );
            const employe = userInfo.rows[0];
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_recue', 'Nouvelle demande de congé', 
                         '${employe.prenom} ${employe.nom} a fait une demande de congé du ${start_date} au ${end_date} (${days} jours)', 
                         '/dashboard/manager/validations', NOW())`,
                [managerId]
            );
        }
        
        res.status(201).json({ 
            message: 'Demande créée avec succès, en attente de validation par votre manager',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Erreur create request:', error);
        res.status(500).json({ message: 'Erreur lors de la création: ' + error.message });
    }
});

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
            return res.status(404).json({ 
                message: 'Demande non trouvable ou déjà traitée. Seules les demandes en attente peuvent être modifiées.' 
            });
        }
        
        const demande = requestCheck.rows[0];
        
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date, true);
        
        if (!validation.isValid) {
            return res.status(400).json({ 
                message: "Règles non respectées",
                errors: validation.errors 
            });
        }
        
        const days = validation.days;
        const oldDates = `${demande.date_debut} -> ${demande.date_fin}`;
        
        await pool.query(
            `UPDATE demandes_conges 
             SET type_conge_id = $1, date_debut = $2, date_fin = $3, 
                 nombre_jours = $4, motif = $5, modifie_le = NOW()
             WHERE id = $6`,
            [type_id, start_date, end_date, days, motif || demande.motif, requestId]
        );
        
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_modifiee', 'Demande de congé modifiée',
                         '${demande.prenom} ${demande.nom} a modifié sa demande de congé (anciennement: ${oldDates}). Veuillez la revalider.',
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id]
            );
        }
        
        res.json({ 
            message: 'Demande modifiée avec succès. Votre manager a été notifié du changement.',
            old_dates: oldDates,
            new_dates: `${start_date} -> ${end_date}`
        });
        
    } catch (error) {
        console.error('Erreur update request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

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
            return res.status(404).json({ 
                message: 'Demande non trouvable ou déjà traitée. Impossible d annuler.' 
            });
        }
        
        const demande = requestCheck.rows[0];
        
        await pool.query(
            `DELETE FROM demandes_conges WHERE id = $1`,
            [requestId]
        );
        
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_annulee', 'Demande de congé annulée',
                         '${demande.prenom} ${demande.nom} a annulé sa demande de congé (${demande.date_debut} -> ${demande.date_fin}).',
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id]
            );
        }
        
        res.json({ message: 'Demande annulée avec succès.' });
        
    } catch (error) {
        console.error('Erreur cancel request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ VALIDATION PAR MANAGER ============

router.get('/team-pending', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT 
                dc.*, 
                u.nom, u.prenom, u.email, u.service, 
                tc.nom as type_name,
                'conges' as request_type
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
             ORDER BY dc.cree_le ASC`,
            [managerId]
        );
        
        const permissionsResult = await pool.query(
            `SELECT 
                dp.*,
                u.nom, u.prenom, u.email, u.service,
                'Permission' as type_name,
                'permission' as request_type,
                dp.date_permission as date_debut,
                dp.date_permission as date_fin,
                dp.duree_heures as nombre_jours
             FROM demandes_permissions dp
             JOIN users u ON dp.utilisateur_id = u.id
             WHERE u.manager_id = $1 AND dp.statut = 'pending_manager'
             ORDER BY dp.cree_le ASC`,
            [managerId]
        );
        
        const allPending = [...congesResult.rows, ...permissionsResult.rows];
        allPending.sort((a, b) => new Date(a.cree_le) - new Date(b.cree_le));
        
        res.json(allPending);
    } catch (error) {
        console.error('Erreur team pending:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/manager-approve/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { request_type } = req.body;
    
    try {
        if (request_type === 'permission') {
            const requestResult = await pool.query(
                `SELECT dp.*, u.manager_id, u.nom, u.prenom, u.email
                 FROM demandes_permissions dp
                 JOIN users u ON dp.utilisateur_id = u.id
                 WHERE dp.id = $1 AND dp.statut = 'pending_manager'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            if (demande.manager_id !== managerId) {
                return res.status(403).json({ message: 'Vous n\'êtes pas le manager de cet employé' });
            }
            
            await pool.query(
                `UPDATE demandes_permissions 
                 SET statut = 'pending_admin', approbateur_id = $1, date_approbation = NOW()
                 WHERE id = $2`,
                [managerId, requestId]
            );
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'pre_approuve_permission', 'Permission pré-approuvée par votre manager', 
                         'Votre demande de permission du ${demande.date_permission} a été validée par votre manager. En attente de validation finale par l\'administrateur.', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            const adminResult = await pool.query(
                `SELECT u.id FROM users u
                 JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
                 JOIN roles r ON ur.role_id = r.id
                 WHERE r.nom = 'admin'
                 LIMIT 1`
            );
            
            if (adminResult.rows.length > 0) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'validation_permission_requise', 'Permission à valider définitivement', 
                             'Une demande de permission de ${demande.prenom} ${demande.nom} a été pré-approuvée par le manager et attend votre validation finale.', 
                             '/dashboard/admin', NOW())`,
                    [adminResult.rows[0].id]
                );
            }
            
            res.json({ message: 'Permission pré-approuvée, en attente de validation finale par l\'administrateur' });
            
        } else {
            const requestResult = await pool.query(
                `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.statut = 'pending_manager'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            if (demande.manager_id !== managerId) {
                return res.status(403).json({ message: 'Vous n\'êtes pas le manager de cet employé' });
            }
            
            await pool.query(
                `UPDATE demandes_conges 
                 SET statut = 'pending_admin', approbateur_id = $1, date_approbation = NOW()
                 WHERE id = $2`,
                [managerId, requestId]
            );
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'pre_approuve', 'Demande pré-approuvée par votre manager', 
                         'Votre demande de congé du ${demande.date_debut} au ${demande.date_fin} a été validée par votre manager. En attente de validation finale par l\'administrateur.', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            const adminResult = await pool.query(
                `SELECT u.id FROM users u
                 JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
                 JOIN roles r ON ur.role_id = r.id
                 WHERE r.nom = 'admin'
                 LIMIT 1`
            );
            
            if (adminResult.rows.length > 0) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'validation_requise', 'Demande à valider définitivement', 
                             'Une demande de congé de ${demande.prenom} ${demande.nom} (${demande.date_debut} -> ${demande.date_fin}) a été pré-approuvée par le manager. Veuillez la valider ou la refuser.',
                             '/dashboard/admin', NOW())`,
                    [adminResult.rows[0].id]
                );
            }
            
            res.json({ message: 'Demande pré-approuvée, en attente de validation finale par l\'administrateur' });
        }
        
    } catch (error) {
        console.error('Erreur manager approve:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

router.put('/manager-reject/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { motif, request_type } = req.body;
    const motifFinal = motif || 'Non spécifié';
    
    try {
        if (request_type === 'permission') {
            const requestResult = await pool.query(
                `SELECT dp.*, u.manager_id, u.nom, u.prenom, u.email
                 FROM demandes_permissions dp
                 JOIN users u ON dp.utilisateur_id = u.id
                 WHERE dp.id = $1 AND dp.statut = 'pending_manager'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            if (demande.manager_id !== managerId) {
                return res.status(403).json({ message: 'Vous n\'êtes pas le manager de cet employé' });
            }
            
            await pool.query(
                `UPDATE demandes_permissions 
                 SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
                 WHERE id = $3`,
                [managerId, motifFinal, requestId]
            );
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'refus_manager_permission', 'Permission refusée par votre manager', 
                         'Votre demande de permission du ${demande.date_permission} a été refusée par votre manager.\n\nMotif : ${motifFinal}', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            res.json({ message: 'Permission refusée', motif: motifFinal });
            
        } else {
            const requestResult = await pool.query(
                `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.statut = 'pending_manager'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            if (demande.manager_id !== managerId) {
                return res.status(403).json({ message: 'Vous n\'êtes pas le manager de cet employé' });
            }
            
            await pool.query(
                `UPDATE demandes_conges 
                 SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
                 WHERE id = $3`,
                [managerId, motifFinal, requestId]
            );
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'refus_manager', 'Demande de congé refusée par votre manager', 
                         'Votre demande de congé du ${demande.date_debut} au ${demande.date_fin} a été refusée par votre manager.\n\nMotif : ${motifFinal}', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            res.json({ message: 'Demande refusée', motif: motifFinal });
        }
        
    } catch (error) {
        console.error('Erreur manager reject:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ NOTIFICATIONS ============

router.get('/notifications', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT * FROM notifications 
             WHERE utilisateur_id = $1 
             ORDER BY cree_le DESC 
             LIMIT 20`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur notifications:', error);
        res.json([]);
    }
});

router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET est_lu = true, lu_le = NOW() 
             WHERE id = $1 AND utilisateur_id = $2`,
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notification marquée comme lue' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ GESTION DES PERMISSIONS ============

router.get('/permission-balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const usedResult = await pool.query(
            `SELECT COALESCE(SUM(duree_heures), 0) as total_used
             FROM demandes_permissions
             WHERE utilisateur_id = $1 
             AND EXTRACT(MONTH FROM date_permission) = $2
             AND EXTRACT(YEAR FROM date_permission) = $3
             AND statut = 'approved'`,
            [userId, currentMonth, currentYear]
        );
        
        const usedHours = parseFloat(usedResult.rows[0].total_used) || 0;
        const maxHours = 4;
        const remainingHours = Math.max(0, maxHours - usedHours);
        
        res.json({
            used: usedHours,
            max: maxHours,
            remaining: remainingHours,
            permission: remainingHours
        });
    } catch (error) {
        console.error('Erreur permission-balance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/permission-request', authMiddleware, async (req, res) => {
    const { date_permission, heure_debut, heure_fin, duree_heures, motif } = req.body;
    const userId = req.user.id;
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const permissionDate = new Date(date_permission);
        
        if (permissionDate < today) {
            return res.status(400).json({ 
                message: "La date de permission ne peut pas être dans le passé" 
            });
        }
        
        if (duree_heures <= 0 || duree_heures > 4) {
            return res.status(400).json({ 
                message: "La durée de permission doit être comprise entre 0 et 4 heures" 
            });
        }
        
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const usedResult = await pool.query(
            `SELECT COALESCE(SUM(duree_heures), 0) as total_used
             FROM demandes_permissions
             WHERE utilisateur_id = $1 
             AND EXTRACT(MONTH FROM date_permission) = $2
             AND EXTRACT(YEAR FROM date_permission) = $3
             AND statut IN ('pending_manager', 'pending_admin', 'approved')`,
            [userId, currentMonth, currentYear]
        );
        
        const usedHours = parseFloat(usedResult.rows[0].total_used) || 0;
        const maxHours = 4;
        
        if (usedHours + duree_heures > maxHours) {
            return res.status(400).json({ 
                message: `Vous dépassez le quota mensuel de ${maxHours} heures. Il vous reste ${maxHours - usedHours} heures.` 
            });
        }
        
        const typePermissionResult = await pool.query(
            `SELECT id FROM types_permissions WHERE actif = true LIMIT 1`
        );
        
        let typePermissionId = 1;
        if (typePermissionResult.rows.length > 0) {
            typePermissionId = typePermissionResult.rows[0].id;
        }
        
        const result = await pool.query(
            `INSERT INTO demandes_permissions 
             (utilisateur_id, type_permission_id, date_permission, heure_debut, heure_fin, duree_heures, motif, statut, cree_le)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_manager', NOW())
             RETURNING id`,
            [userId, typePermissionId, date_permission, heure_debut, heure_fin, duree_heures, motif]
        );
        
        const managerResult = await pool.query(
            `SELECT manager_id FROM users WHERE id = $1`,
            [userId]
        );
        
        const managerId = managerResult.rows[0]?.manager_id;
        
        if (managerId) {
            const userInfo = await pool.query(
                `SELECT nom, prenom FROM users WHERE id = $1`,
                [userId]
            );
            const employe = userInfo.rows[0];
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'permission_recue', 'Nouvelle demande de permission', 
                         '${employe.prenom} ${employe.nom} a fait une demande de permission le ${date_permission} de ${heure_debut} à ${heure_fin} (${duree_heures}h)', 
                         '/dashboard/manager/validations', NOW())`,
                [managerId]
            );
        }
        
        res.status(201).json({ 
            message: 'Demande de permission envoyée avec succès !',
            id: result.rows[0].id
        });
        
    } catch (error) {
        console.error('Erreur permission request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

router.delete('/cancel-permission/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.user.id;
    
    try {
        const requestCheck = await pool.query(
            `SELECT dp.*, u.manager_id
             FROM demandes_permissions dp
             JOIN users u ON dp.utilisateur_id = u.id
             WHERE dp.id = $1 AND dp.utilisateur_id = $2 AND dp.statut = 'pending_manager'`,
            [requestId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Demande non trouvable ou déjà traitée. Impossible d\'annuler.' 
            });
        }
        
        const demande = requestCheck.rows[0];
        
        await pool.query(
            `DELETE FROM demandes_permissions WHERE id = $1`,
            [requestId]
        );
        
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'permission_annulee', 'Demande de permission annulée', 
                         'L\'employé a annulé sa demande de permission.',
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id]
            );
        }
        
        res.json({ message: 'Demande de permission annulée avec succès.' });
        
    } catch (error) {
        console.error('Erreur cancel permission:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ ROUTES POUR LE MANAGER (STATS + ABSENCES) ============

router.get('/team-stats', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const teamResult = await pool.query(
            `SELECT id, nom, prenom FROM users WHERE manager_id = $1`,
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
                requestsByType: { CP: 0, RTT: 0, SS: 0 }
            });
        }
        
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN statut = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN statut = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN statut = 'approved' THEN nombre_jours ELSE 0 END) as total_days
             FROM demandes_conges 
             WHERE utilisateur_id = ANY($1::int[])`,
            [teamIds]
        );
        
        const byEmployeeResult = await pool.query(
            `SELECT u.id, u.nom, u.prenom,
                COUNT(dc.*) as total,
                SUM(CASE WHEN dc.statut = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN dc.statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN dc.statut = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN dc.statut = 'approved' THEN dc.nombre_jours ELSE 0 END) as total_days
             FROM users u
             LEFT JOIN demandes_conges dc ON u.id = dc.utilisateur_id
             WHERE u.manager_id = $1
             GROUP BY u.id
             ORDER BY u.nom`,
            [managerId]
        );
        
        const byTypeResult = await pool.query(
            `SELECT tc.code, COUNT(dc.*) as count
             FROM demandes_conges dc
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE dc.utilisateur_id = ANY($1::int[])
             GROUP BY tc.code`,
            [teamIds]
        );
        
        const requestsByType = { CP: 0, RTT: 0, SS: 0 };
        byTypeResult.rows.forEach(row => {
            if (row.code === 'CP') requestsByType.CP = parseInt(row.count);
            else if (row.code === 'RTT') requestsByType.RTT = parseInt(row.count);
            else if (row.code === 'SS') requestsByType.SS = parseInt(row.count);
        });
        
        res.json({
            totalRequests: parseInt(statsResult.rows[0].total) || 0,
            approvedRequests: parseInt(statsResult.rows[0].approved) || 0,
            pendingRequests: parseInt(statsResult.rows[0].pending) || 0,
            rejectedRequests: parseInt(statsResult.rows[0].rejected) || 0,
            totalDaysTaken: parseFloat(statsResult.rows[0].total_days) || 0,
            requestsByEmployee: byEmployeeResult.rows.map(row => ({
                id: row.id,
                nom: row.nom,
                prenom: row.prenom,
                total: parseInt(row.total) || 0,
                approved: parseInt(row.approved) || 0,
                pending: parseInt(row.pending) || 0,
                rejected: parseInt(row.rejected) || 0,
                totalDays: parseFloat(row.total_days) || 0
            })),
            requestsByType
        });
        
    } catch (error) {
        console.error('Erreur team stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/team-absences', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT dc.date_debut, dc.date_fin, dc.statut, tc.nom as type_name,
                    u.nom, u.prenom, u.id as user_id, 'conges' as absence_type
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE u.manager_id = $1
             ORDER BY dc.date_debut ASC`,
            [managerId]
        );
        
        const permissionsResult = await pool.query(
            `SELECT dp.date_permission as date_debut, dp.date_permission as date_fin, dp.statut, 'Permission' as type_name,
                    u.nom, u.prenom, u.id as user_id, 'permission' as absence_type
             FROM demandes_permissions dp
             JOIN users u ON dp.utilisateur_id = u.id
             WHERE u.manager_id = $1
             ORDER BY dp.date_permission ASC`,
            [managerId]
        );
        
        const allAbsences = [...congesResult.rows, ...permissionsResult.rows];
        res.json(allAbsences);
        
    } catch (error) {
        console.error('Erreur team absences:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;