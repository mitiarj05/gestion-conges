// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configuration multer pour les fichiers en mémoire
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté'), false);
        }
    }
});

// Import des fonctions email
const { 
    sendNewRequestToManagerEmail,
    sendManagerApprovalEmail,
    sendManagerRejectionEmail,
    sendAdminNewRequestEmail,
    sendEmail
} = require('../utils/emailService');

// ============ CONFIGURATION DES RÈGLES ============
const REGLES = {
    DELAI_MINIMUM_JOURS: 7,                     // Délai minimum entre deux demandes de congé
    MAX_CONGES_CONSECUTIFS_CP: 20,              // Max jours consécutifs pour les CP
    MAX_CONGES_CONSECUTIFS_SANS_SOLDE: 5,       // Max jours consécutifs pour le sans solde
    MAX_PERMISSION_HEURES: 4,                   // Max heures pour une permission
    MAX_PERMISSION_PAR_MOIS: 2,                 // Max permissions par mois
    PREAVIS_CP: 2,                              // Préavis minimum pour les CP (jours)
    PREAVIS_SANS_SOLDE: 1,                      // Préavis minimum pour le sans solde (jours)
    PREAVIS_PERMISSION: 24,                     // Préavis minimum pour une permission (heures)
    JOURS_CP_PAR_AN: 25,                        // Nombre de jours de CP par an
};

// ============ FONCTION DE VALIDATION AVEC PERMISSIONS ============

