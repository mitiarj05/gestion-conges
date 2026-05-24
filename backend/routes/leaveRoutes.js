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

// ============ FONCTION DE VALIDATION ============

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
    
    const maxConsecutif = (type_id === 2) ? 5 : 20;
    
    if (days > maxConsecutif) {
        const typeNom = (type_id === 1) ? "Congés Payés" : "Congé sans solde";
        errors.push(`${typeNom} : maximum ${maxConsecutif} jours consécutifs (vous demandez ${days} jours)`);
    }
    
    const preavisMin = (type_id === 2) ? 1 : 2;
    const preavisDate = new Date();
    preavisDate.setDate(preavisDate.getDate() + preavisMin);
    
    if (start < preavisDate && !isModification) {
        errors.push(`Vous devez faire votre demande au moins ${preavisMin} jours à l'avance`);
    }
    
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
                dc.justificatif_nom as justificatif_nom,
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
    const { type_id, start_date, end_date, motif } = req.body;
    const userRoles = req.user.roles || [];
    const isManager = userRoles.includes('manager');
    const isAdmin = userRoles.includes('admin');
    
    if (!type_id || (parseInt(type_id) !== 1 && parseInt(type_id) !== 2)) {
        return res.status(400).json({ 
            message: "Type de congé invalide. Valeurs acceptées: 1 (Congés Payés) ou 2 (Congé sans solde)",
            errors: ["Le type de congé doit être 'Congés Payés' ou 'Congé sans solde'"]
        });
    }
    
    try {
        let requestCheck;
        
        if (isManager || isAdmin) {
            requestCheck = await pool.query(
                `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_admin'`,
                [requestId, userId]
            );
        } else {
            requestCheck = await pool.query(
                `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.utilisateur_id = $2 AND dc.statut = 'pending_manager'`,
                [requestId, userId]
            );
        }
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non modifiable ou déjà traitée' });
        }
        
        const demande = requestCheck.rows[0];
        
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
        
        const typeNom = (parseInt(type_id) === 1) ? "Congés Payés" : "Congé sans solde";
        
        if (!isManager && !isAdmin && demande.manager_id) {
            const notificationMessage = `${demande.prenom} ${demande.nom} a MODIFIÉ sa demande de congé. Nouvelle période: du ${start_date} au ${end_date} (${days} jours, ${typeNom})`;
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'demande_modifiee', 'Demande de congé modifiée',
                         $2, '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, notificationMessage]
            );
            
            try {
                const managerResult = await pool.query(`SELECT email, prenom FROM users WHERE id = $1`, [demande.manager_id]);
                if (managerResult.rows.length > 0) {
                    const manager = managerResult.rows[0];
                    const subject = '✏️ Demande de congé modifiée - À revalider';
                    const html = `
                        <!DOCTYPE html>
                        <html>
                        <head><meta charset="UTF-8"><title>Demande de congé modifiée</title>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                            .header { background: #ff9800; color: white; padding: 24px; text-align: center; }
                            .content { padding: 32px 24px; }
                            .info-card { background: #fff3cd; padding: 20px; border-radius: 12px; margin: 20px 0; }
                            .button { display: inline-block; padding: 12px 28px; background: #0f3460; color: white; text-decoration: none; border-radius: 40px; }
                            .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
                        </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header"><h1>🏢 Gestion des Congés</h1><p>Modification de demande de congé</p></div>
                                <div class="content">
                                    <h2>Bonjour ${manager.prenom},</h2>
                                    <p>✏️ <strong>${demande.prenom} ${demande.nom}</strong> a modifié sa demande de congé.</p>
                                    <div class="info-card">
                                        <p><strong>📅 Nouvelles dates :</strong> du ${start_date} au ${end_date}</p>
                                        <p><strong>📊 Durée :</strong> ${days} jour(s)</p>
                                        <p><strong>📝 Type :</strong> ${typeNom}</p>
                                    </div>
                                    <p>Veuillez vous connecter pour revalider ou refuser cette demande modifiée.</p>
                                    <div style="text-align: center;">
                                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/manager/validations" class="button">✅ Revalider la demande</a>
                                    </div>
                                </div>
                                <div class="footer"><p>© 2025 Gestion des Congés</p></div>
                            </div>
                        </body>
                        </html>
                    `;
                    await sendEmail(manager.email, subject, html, manager.prenom);
                }
            } catch (emailError) {
                console.error('Erreur envoi email modification:', emailError);
            }
        }
        
        if ((isManager || isAdmin) && !isAdmin) {
            const adminResult = await pool.query(
                `SELECT u.id, u.email, u.prenom FROM users u
                 JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
                 JOIN roles r ON ur.role_id = r.id
                 WHERE r.nom = 'admin' LIMIT 1`
            );
            
            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                const notificationMessage = `${demande.prenom} ${demande.nom} (manager) a MODIFIÉ sa demande de congé. Nouvelle période: du ${start_date} au ${end_date} (${days} jours, ${typeNom})`;
                
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'demande_modifiee_manager', 'Demande de congé modifiée (Manager)',
                             $2, '/dashboard/admin', NOW())`,
                    [admin.id, notificationMessage]
                );
                
                try {
                    const subject = '✏️ Demande de congé modifiée par un manager - À valider';
                    const html = `
                        <!DOCTYPE html>
                        <html>
                        <head><meta charset="UTF-8"><title>Demande de congé modifiée (Manager)</title>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                            .header { background: #ff9800; color: white; padding: 24px; text-align: center; }
                            .content { padding: 32px 24px; }
                            .info-card { background: #fff3cd; padding: 20px; border-radius: 12px; margin: 20px 0; }
                            .button { display: inline-block; padding: 12px 28px; background: #0f3460; color: white; text-decoration: none; border-radius: 40px; }
                            .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
                        </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header"><h1>🏢 Gestion des Congés</h1><p>Modification de demande de congé (Manager)</p></div>
                                <div class="content">
                                    <h2>Bonjour ${admin.prenom},</h2>
                                    <p>✏️ Le manager <strong>${demande.prenom} ${demande.nom}</strong> a modifié sa demande de congé.</p>
                                    <div class="info-card">
                                        <p><strong>📅 Nouvelles dates :</strong> du ${start_date} au ${end_date}</p>
                                        <p><strong>📊 Durée :</strong> ${days} jour(s)</p>
                                        <p><strong>📝 Type :</strong> ${typeNom}</p>
                                    </div>
                                    <p>Veuillez vous connecter pour revalider ou refuser cette demande modifiée.</p>
                                    <div style="text-align: center;">
                                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin" class="button">👑 Valider la demande</a>
                                    </div>
                                </div>
                                <div class="footer"><p>© 2025 Gestion des Congés</p></div>
                            </div>
                        </body>
                        </html>
                    `;
                    await sendEmail(admin.email, subject, html, admin.prenom);
                } catch (emailError) {
                    console.error('Erreur envoi email admin pour modification manager:', emailError);
                }
            }
        }
        
        res.json({ message: 'Demande modifiée avec succès.' });
        
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
        
        // Déterminer le type MIME à partir de l'extension du fichier
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
            console.error('Erreur envoi email employé:', emailError);
        }
        
        const adminResult = await pool.query(
            `SELECT u.id, u.email, u.prenom, u.nom FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'admin' LIMIT 1`
        );
        
        if (adminResult.rows.length > 0) {
            const admin = adminResult.rows[0];
            
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'validation_requise', 'Demande à valider', 
                         $2, '/dashboard/admin', NOW())`,
                [admin.id, `Une demande de congé de ${demande.prenom} ${demande.nom} attend votre validation.`]
            );
            
            try {
                await sendAdminNewRequestEmail(
                    admin.email,
                    `${admin.prenom} ${admin.nom}`,
                    `${demande.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    demande.nombre_jours
                );
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
                requestsByType: { CP: 0, SANS_SOLDE: 0 },
                monthlyData: []
            });
        }
        
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
        
        const personalNotifs = await pool.query(
            `SELECT * FROM notifications 
             WHERE utilisateur_id = $1 
             ORDER BY cree_le DESC 
             LIMIT 30`,
            [userId]
        );
        notifications.push(...personalNotifs.rows);
        
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