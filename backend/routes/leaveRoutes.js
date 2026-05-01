// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============ CONFIGURATION MULTER ============

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'justificatifs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'));
        }
    }
});

// ============ FONCTIONS UTILITAIRES ============

const validateLeaveRequest = async (userId, type_id, start_date, end_date, isModification = false, excludeRequestId = null) => {
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
    
    // CORRECTION : Vérification des chevauchements en excluant la demande en cours de modification
    let overlappingQuery;
    let overlappingParams;
    
    if (isModification && excludeRequestId) {
        // Pour une modification : exclure la demande en cours de modification
        overlappingQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 
            AND statut IN ('pending_manager', 'pending_admin', 'approved')
            AND id != $2
            AND (
                (date_debut <= $3 AND date_fin >= $3) OR
                (date_debut <= $4 AND date_fin >= $4) OR
                (date_debut >= $3 AND date_fin <= $4)
            )`;
        overlappingParams = [userId, excludeRequestId, start_date, end_date];
    } else {
        // Pour une nouvelle demande
        overlappingQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 
            AND statut IN ('pending_manager', 'pending_admin', 'approved')
            AND (
                (date_debut <= $2 AND date_fin >= $2) OR
                (date_debut <= $3 AND date_fin >= $3) OR
                (date_debut >= $2 AND date_fin <= $3)
            )`;
        overlappingParams = [userId, start_date, end_date];
    }
    
    const overlapping = await pool.query(overlappingQuery, overlappingParams);
    
    if (parseInt(overlapping.rows[0].count) > 0) {
        errors.push("Vous avez déjà une demande de congé sur cette période");
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
                tc.nom as type,
                dc.nombre_jours as duration,
                dc.statut,
                dc.motif,
                dc.motif_refus,
                dc.cree_le,
                'conges' as request_type
             FROM demandes_conges dc
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE dc.utilisateur_id = $1
             ORDER BY dc.cree_le DESC`,
            [userId]
        );
        
        const permissionsResult = await pool.query(
            `SELECT 
                dp.id,
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as start_date,
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as end_date,
                4 as type_id,
                'Permission' as type,
                dp.duree_heures as duration,
                dp.statut,
                dp.motif,
                dp.motif_refus,
                dp.cree_le,
                'permission' as request_type,
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as date_permission,
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

router.post('/request', authMiddleware, async (req, res) => {
    const { type_id, start_date, end_date, motif } = req.body;
    const userId = req.user.id;
    
    try {
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date, false, null);
        
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
                 VALUES ($1, 'demande_recue', 'Nouvelle demande de conge', 
                         $2, 
                         '/dashboard/manager/validations', NOW())`,
                [managerId, `${employe.prenom} ${employe.nom} a fait une demande de conge du ${start_date} au ${end_date} (${days} jours)`]
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

// CORRECTION PRINCIPALE : Route update-request corrigée
router.put('/update-request/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { type_id, start_date, end_date, motif } = req.body;
    
    console.log('=== UPDATE REQUEST ===');
    console.log('RequestId:', requestId);
    console.log('UserId:', userId);
    console.log('Body:', { type_id, start_date, end_date, motif });
    
    try {
        // Vérifier que la demande existe et appartient à l'utilisateur
        const requestCheck = await pool.query(
            `SELECT dc.id, dc.utilisateur_id, dc.type_conge_id, dc.date_debut, dc.date_fin, 
                    dc.nombre_jours, dc.motif, dc.statut,
                    u.manager_id, u.nom, u.prenom
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_manager'`,
            [requestId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Demande non trouvable ou déjà traitée. Seules les demandes en attente manager peuvent être modifiées.' 
            });
        }
        
        const demande = requestCheck.rows[0];
        console.log('Demande trouvée:', {
            id: demande.id,
            type_conge_id: demande.type_conge_id,
            date_debut: demande.date_debut,
            date_fin: demande.date_fin,
            statut: demande.statut
        });
        
        // CORRECTION : Valider en excluant la demande en cours de modification
        const validation = await validateLeaveRequest(
            userId, 
            type_id, 
            start_date, 
            end_date, 
            true,  // isModification = true
            parseInt(requestId)  // excludeRequestId = l'ID de la demande en cours de modification
        );
        
        if (!validation.isValid) {
            console.log('Validation échouée:', validation.errors);
            return res.status(400).json({ 
                message: "Règles non respectées",
                errors: validation.errors 
            });
        }
        
        const days = validation.days;
        const oldDates = `${demande.date_debut} -> ${demande.date_fin}`;
        
        console.log('Mise à jour:', {
            type_id,
            start_date,
            end_date,
            days,
            motif: motif || demande.motif
        });
        
        // Mettre à jour la demande
        await pool.query(
            `UPDATE demandes_conges 
             SET type_conge_id = $1, date_debut = $2, date_fin = $3, 
                 nombre_jours = $4, motif = $5, modifie_le = NOW(), statut = 'pending_manager'
             WHERE id = $6`,
            [type_id, start_date, end_date, days, motif || demande.motif, requestId]
        );
        
        // Notifier le manager du changement
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_modifiee', 'Demande de conge modifiee',
                         $2,
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `${demande.prenom} ${demande.nom} a modifie sa demande de conge (anciennement: ${oldDates}). Nouvelles dates: ${start_date} -> ${end_date}. Veuillez la revalider.`]
            );
        }
        
        console.log('Modification réussie');
        
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