const validateLeaveRequest = async (userId, type_id, start_date, end_date, isModification = false, excludeRequestId = null, isPermission = false, duree_heures = null, date_permission = null) => {
    const errors = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ============ VALIDATION POUR PERMISSION ============
    if (isPermission || type_id === 3) {
        // Vérifier que la date de permission est fournie
        if (!date_permission) {
            errors.push("La date de la permission est requise");
            return { isValid: false, errors, days: 0 };
        }
        
        const permDate = new Date(date_permission);
        permDate.setHours(0, 0, 0, 0);
        
        // 1. Vérification : Date de permission pas dans le passé
        if (permDate < today) {
            errors.push("La date de permission ne peut pas être dans le passé");
        }
        
        // 2. Vérification : Durée maximale (4 heures)
        if (duree_heures && duree_heures > REGLES.MAX_PERMISSION_HEURES) {
            errors.push(`La permission ne peut pas dépasser ${REGLES.MAX_PERMISSION_HEURES} heures (vous demandez ${duree_heures} heures)`);
        }
        
        // 3. Vérification : Préavis minimum (24h)
        const preavisDate = new Date();
        preavisDate.setHours(preavisDate.getHours() + REGLES.PREAVIS_PERMISSION);
        
        if (permDate < preavisDate && !isModification) {
            errors.push(`Vous devez faire votre demande de permission au moins ${REGLES.PREAVIS_PERMISSION} heures à l'avance`);
        }
        
        // 4. Vérification : Nombre max de permissions par mois
        if (!isModification) {
            const debutMois = new Date(permDate.getFullYear(), permDate.getMonth(), 1);
            const finMois = new Date(permDate.getFullYear(), permDate.getMonth() + 1, 0);
            
            const permissionCountQuery = `
                SELECT COUNT(*) as total
                FROM demandes_conges 
                WHERE utilisateur_id = $1 
                  AND type_conge_id = 3
                  AND statut IN ('pending_manager', 'pending_admin', 'approved')
                  AND date_permission >= $2
                  AND date_permission <= $3
            `;
            const permissionParams = [userId, debutMois, finMois];
            
            if (isModification && excludeRequestId) {
                const permissionCountQueryWithExclude = `
                    SELECT COUNT(*) as total
                    FROM demandes_conges 
                    WHERE utilisateur_id = $1 
                      AND type_conge_id = 3
                      AND statut IN ('pending_manager', 'pending_admin', 'approved')
                      AND date_permission >= $2
                      AND date_permission <= $3
                      AND id != $4
                `;
                const permissionCountResult = await pool.query(permissionCountQueryWithExclude, [...permissionParams, excludeRequestId]);
                const count = parseInt(permissionCountResult.rows[0].total);
                if (count >= REGLES.MAX_PERMISSION_PAR_MOIS) {
                    errors.push(`Vous avez déjà ${count} permission(s) ce mois-ci. Maximum ${REGLES.MAX_PERMISSION_PAR_MOIS} par mois.`);
                }
            } else {
                const permissionCountResult = await pool.query(permissionCountQuery, permissionParams);
                const count = parseInt(permissionCountResult.rows[0].total);
                if (count >= REGLES.MAX_PERMISSION_PAR_MOIS) {
                    errors.push(`Vous avez déjà ${count} permission(s) ce mois-ci. Maximum ${REGLES.MAX_PERMISSION_PAR_MOIS} par mois.`);
                }
            }
        }
        
        // 5. Vérification : Chevauchement avec d'autres demandes (permissions uniquement)
        let overlappingQuery;
        let overlappingParams;
        
        if (isModification && excludeRequestId) {
            overlappingQuery = `
                SELECT COUNT(*) FROM demandes_conges 
                WHERE utilisateur_id = $1 
                  AND statut IN ('pending_manager', 'pending_admin', 'approved')
                  AND type_conge_id = 3
                  AND id != $2
                  AND date_permission = $3
            `;
            overlappingParams = [userId, excludeRequestId, date_permission];
        } else {
            overlappingQuery = `
                SELECT COUNT(*) FROM demandes_conges 
                WHERE utilisateur_id = $1 
                  AND statut IN ('pending_manager', 'pending_admin', 'approved')
                  AND type_conge_id = 3
                  AND date_permission = $2
            `;
            overlappingParams = [userId, date_permission];
        }
        
        const overlapping = await pool.query(overlappingQuery, overlappingParams);
        if (parseInt(overlapping.rows[0].count) > 0) {
            errors.push("Vous avez déjà une demande de permission pour cette date");
        }
        
        // 6. Vérification : Chevauchement avec un congé sur la même date
        const congeOverlapQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 
              AND statut IN ('pending_manager', 'pending_admin', 'approved')
              AND type_conge_id IN (1, 2)
              AND id != $2
              AND date_debut <= $3 AND date_fin >= $3
        `;
        const congeParams = isModification && excludeRequestId 
            ? [userId, excludeRequestId, date_permission]
            : [userId, null, date_permission];
        
        const congeOverlap = await pool.query(congeOverlapQuery, congeParams);
        if (parseInt(congeOverlap.rows[0].count) > 0) {
            errors.push("Vous avez déjà un congé sur cette date");
        }
        
        return { isValid: errors.length === 0, errors, days: duree_heures || 0 };
    }
    
    // ============ VALIDATION POUR CONGÉ (CP et Sans solde) ============
    
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    // 1. Vérification : Date de début pas dans le passé
    if (start < today) {
        errors.push("La date de début ne peut pas être dans le passé");
    }
    
    // 2. Vérification : Date de début antérieure à la date de fin
    if (start > end) {
        errors.push("La date de début doit être antérieure à la date de fin");
    }
    
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // 3. Vérification : Durée maximale selon le type
    const maxConsecutif = (type_id === 2) ? REGLES.MAX_CONGES_CONSECUTIFS_SANS_SOLDE : REGLES.MAX_CONGES_CONSECUTIFS_CP;
    
    if (days > maxConsecutif) {
        const typeNom = (type_id === 1) ? "Congés Payés" : "Congé sans solde";
        errors.push(`${typeNom} : maximum ${maxConsecutif} jours consécutifs (vous demandez ${days} jours)`);
    }
    
    // 4. Vérification : Préavis minimum
    const preavisMin = (type_id === 2) ? REGLES.PREAVIS_SANS_SOLDE : REGLES.PREAVIS_CP;
    const preavisDate = new Date();
    preavisDate.setDate(preavisDate.getDate() + preavisMin);
    
    if (start < preavisDate && !isModification) {
        errors.push(`Vous devez faire votre demande au moins ${preavisMin} jours à l'avance`);
    }
    
    // 5. Vérification : Solde CP suffisant
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
                errors.push(`Solde CP insuffisant. Il vous reste ${restant} jours sur ${REGLES.JOURS_CP_PAR_AN}.`);
            }
        } else {
            errors.push("Solde CP non trouvé. Contactez l'administrateur.");
        }
    }
    
    // 6. Vérification : Pas de chevauchement avec d'autres demandes (congés)
    let overlappingQuery;
    let overlappingParams;
    
    if (isModification && excludeRequestId) {
        overlappingQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 AND statut IN ('pending_manager', 'pending_admin', 'approved')
            AND id != $2
            AND type_conge_id IN (1, 2)
            AND ((date_debut <= $3 AND date_fin >= $3) 
                 OR (date_debut <= $4 AND date_fin >= $4) 
                 OR (date_debut >= $3 AND date_fin <= $4))`;
        overlappingParams = [userId, excludeRequestId, start_date, end_date];
    } else {
        overlappingQuery = `
            SELECT COUNT(*) FROM demandes_conges 
            WHERE utilisateur_id = $1 AND statut IN ('pending_manager', 'pending_admin', 'approved')
            AND type_conge_id IN (1, 2)
            AND ((date_debut <= $2 AND date_fin >= $2) 
                 OR (date_debut <= $3 AND date_fin >= $3) 
                 OR (date_debut >= $2 AND date_fin <= $3))`;
        overlappingParams = [userId, start_date, end_date];
    }
    
    const overlapping = await pool.query(overlappingQuery, overlappingParams);
    
    if (parseInt(overlapping.rows[0].count) > 0) {
        errors.push("Vous avez déjà une demande de congé sur cette période");
    }
    
    // 7. Vérification : Chevauchement avec une permission sur la période
    const permissionOverlapQuery = `
        SELECT COUNT(*) FROM demandes_conges 
        WHERE utilisateur_id = $1 
          AND statut IN ('pending_manager', 'pending_admin', 'approved')
          AND type_conge_id = 3
          AND id != $2
          AND date_permission >= $3 AND date_permission <= $4
    `;
    const permissionParams = isModification && excludeRequestId 
        ? [userId, excludeRequestId, start_date, end_date]
        : [userId, null, start_date, end_date];
    
    const permissionOverlap = await pool.query(permissionOverlapQuery, permissionParams);
    if (parseInt(permissionOverlap.rows[0].count) > 0) {
        errors.push("Vous avez une permission sur cette période");
    }
    
    // ============ 8. DÉLAI MINIMUM ENTRE DEUX DEMANDES ============
    const DELAI_MINIMUM = REGLES.DELAI_MINIMUM_JOURS;
    
    // Récupérer la dernière demande approuvée ou en attente (sauf celle qu'on modifie)
    let lastRequestQuery = `
        SELECT date_fin, statut, type_conge_id 
        FROM demandes_conges 
        WHERE utilisateur_id = $1 
          AND statut IN ('pending_manager', 'pending_admin', 'approved')
          AND type_conge_id IN (1, 2)
    `;
    
    let lastRequestParams = [userId];
    
    if (isModification && excludeRequestId) {
        lastRequestQuery += ` AND id != $2`;
        lastRequestParams.push(excludeRequestId);
    }
    
    lastRequestQuery += ` ORDER BY date_fin DESC LIMIT 1`;
    
    const lastRequest = await pool.query(lastRequestQuery, lastRequestParams);
    
    if (lastRequest.rows.length > 0) {
        const lastEndDate = new Date(lastRequest.rows[0].date_fin);
        const newStartDate = new Date(start_date);
        
        const daysBetween = Math.ceil((newStartDate - lastEndDate) / (1000 * 60 * 60 * 24));
        
        if (daysBetween < DELAI_MINIMUM) {
            const nextPossibleDate = new Date(lastEndDate);
            nextPossibleDate.setDate(nextPossibleDate.getDate() + DELAI_MINIMUM);
            
            const lastEndFormatted = lastEndDate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const nextPossibleFormatted = nextPossibleDate.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            errors.push(`⚠️ Délai minimum de ${DELAI_MINIMUM} jours entre deux congés.`);
            errors.push(`   Votre dernier congé s'est terminé le ${lastEndFormatted}.`);
            errors.push(`   Prochaine date possible : ${nextPossibleFormatted}.`);
            errors.push(`   (${daysBetween} jour(s) écoulé(s) sur ${DELAI_MINIMUM} requis)`);
        }
    }
    
    return { isValid: errors.length === 0, errors, days };
};

// ============ SOLDE ============

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();
        
        const cpResult = await pool.query(
            `SELECT total_jours, pris_jours, restant_jours 
             FROM solde_conges 
             WHERE utilisateur_id = $1 AND annee = $2 AND type_conge_id = 1`,
            [userId, currentYear]
        );
        
        let cp_total = REGLES.JOURS_CP_PAR_AN, cp_pris = 0, cp_restant = REGLES.JOURS_CP_PAR_AN;
        
        if (cpResult.rows.length > 0) {
            cp_total = parseFloat(cpResult.rows[0].total_jours) || REGLES.JOURS_CP_PAR_AN;
            cp_pris = parseFloat(cpResult.rows[0].pris_jours) || 0;
            cp_restant = parseFloat(cpResult.rows[0].restant_jours) || REGLES.JOURS_CP_PAR_AN;
        }
        
        // Récupérer les permissions du mois en cours
        const now = new Date();
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const permissionsResult = await pool.query(
            `SELECT COUNT(*) as total, COALESCE(SUM(duree_heures), 0) as total_heures
             FROM demandes_conges 
             WHERE utilisateur_id = $1 
               AND type_conge_id = 3
               AND statut IN ('approved')
               AND date_permission >= $2
               AND date_permission <= $3`,
            [userId, debutMois, finMois]
        );
        
        const permissionsCount = parseInt(permissionsResult.rows[0].total) || 0;
        const permissionsHeures = parseFloat(permissionsResult.rows[0].total_heures) || 0;
        
        res.json({
            cp_total: cp_total,
            cp_pris: cp_pris,
            cp_restant: cp_restant,
            permissions_count: permissionsCount,
            permissions_heures: permissionsHeures,
            permissions_max: REGLES.MAX_PERMISSION_PAR_MOIS,
            permissions_max_heures: REGLES.MAX_PERMISSION_HEURES
        });
        
    } catch (error) {
        console.error('Erreur balance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ MES DEMANDES (CONGÉS + PERMISSIONS) ============

router.get('/my-requests', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT 
                dc.id,
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as start_date,
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as end_date,
                dc.type_conge_id as type_id,
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    WHEN dc.type_conge_id = 2 THEN '📝 Congé sans solde'
                    WHEN dc.type_conge_id = 3 THEN '⏰ Permission'
                END as type,
                dc.nombre_jours as duration,
                dc.duree_heures,
                dc.date_permission,
                dc.est_demi_journee,
                dc.statut,
                dc.motif,
                dc.motif_refus,
                dc.cree_le,
                dc.justificatif_nom as justificatif_nom,
                CASE 
                    WHEN dc.type_conge_id = 3 THEN 'permission'
                    ELSE 'conges'
                END as request_type
             FROM demandes_conges dc
             WHERE dc.utilisateur_id = $1
             ORDER BY dc.cree_le DESC`,
            [userId]
        );
        
        // Formater les données pour le frontend
        const formatted = result.rows.map(row => {
            if (row.type_id === 3) {
                return {
                    ...row,
                    displayDates: row.date_permission,
                    displayDuration: `${row.duree_heures || 0} heure(s)`
                };
            }
            return {
                ...row,
                displayDates: `${row.start_date} → ${row.end_date}`,
                displayDuration: `${row.duration} jour(s)`
            };
        });
        
        res.json(formatted);
    } catch (error) {
        console.error('Erreur my-requests:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ DEMANDE DE PERMISSION ============

router.post('/permission-request', authMiddleware, async (req, res) => {
    const { date_permission, duree_heures, est_demi_journee, motif } = req.body;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const isManager = userRoles.includes('manager');
    const isAdmin = userRoles.includes('admin');
    
    if (!date_permission) {
        return res.status(400).json({ message: "La date de la permission est requise" });
    }
    
    if (!duree_heures || duree_heures <= 0) {
        return res.status(400).json({ message: "La durée de la permission est requise" });
    }
    
    if (duree_heures > REGLES.MAX_PERMISSION_HEURES) {
        return res.status(400).json({ 
            message: `La permission ne peut pas dépasser ${REGLES.MAX_PERMISSION_HEURES} heures`,
            errors: [`Maximum ${REGLES.MAX_PERMISSION_HEURES} heures autorisées`]
        });
    }
    
    try {
        const validation = await validateLeaveRequest(
            userId, 
            3, 
            null, 
            null, 
            false, 
            null, 
            true, 
            duree_heures, 
            date_permission
        );
        
        if (!validation.isValid) {
            return res.status(400).json({ message: "Règles non respectées", errors: validation.errors });
        }
        
        let statut = 'pending_manager';
        if (isManager || isAdmin) {
            statut = 'pending_admin';
        }
        
        const result = await pool.query(
            `INSERT INTO demandes_conges 
             (utilisateur_id, type_conge_id, date_permission, duree_heures, est_demi_journee, motif, statut, date_debut, date_fin, nombre_jours)
             VALUES ($1, 3, $2, $3, $4, $5, $6, $2, $2, 0)
             RETURNING id`,
            [userId, date_permission, duree_heures, est_demi_journee || false, motif, statut]
        );
        
        // Notifications et emails
        if (!isManager && !isAdmin) {
            const managerResult = await pool.query(`SELECT manager_id FROM users WHERE id = $1`, [userId]);
            const managerId = managerResult.rows[0]?.manager_id;
            
            if (managerId) {
                const userInfo = await pool.query(`SELECT nom, prenom FROM users WHERE id = $1`, [userId]);
                const employe = userInfo.rows[0];
                
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'demande_recue', 'Nouvelle demande de permission', 
                             $2, '/dashboard/manager/validations', NOW())`,
                    [managerId, `${employe.prenom} ${employe.nom} a fait une demande de permission le ${date_permission} (${duree_heures}h)`]
                );
            }
        } else {
            const adminResult = await pool.query(
                `SELECT u.id, u.email, u.prenom, u.nom FROM users u
                 JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
                 JOIN roles r ON ur.role_id = r.id
                 WHERE r.nom = 'admin' LIMIT 1`
            );
            
            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                const userInfo = await pool.query(`SELECT nom, prenom FROM users WHERE id = $1`, [userId]);
                const demandeur = userInfo.rows[0];
                const roleName = isAdmin ? "l'administrateur" : "le manager";
                
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'validation_requise', 'Demande de permission à valider', 
                             $2, '/dashboard/admin', NOW())`,
                    [admin.id, `${demandeur.prenom} ${demandeur.nom} (${roleName}) a fait une demande de permission le ${date_permission}`]
                );
            }
        }
        
        res.status(201).json({ 
            message: 'Demande de permission créée avec succès',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Erreur create permission:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ DEMANDE DE CONGÉ ============

router.post('/request', authMiddleware, async (req, res) => {
    const { type_id, start_date, end_date, motif } = req.body;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const isManager = userRoles.includes('manager');
    const isAdmin = userRoles.includes('admin');
    
    if (!type_id || (type_id !== 1 && type_id !== 2)) {
        return res.status(400).json({ message: "Type de congé invalide. Choisissez 1 (Congés Payés) ou 2 (Congé sans solde)" });
    }
    
    try {
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date);
        
        if (!validation.isValid) {
            return res.status(400).json({ message: "Règles non respectées", errors: validation.errors });
        }
        
        const days = validation.days;
        
        let statut = 'pending_manager';
        if (isManager || isAdmin) {
            statut = 'pending_admin';
        }
        
        const result = await pool.query(
            `INSERT INTO demandes_conges 
             (utilisateur_id, type_conge_id, date_debut, date_fin, nombre_jours, motif, statut)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [userId, type_id, start_date, end_date, days, motif, statut]
        );
        
        if (!isManager && !isAdmin) {
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
                    console.error('Erreur envoi email manager:', emailError);
                }
            }
        } else {
            const adminResult = await pool.query(
                `SELECT u.id, u.email, u.prenom, u.nom FROM users u
                 JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
                 JOIN roles r ON ur.role_id = r.id
                 WHERE r.nom = 'admin' LIMIT 1`
            );
            
            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                const userInfo = await pool.query(`SELECT nom, prenom FROM users WHERE id = $1`, [userId]);
                const demandeur = userInfo.rows[0];
                const typeNom = (type_id === 1) ? "Congés Payés" : "Congé sans solde";
                const roleName = isAdmin ? "l'administrateur" : "le manager";
                
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'validation_requise', 'Demande à valider', 
                             $2, '/dashboard/admin', NOW())`,
                    [admin.id, `${demandeur.prenom} ${demandeur.nom} (${roleName}) a fait une demande de ${typeNom} du ${start_date} au ${end_date} (${days} jours)`]
                );
                
                try {
                    await sendAdminNewRequestEmail(
                        admin.email,
                        `${admin.prenom} ${admin.nom}`,
                        `${demandeur.prenom} ${demandeur.nom} (${roleName})`,
                        `${start_date} au ${end_date}`,
                        days
                    );
                } catch (emailError) {
                    console.error('Erreur envoi email admin:', emailError);
                }
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
    const { type_id, start_date, end_date, date_permission, duree_heures, est_demi_journee, motif } = req.body;
    const userRoles = req.user.roles || [];
    const isManager = userRoles.includes('manager');
    const isAdmin = userRoles.includes('admin');
    
    try {
        // Récupérer la demande existante
        const requestCheck = await pool.query(
            `SELECT * FROM demandes_conges WHERE id = $1 AND utilisateur_id = $2`,
            [requestId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée' });
        }
        
        const demande = requestCheck.rows[0];
        
        // Vérifier que la demande est modifiable
        const statutsModifiables = ['pending_manager', 'pending_admin'];
        if (!statutsModifiables.includes(demande.statut)) {
            return res.status(400).json({ message: 'Cette demande ne peut plus être modifiée' });
        }
        
        // Si c'est une permission (type_id = 3)
        if (parseInt(type_id) === 3 || demande.type_conge_id === 3) {
            const finalTypeId = parseInt(type_id) || 3;
            const finalDate = date_permission || demande.date_permission;
            const finalDuree = duree_heures || demande.duree_heures || 1;
            const finalDemi = est_demi_journee !== undefined ? est_demi_journee : demande.est_demi_journee;
            
            const validation = await validateLeaveRequest(
                userId, 
                finalTypeId, 
                null, 
                null, 
                true, 
                parseInt(requestId), 
                true, 
                finalDuree, 
                finalDate
            );
            
            if (!validation.isValid) {
                return res.status(400).json({ message: "Règles non respectées", errors: validation.errors });
            }
            
            const newStatut = (isManager || isAdmin) ? 'pending_admin' : 'pending_manager';
            
            await pool.query(
                `UPDATE demandes_conges 
                 SET type_conge_id = $1, date_permission = $2, duree_heures = $3, est_demi_journee = $4, motif = $5, statut = $6,
                     date_debut = $2, date_fin = $2, nombre_jours = 0
                 WHERE id = $7`,
                [finalTypeId, finalDate, finalDuree, finalDemi, motif || demande.motif, newStatut, requestId]
            );
            
            res.json({ message: 'Permission modifiée avec succès' });
            return;
        }
        
        // Sinon c'est un congé (type_id 1 ou 2)
        if (!type_id || (parseInt(type_id) !== 1 && parseInt(type_id) !== 2)) {
            return res.status(400).json({ 
                message: "Type de congé invalide. Valeurs acceptées: 1 (Congés Payés) ou 2 (Congé sans solde)",
                errors: ["Le type de congé doit être 'Congés Payés' ou 'Congé sans solde'"]
            });
        }
        
        const validation = await validateLeaveRequest(userId, type_id, start_date, end_date, true, parseInt(requestId));
        
        if (!validation.isValid) {
            return res.status(400).json({ message: "Règles non respectées", errors: validation.errors });
        }
        
        const days = validation.days;
        const newStatut = (isManager || isAdmin) ? 'pending_admin' : 'pending_manager';
        
        await pool.query(
            `UPDATE demandes_conges 
             SET type_conge_id = $1, date_debut = $2, date_fin = $3, nombre_jours = $4, motif = $5, statut = $6
             WHERE id = $7`,
            [type_id, start_date, end_date, days, motif || demande.motif, newStatut, requestId]
        );
        
        res.json({ message: 'Demande modifiée avec succès' });
        
    } catch (error) {
        console.error('Erreur update request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ ANNULER/SUPPRIMER UNE DEMANDE ============

router.delete('/cancel-request/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const isManager = userRoles.includes('manager');
    const isAdmin = userRoles.includes('admin');
    
    try {
        let requestCheck;
        
        if (isManager || isAdmin) {
            requestCheck = await pool.query(
                `SELECT dc.*, u.manager_id, u.nom, u.prenom
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_admin'`,
                [requestId, userId]
            );
        } else {
            requestCheck = await pool.query(
                `SELECT dc.*, u.manager_id, u.nom, u.prenom
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_manager'`,
                [requestId, userId]
            );
        }
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non annulable' });
        }
        
        const demande = requestCheck.rows[0];
        
        await pool.query(`DELETE FROM demandes_conges WHERE id = $1`, [requestId]);
        
        if (!isManager && !isAdmin && demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_annulee', 'Demande de congé annulée',
                         $2, '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `${demande.prenom} ${demande.nom} a annulé sa demande de congé.`]
            );
        }
        
        if ((isManager || isAdmin) && !isAdmin) {
            const adminResult = await pool.query(
                `SELECT u.id FROM users u
                 JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
                 JOIN roles r ON ur.role_id = r.id
                 WHERE r.nom = 'admin' LIMIT 1`
            );
            
            if (adminResult.rows.length > 0) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'demande_annulee_manager', 'Demande de congé annulée (Manager)',
                             $2, '/dashboard/admin', NOW())`,
                    [adminResult.rows[0].id, `Le manager ${demande.prenom} ${demande.nom} a annulé sa demande de congé.`]
                );
            }
        }
        
        res.json({ message: 'Demande annulée avec succès' });
        
    } catch (error) {
        console.error('Erreur cancel request:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ ANNULER UNE DEMANDE DÉJÀ APPROUVÉE ============

router.put('/cancel-approved-request/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { motif_annulation } = req.body;
    
    try {
        const requestCheck = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'approved'`,
            [requestId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée ou non approuvée' });
        }
        
        const demande = requestCheck.rows[0];
        
        // Si c'est une permission, on peut l'annuler plus facilement
        if (demande.type_conge_id === 3) {
            if (!motif_annulation || motif_annulation.trim() === '') {
                return res.status(400).json({ 
                    message: 'Veuillez fournir un motif d\'annulation',
                    error: 'MOTIF_REQUIRED'
                });
            }
            
            await pool.query(
                `UPDATE demandes_conges 
                 SET statut = 'cancelled', motif_refus = $1, date_annulation = NOW()
                 WHERE id = $2`,
                [motif_annulation, requestId]
            );
            
            // Notification
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'annulation_confirme', 'Permission annulée avec succès', 
                         $2, '/dashboard/employee/requests', NOW())`,
                [userId, `Votre permission du ${demande.date_permission} a été annulée.`]
            );
            
            res.json({ 
                message: 'Permission annulée avec succès',
                success: true
            });
            return;
        }
        
        // Pour les congés, vérifier le délai de 48h
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(demande.date_debut);
        
        if (today >= startDate) {
            return res.status(400).json({ 
                message: 'Impossible d\'annuler un congé déjà commencé ou passé',
                error: 'ALREADY_STARTED'
            });
        }
        
        const minCancelDate = new Date(startDate);
        minCancelDate.setDate(minCancelDate.getDate() - 2);
        minCancelDate.setHours(0, 0, 0, 0);
        
        if (today > minCancelDate) {
            const remainingHours = Math.ceil((startDate - today) / (1000 * 60 * 60));
            return res.status(400).json({ 
                message: `Annulation impossible : votre congé commence dans moins de 48h (${remainingHours} heures restantes)`,
                error: 'DEADLINE_PASSED',
                remainingHours
            });
        }
        
        if (!motif_annulation || motif_annulation.trim() === '') {
            return res.status(400).json({ 
                message: 'Veuillez fournir un motif d\'annulation',
                error: 'MOTIF_REQUIRED'
            });
        }
        
        await pool.query(
            `UPDATE demandes_conges 
             SET statut = 'cancelled', motif_refus = $1, date_annulation = NOW()
             WHERE id = $2`,
            [motif_annulation, requestId]
        );
        
        if (demande.type_conge_id === 1) {
            const currentYear = new Date().getFullYear();
            await pool.query(
                `UPDATE solde_conges 
                 SET pris_jours = pris_jours - $1, restant_jours = restant_jours + $1
                 WHERE utilisateur_id = $2 AND annee = $3 AND type_conge_id = 1`,
                [demande.nombre_jours, userId, currentYear]
            );
        }
        
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'annulation_conge', 'Congé annulé par employé', 
                         $2, '/dashboard/manager/team-calendar', NOW())`,
                [demande.manager_id, `${demande.prenom} ${demande.nom} a annulé son congé. Motif : ${motif_annulation}`]
            );
        }
        
        const adminResult = await pool.query(
            `SELECT u.id FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'admin' LIMIT 1`
        );
        
        if (adminResult.rows.length > 0) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'annulation_conge', 'Congé approuvé annulé', 
                         $2, '/dashboard/admin/calendar', NOW())`,
                [adminResult.rows[0].id, `${demande.prenom} ${demande.nom} a annulé son congé. Motif : ${motif_annulation}`]
            );
        }
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'annulation_confirme', 'Congé annulé avec succès', 
                     $2, '/dashboard/employee/requests', NOW())`,
            [userId, `Votre congé du ${demande.date_debut} au ${demande.date_fin} a été annulé.`]
        );
        
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${userId}`).emit('new_notification', {
                titre: 'Congé annulé',
                message: `Votre congé a été annulé.`,
                lien: '/dashboard/employee/requests'
            });
        }
        
        res.json({ 
            message: `Demande de congé annulée avec succès. ${demande.type_conge_id === 1 ? 'Les jours ont été recrédités.' : ''}`,
            success: true,
            recreditedDays: demande.type_conge_id === 1 ? demande.nombre_jours : 0
        });
        
    } catch (error) {
        console.error('Erreur cancel approved request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ UPLOAD JUSTIFICATIF ============

router.post('/upload-justificatif', authMiddleware, upload.single('justificatif'), async (req, res) => {
    const { demandeId } = req.body;
    const userId = req.user.id;
    const file = req.file;
    
    if (!demandeId) {
        return res.status(400).json({ message: 'ID de demande requis' });
    }
    
    if (!file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    
    try {
        const requestCheck = await pool.query(
            `SELECT id, statut FROM demandes_conges WHERE id = $1 AND utilisateur_id = $2`,
            [demandeId, userId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        
        const demande = requestCheck.rows[0];
        
        if (demande.statut !== 'pending_manager' && demande.statut !== 'pending_admin') {
            return res.status(400).json({ message: 'Seules les demandes en attente peuvent avoir des justificatifs' });
        }
        
        await pool.query(
            `UPDATE demandes_conges 
             SET justificatif_nom = $1, justificatif_data = $2, justificatif_upload_le = NOW()
             WHERE id = $3`,
            [file.originalname, file.buffer, demandeId]
        );
        
        res.status(200).json({ message: 'Justificatif ajouté avec succès' });
    } catch (error) {
        console.error('Erreur upload justificatif:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ RÉCUPÉRER JUSTIFICATIF ============

router.get('/justificatifs/:demandeId', authMiddleware, async (req, res) => {
    const { demandeId } = req.params;
    const userId = req.user.id;
    
    try {
        const requestCheck = await pool.query(
            `SELECT utilisateur_id, justificatif_nom, justificatif_data, justificatif_upload_le
             FROM demandes_conges 
             WHERE id = $1`,
            [demandeId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée' });
        }
        
        const demande = requestCheck.rows[0];
        
        if (demande.utilisateur_id !== userId) {
            const userRoles = req.user.roles || [];
            if (!userRoles.includes('admin') && !userRoles.includes('manager')) {
                return res.status(403).json({ message: 'Accès non autorisé' });
            }
        }
        
        if (!demande.justificatif_nom) {
            return res.json([]);
        }
        
        res.json([{
            id: demandeId,
            nom_fichier: demande.justificatif_nom,
            upload_le: demande.justificatif_upload_le
        }]);
    } catch (error) {
        console.error('Erreur get justificatifs:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ TÉLÉCHARGER JUSTIFICATIF ============

router.get('/download-justificatif/:demandeId', authMiddleware, async (req, res) => {
    const { demandeId } = req.params;
    const userId = req.user.id;
    
    try {
        const requestCheck = await pool.query(
            `SELECT utilisateur_id, justificatif_nom, justificatif_data
             FROM demandes_conges 
             WHERE id = $1`,
            [demandeId]
        );
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée' });
        }
        
        const demande = requestCheck.rows[0];
        
        if (demande.utilisateur_id !== userId) {
            const userRoles = req.user.roles || [];
            if (!userRoles.includes('admin') && !userRoles.includes('manager')) {
                return res.status(403).json({ message: 'Accès non autorisé' });
            }
        }
        
        if (!demande.justificatif_data) {
            return res.status(404).json({ message: 'Aucun justificatif trouvé' });
        }
        
        const fileName = demande.justificatif_nom || 'justificatif';
        const ext = fileName.split('.').pop().toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'doc') mimeType = 'application/msword';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(demande.justificatif_data);
    } catch (error) {
        console.error('Erreur download justificatif:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ VALIDATION MANAGER ============

router.get('/team-pending', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const result = await pool.query(
            `SELECT 
                dc.id,
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                dc.nombre_jours,
                dc.duree_heures,
                TO_CHAR(dc.date_permission, 'YYYY-MM-DD') as date_permission,
                dc.est_demi_journee,
                dc.motif,
                dc.statut,
                u.nom,
                u.prenom,
                u.email,
                u.service,
                dc.type_conge_id,
                CASE 
                    WHEN dc.type_conge_id = 1 THEN 'Congés Payés'
                    WHEN dc.type_conge_id = 2 THEN 'Congé sans solde'
                    WHEN dc.type_conge_id = 3 THEN 'Permission'
                END as type_name,
                'conges' as request_type,
                dc.cree_le
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
             ORDER BY dc.cree_le ASC`,
            [managerId]
        );
        
        // Ajouter des informations supplémentaires pour les permissions
        const formattedResult = result.rows.map(row => {
            if (row.type_conge_id === 3) {
                return {
                    ...row,
                    displayInfo: {
                        date: row.date_permission,
                        duree: row.duree_heures,
                        est_demi_journee: row.est_demi_journee,
                        type: 'Permission'
                    }
                };
            }
            return {
                ...row,
                displayInfo: {
                    date_debut: row.date_debut,
                    date_fin: row.date_fin,
                    duree: row.nombre_jours,
                    type: row.type_name
                }
            };
        });
        
        res.json(formattedResult);
    } catch (error) {
        console.error('Erreur team pending:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ VALIDATION MANAGER - APPROVE ============

router.put('/manager-approve/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { request_type } = req.body;
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, 
                    u.manager_id, 
                    u.nom, 
                    u.prenom, 
                    u.email,
                    m.nom as manager_nom,
                    m.prenom as manager_prenom,
                    m.email as manager_email
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             LEFT JOIN users m ON u.manager_id = m.id
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
        
        const isPermission = demande.type_conge_id === 3;
        const typeLabel = isPermission ? 'permission' : 'congé';
        const typeDisplay = isPermission ? 'permission' : 'congé';
        
        // Message personnalisé selon le type
        let messageNotif = '';
        let dateDisplay = '';
        let dureeDisplay = '';
        
        if (isPermission) {
            dateDisplay = demande.date_permission;
            dureeDisplay = `${demande.duree_heures} heure(s)`;
            messageNotif = `Votre demande de permission du ${demande.date_permission} (${demande.duree_heures}h) a été validée par votre manager.`;
        } else {
            dateDisplay = `du ${demande.date_debut} au ${demande.date_fin}`;
            dureeDisplay = `${demande.nombre_jours} jours`;
            messageNotif = `Votre demande de ${typeLabel} ${dateDisplay} a été validée par votre manager.`;
        }
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'pre_approuve', 'Demande pré-approuvée', 
                     $2, '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id, messageNotif]
        );
        
        // ============ EMAIL POUR L'EMPLOYÉ ============
        try {
            await sendManagerApprovalEmail(
                demande.email,
                `${demande.prenom} ${demande.nom}`,
                dateDisplay,
                isPermission ? demande.duree_heures : demande.nombre_jours,
                typeDisplay
            );
            console.log(`✅ Email d'approbation manager envoyé à ${demande.email}`);
        } catch (emailError) {
            console.error('Erreur envoi email employé:', emailError);
        }
        
        // ============ RÉCUPÉRER L'ADMIN POUR L'EMAIL ============
        const adminResult = await pool.query(
            `SELECT u.id, u.email, u.prenom, u.nom FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'admin' LIMIT 1`
        );
        
        if (adminResult.rows.length > 0) {
            const admin = adminResult.rows[0];
            
            let adminMessage = '';
            let adminDateDisplay = '';
            let adminDureeDisplay = '';
            
            if (isPermission) {
                adminDateDisplay = demande.date_permission;
                adminDureeDisplay = `${demande.duree_heures} heure(s)`;
                adminMessage = `Demande de permission de ${demande.prenom} ${demande.nom} le ${demande.date_permission} (${demande.duree_heures}h) - En attente de validation.`;
            } else {
                adminDateDisplay = `du ${demande.date_debut} au ${demande.date_fin}`;
                adminDureeDisplay = `${demande.nombre_jours} jours`;
                adminMessage = `Demande de ${typeLabel} de ${demande.prenom} ${demande.nom} ${adminDateDisplay} - En attente de validation.`;
            }
            
            // Notification pour l'admin
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'validation_requise', 'Demande à valider', 
                         $2, '/dashboard/admin', NOW())`,
                [admin.id, adminMessage]
            );
            
            // ============ EMAIL POUR L'ADMIN ============
            try {
                await sendAdminNewRequestEmail(
                    admin.email,
                    `${admin.prenom} ${admin.nom}`,
                    `${demande.prenom} ${demande.nom}`,
                    adminDateDisplay,
                    isPermission ? demande.duree_heures : demande.nombre_jours,
                    typeDisplay,
                    `${demande.manager_prenom || ''} ${demande.manager_nom || ''}`
                );
                console.log(`✅ Email envoyé à l'admin ${admin.email}`);
            } catch (emailError) {
                console.error('Erreur envoi email admin:', emailError);
            }
        }
        
        res.json({ message: 'Demande pré-approuvée' });
        
    } catch (error) {
        console.error('Erreur manager approve:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});


// ============ VALIDATION MANAGER - REJECT ============

router.put('/manager-reject/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { motif, request_type } = req.body;
    const motifFinal = motif || 'Non spécifié';
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, 
                    u.manager_id, 
                    u.nom, 
                    u.prenom, 
                    u.email
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
        
        const isPermission = demande.type_conge_id === 3;
        const typeLabel = isPermission ? 'permission' : 'congé';
        const typeDisplay = isPermission ? 'permission' : 'congé';
        
        // Message personnalisé selon le type
        let messageNotif = '';
        let dateDisplay = '';
        
        if (isPermission) {
            dateDisplay = demande.date_permission;
            messageNotif = `Votre demande de permission du ${demande.date_permission} a été refusée par votre manager. Motif : ${motifFinal}`;
        } else {
            dateDisplay = `du ${demande.date_debut} au ${demande.date_fin}`;
            messageNotif = `Votre demande de ${typeLabel} ${dateDisplay} a été refusée par votre manager. Motif : ${motifFinal}`;
        }
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'refus_manager', 'Demande de ' || $2 || ' refusée', 
                     $3, '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id, typeLabel, messageNotif]
        );
        
        // ============ EMAIL POUR L'EMPLOYÉ ============
        try {
            await sendManagerRejectionEmail(
                demande.email,
                `${demande.prenom} ${demande.nom}`,
                dateDisplay,
                motifFinal,
                typeDisplay
            );
            console.log(`✅ Email de refus manager envoyé à ${demande.email}`);
        } catch (emailError) {
            console.error('Erreur envoi email refus:', emailError);
        }
        
        res.json({ message: 'Demande refusée' });
        
    } catch (error) {
        console.error('Erreur manager reject:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ CALENDRIER ============

router.get('/team-absences', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const congesResult = await pool.query(
            `SELECT 
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut, 
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin, 
                dc.date_permission,
                dc.duree_heures,
                dc.statut, 
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    WHEN dc.type_conge_id = 2 THEN '📝 Congé sans solde'
                    WHEN dc.type_conge_id = 3 THEN '⏰ Permission'
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

router.get('/all-absences', authMiddleware, async (req, res) => {
    try {
        const congesResult = await pool.query(
            `SELECT 
                TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut, 
                TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin, 
                dc.date_permission,
                dc.duree_heures,
                dc.statut, 
                CASE 
                    WHEN dc.type_conge_id = 1 THEN '🏖️ Congés Payés'
                    WHEN dc.type_conge_id = 2 THEN '📝 Congé sans solde'
                    WHEN dc.type_conge_id = 3 THEN '⏰ Permission'
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

// ============ STATISTIQUES ============

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

router.get('/team-stats', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
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
                requestsByType: { CP: 0, SANS_SOLDE: 0, PERMISSION: 0 },
                monthlyData: []
            });
        }
        
        const globalStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN statut = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN statut = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN statut = 'approved' AND type_conge_id IN (1,2) THEN nombre_jours ELSE 0 END) as total_days
            FROM demandes_conges
            WHERE utilisateur_id = ANY($1::int[])
        `, [teamIds]);
        
        const parEmploye = await pool.query(`
            SELECT 
                u.id, u.nom, u.prenom,
                COUNT(dc.*) as total,
                SUM(CASE WHEN dc.statut = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN dc.statut IN ('pending_manager', 'pending_admin') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN dc.statut = 'rejected' THEN 1 ELSE 0 END) as rejected,
                COALESCE(SUM(CASE WHEN dc.statut = 'approved' AND dc.type_conge_id IN (1,2) THEN dc.nombre_jours ELSE 0 END), 0) as total_days,
                COALESCE(SUM(CASE WHEN dc.statut = 'approved' AND dc.type_conge_id = 3 THEN dc.duree_heures ELSE 0 END), 0) as total_permission_heures
            FROM users u
            LEFT JOIN demandes_conges dc ON u.id = dc.utilisateur_id
            WHERE u.manager_id = $1
            GROUP BY u.id
            ORDER BY total DESC
        `, [managerId]);
        
        const parType = await pool.query(`
            SELECT 
                dc.type_conge_id,
                COUNT(*) as total
            FROM demandes_conges dc
            WHERE dc.utilisateur_id = ANY($1::int[])
            GROUP BY dc.type_conge_id
        `, [teamIds]);
        
        let requestsByType = { CP: 0, SANS_SOLDE: 0, PERMISSION: 0 };
        parType.rows.forEach(row => {
            if (row.type_conge_id === 1) {
                requestsByType.CP = parseInt(row.total);
            } else if (row.type_conge_id === 2) {
                requestsByType.SANS_SOLDE = parseInt(row.total);
            } else if (row.type_conge_id === 3) {
                requestsByType.PERMISSION = parseInt(row.total);
            }
        });
        
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
                totalDays: parseInt(row.total_days) || 0,
                totalPermissionHeures: parseFloat(row.total_permission_heures) || 0
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
            `SELECT id, type, titre, message, lien, cree_le, est_lu
             FROM notifications 
             WHERE utilisateur_id = $1 
             ORDER BY cree_le DESC 
             LIMIT 50`,
            [userId]
        );
        
        notifications.push(...personalNotifs.rows);
        
        // 2. Pour le manager : créer des notifications pour les demandes en attente
        if (isManager && !isAdmin) {
            const teamPendingRequests = await pool.query(`
                SELECT 
                    dc.id as request_id,
                    dc.cree_le,
                    u.prenom, 
                    u.nom,
                    CASE 
                        WHEN dc.type_conge_id = 1 THEN 'congés payés'
                        WHEN dc.type_conge_id = 2 THEN 'congé sans solde'
                        WHEN dc.type_conge_id = 3 THEN 'permission'
                    END as type_name,
                    TO_CHAR(dc.date_debut, 'DD/MM/YYYY') as date_debut,
                    TO_CHAR(dc.date_fin, 'DD/MM/YYYY') as date_fin,
                    dc.date_permission,
                    dc.duree_heures
                FROM demandes_conges dc
                JOIN users u ON dc.utilisateur_id = u.id
                WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
                ORDER BY dc.cree_le DESC
            `, [userId]);
            
            for (const req of teamPendingRequests.rows) {
                let dateDisplay = req.date_debut;
                let durationDisplay = '';
                if (req.type_name !== 'permission') {
                    dateDisplay = `du ${req.date_debut} au ${req.date_fin}`;
                    durationDisplay = `${req.duree_heures || ''}`;
                } else {
                    dateDisplay = `le ${req.date_permission}`;
                    durationDisplay = `${req.duree_heures}h`;
                }
                
                const existingNotif = await pool.query(`
                    SELECT id, est_lu FROM notifications 
                    WHERE utilisateur_id = $1 AND type = 'demande_attente' AND message LIKE $2
                    ORDER BY cree_le DESC LIMIT 1
                `, [userId, `%${req.prenom}%${req.nom}%`]);
                
                if (existingNotif.rows.length > 0) {
                    notifications.push({
                        id: existingNotif.rows[0].id,
                        type: 'demande_attente',
                        titre: 'Nouvelle demande à valider',
                        message: `${req.prenom} ${req.nom} a fait une demande de ${req.type_name} ${dateDisplay} (${durationDisplay})`,
                        lien: '/dashboard/manager/validations',
                        cree_le: req.cree_le,
                        est_lu: existingNotif.rows[0].est_lu
                    });
                } else {
                    const message = `${req.prenom} ${req.nom} a fait une demande de ${req.type_name} ${dateDisplay} (${durationDisplay})`;
                    const insertResult = await pool.query(`
                        INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le, est_lu)
                        VALUES ($1, 'demande_attente', 'Nouvelle demande à valider', $2, '/dashboard/manager/validations', $3, false)
                        RETURNING id, est_lu
                    `, [userId, message, req.cree_le]);
                    
                    notifications.push({
                        id: insertResult.rows[0].id,
                        type: 'demande_attente',
                        titre: 'Nouvelle demande à valider',
                        message: message,
                        lien: '/dashboard/manager/validations',
                        cree_le: req.cree_le,
                        est_lu: insertResult.rows[0].est_lu
                    });
                }
            }
        }
        
        // Filtrer les doublons par id
        const uniqueNotifs = [];
        const seenIds = new Set();
        for (const notif of notifications) {
            if (!seenIds.has(notif.id)) {
                seenIds.add(notif.id);
                uniqueNotifs.push(notif);
            }
        }
        
        uniqueNotifs.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
        
        res.json(uniqueNotifs.slice(0, 30));
    } catch (error) {
        console.error('Erreur notifications:', error);
        res.json([]);
    }
});

// ============ MARQUER UNE NOTIFICATION COMME LUE ============

router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;
        
        const result = await pool.query(
            `UPDATE notifications 
             SET est_lu = true, date_lu = NOW() 
             WHERE id = $1 AND utilisateur_id = $2 
             RETURNING id, est_lu, date_lu`,
            [notificationId, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification non trouvée' });
        }
        
        res.json({ 
            message: 'Notification marquée comme lue', 
            notification: result.rows[0] 
        });
    } catch (error) {
        console.error('Erreur mark as read:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ NETTOYER LES NOTIFICATIONS OBSOLÈTES ============

router.delete('/cleanup-notifications', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            DELETE FROM notifications n
            WHERE n.utilisateur_id = $1 
              AND n.type = 'demande_attente'
              AND NOT EXISTS (
                  SELECT 1 FROM demandes_conges dc
                  JOIN users u ON dc.utilisateur_id = u.id
                  WHERE u.manager_id = $1 
                    AND dc.statut = 'pending_manager'
                    AND n.message LIKE CONCAT('%', u.prenom, '%')
              )
            RETURNING id
        `, [userId]);
        
        res.json({ message: `${result.rows.length} notifications nettoyées` });
    } catch (error) {
        console.error('Erreur cleanup notifications:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;