// Annuler une demande de congé
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
                 VALUES ($1, 'demande_annulee', 'Demande de conge annulee',
                         $2,
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `${demande.prenom} ${demande.nom} a annule sa demande de conge (${demande.date_debut} -> ${demande.date_fin}).`]
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
                dc.id,
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                dc.nombre_jours,
                dc.motif,
                dc.statut,
                u.nom, u.prenom, u.email, u.service, 
                tc.nom as type_name,
                'conges' as request_type,
                dc.cree_le
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
             ORDER BY dc.cree_le ASC`,
            [managerId]
        );
        
        const permissionsResult = await pool.query(
            `SELECT 
                dp.id,
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as date_debut,
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as date_fin,
                dp.duree_heures as nombre_jours,
                dp.motif,
                dp.statut,
                u.nom, u.prenom, u.email, u.service,
                'Permission' as type_name,
                'permission' as request_type,
                dp.date_permission,
                dp.heure_debut,
                dp.heure_fin,
                dp.duree_heures,
                dp.cree_le
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
                 VALUES ($1, 'pre_approuve_permission', 'Permission pre-approuvee par votre manager', 
                         $2,
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id, `Votre demande de permission du ${demande.date_permission} a ete validee par votre manager. En attente de validation finale par l administrateur.`]
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
                     VALUES ($1, 'validation_permission_requise', 'Permission a valider definitivement', 
                             $2,
                             '/dashboard/admin', NOW())`,
                    [adminResult.rows[0].id, `Une demande de permission de ${demande.prenom} ${demande.nom} a ete pre-approuvee par le manager et attend votre validation finale.`]
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
                 VALUES ($1, 'pre_approuve', 'Demande pre-approuvee par votre manager', 
                         $2,
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id, `Votre demande de conge du ${demande.date_debut} au ${demande.date_fin} a ete validee par votre manager. En attente de validation finale par l administrateur.`]
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
                     VALUES ($1, 'validation_requise', 'Demande a valider definitivement', 
                             $2,
                             '/dashboard/admin', NOW())`,
                    [adminResult.rows[0].id, `Une demande de conge de ${demande.prenom} ${demande.nom} (${demande.date_debut} -> ${demande.date_fin}) a ete pre-approuvee par le manager. Veuillez la valider ou la refuser.`]
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
                 VALUES ($1, 'refus_manager_permission', 'Permission refusee par votre manager', 
                         $2,
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id, `Votre demande de permission du ${demande.date_permission} a ete refusee par votre manager.\n\nMotif : ${motifFinal}`]
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
                 VALUES ($1, 'refus_manager', 'Demande de conge refusee par votre manager', 
                         $2,
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id, `Votre demande de conge du ${demande.date_debut} au ${demande.date_fin} a ete refusee par votre manager.\n\nMotif : ${motifFinal}`]
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
                         $2,
                         '/dashboard/manager/validations', NOW())`,
                [managerId, `${employe.prenom} ${employe.nom} a fait une demande de permission le ${date_permission} de ${heure_debut} à ${heure_fin} (${duree_heures}h)`]
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
                message: 'Demande non trouvable ou déjà traitée. Impossible d annuler.' 
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
                 VALUES ($1, 'permission_annulee', 'Demande de permission annulee', 
                         $2,
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `L employe a annule sa demande de permission.`]
            );
        }
        
        res.json({ message: 'Demande de permission annulée avec succès.' });
        
    } catch (error) {
        console.error('Erreur cancel permission:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ ROUTES POUR LE MANAGER ============

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
            `SELECT 
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut, 
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin, 
                dc.statut, 
                tc.nom as type_name,
                u.nom, u.prenom, u.id as user_id, 
                'conges' as absence_type
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE u.manager_id = $1 AND dc.statut IN ('approved', 'pending_manager', 'pending_admin')
             ORDER BY dc.date_debut ASC`,
            [managerId]
        );
        
        const permissionsResult = await pool.query(
            `SELECT 
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as date_debut, 
                TO_CHAR(dp.date_permission, 'YYYY-MM-DD') as date_fin, 
                dp.statut, 
                'Permission' as type_name,
                u.nom, u.prenom, u.id as user_id, 
                'permission' as absence_type
             FROM demandes_permissions dp
             JOIN users u ON dp.utilisateur_id = u.id
             WHERE u.manager_id = $1 AND dp.statut IN ('approved', 'pending_manager', 'pending_admin')
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

// ============ UPLOAD JUSTIFICATIFS ============

router.post('/upload-justificatif', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { demandeId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }
        
        const result = await pool.query(
            `INSERT INTO justificatifs (demande_id, nom_fichier, chemin_fichier, type_fichier, taille, cree_le)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [demandeId, req.file.originalname, req.file.path, req.file.mimetype, req.file.size]
        );
        
        res.status(201).json({ 
            message: 'Justificatif uploadé avec succès',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ message: 'Erreur lors de l\'upload' });
    }
});

router.get('/justificatifs/:demandeId', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM justificatifs WHERE demande_id = $1 ORDER BY cree_le DESC`,
            [req.params.demandeId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur justificatifs:', error);
        res.json([]);
    }
});

router.get('/download-justificatif/:fileId', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM justificatifs WHERE id = $1`,
            [req.params.fileId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fichier non trouvé' });
        }
        
        const file = result.rows[0];
        res.download(file.chemin_fichier, file.nom_fichier);
    } catch (error) {
        console.error('Erreur download:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/delete-justificatif/:fileId', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM justificatifs WHERE id = $1`,
            [req.params.fileId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fichier non trouvé' });
        }
        
        const file = result.rows[0];
        
        // Supprimer le fichier physique
        if (fs.existsSync(file.chemin_fichier)) {
            fs.unlinkSync(file.chemin_fichier);
        }
        
        // Supprimer de la base
        await pool.query('DELETE FROM justificatifs WHERE id = $1', [req.params.fileId]);
        
        res.json({ message: 'Justificatif supprimé' });
    } catch (error) {
        console.error('Erreur delete justificatif:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;