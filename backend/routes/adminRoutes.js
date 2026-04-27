// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const XLSX = require('xlsx');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');
const { sendActivationEmail, sendPasswordChangedEmail } = require('../utils/emailService');

// Middleware admin
router.use(authMiddleware);
router.use(requireRoles(['admin']));

// ============ STATISTIQUES ============
router.get('/stats', async (req, res) => {
    try {
        const employeesResult = await pool.query(
            `SELECT COUNT(*) FROM utilisateurs_roles ur 
             JOIN roles r ON ur.role_id = r.id 
             WHERE r.nom = 'employe'`
        );
        
        const managersResult = await pool.query(
            `SELECT COUNT(*) FROM utilisateurs_roles ur 
             JOIN roles r ON ur.role_id = r.id 
             WHERE r.nom = 'manager'`
        );
        
        const pendingResult = await pool.query(
            `SELECT COUNT(*) FROM demandes_conges WHERE statut IN ('pending_manager', 'pending_admin')`
        );
        
        const alertsResult = await pool.query(
            `SELECT COUNT(*) FROM solde_conges WHERE restant_jours < 5 AND annee = $1`,
            [new Date().getFullYear()]
        );
        
        const servicesResult = await pool.query(
            `SELECT COUNT(DISTINCT service) FROM users WHERE service IS NOT NULL`
        );
        
        res.json({
            employees: parseInt(employeesResult.rows[0].count),
            managers: parseInt(managersResult.rows[0].count),
            pendingRequests: parseInt(pendingResult.rows[0].count),
            alerts: parseInt(alertsResult.rows[0].count),
            services: parseInt(servicesResult.rows[0].count)
        });
    } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ GESTION DES UTILISATEURS ============

// Récupérer tous les utilisateurs
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut,
                    array_agg(r.nom) as roles,
                    u.cree_le
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             GROUP BY u.id
             ORDER BY u.cree_le DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur users:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les employés (non managers)
router.get('/employees-only', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'employe'
             AND u.id NOT IN (
                 SELECT utilisateur_id FROM utilisateurs_roles ur2 
                 JOIN roles r2 ON ur2.role_id = r2.id 
                 WHERE r2.nom = 'manager'
             )
             ORDER BY u.nom ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur employees-only:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// AJOUTER EMPLOYÉ (créer un nouveau compte)
router.post('/create-employee', async (req, res) => {
    const { nom, prenom, email, password, telephone, service } = req.body;
    
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        const activationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpire = new Date();
        tokenExpire.setHours(tokenExpire.getHours() + 48);
        
        const employeRole = await pool.query('SELECT id FROM roles WHERE nom = $1', ['employe']);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userResult = await pool.query(
            `INSERT INTO users (nom, prenom, email, password_hash, telephone, service, statut, token_activation, token_activation_expire, cree_le)
             VALUES ($1, $2, $3, $4, $5, $6, 'invited', $7, $8, NOW())
             RETURNING id`,
            [nom, prenom, email, hashedPassword, telephone || null, service || null, activationToken, tokenExpire]
        );
        
        const userId = userResult.rows[0].id;
        
        await pool.query(
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id, assigne_le, assigne_par)
             VALUES ($1, $2, NOW(), $3)`,
            [userId, employeRole.rows[0].id, req.user.id]
        );
        
        const currentYear = new Date().getFullYear();
        const typesConges = await pool.query('SELECT id, jours_par_defaut FROM types_conges WHERE jours_par_defaut IS NOT NULL');
        
        for (const type of typesConges.rows) {
            await pool.query(
                `INSERT INTO solde_conges (utilisateur_id, annee, type_conge_id, total_jours, restant_jours)
                 VALUES ($1, $2, $3, $4, $4)`,
                [userId, currentYear, type.id, type.jours_par_defaut]
            );
        }
        
        await sendActivationEmail(email, nom, prenom, activationToken);
        
        res.status(201).json({ message: 'Employé créé avec succès. Un email d\'activation lui a été envoyé.' });
        
    } catch (error) {
        console.error('Erreur création employé:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PROMOUVOIR EMPLOYÉ EN MANAGER
router.post('/promote-to-manager', async (req, res) => {
    const { userId } = req.body;
    
    try {
        const userCheck = await pool.query(
            `SELECT u.id, u.nom, u.prenom, array_agg(r.nom) as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        const user = userCheck.rows[0];
        const currentRoles = user.roles || [];
        
        if (currentRoles.includes('manager')) {
            return res.status(400).json({ message: 'Cet utilisateur est déjà manager' });
        }
        
        if (!currentRoles.includes('employe')) {
            return res.status(400).json({ message: 'Seul un employé peut être promu manager' });
        }
        
        const managerRole = await pool.query('SELECT id FROM roles WHERE nom = $1', ['manager']);
        
        await pool.query(
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id, assigne_le, assigne_par)
             VALUES ($1, $2, NOW(), $3)`,
            [userId, managerRole.rows[0].id, req.user.id]
        );
        
        res.json({ message: `${user.prenom} ${user.nom} est maintenant manager !` });
        
    } catch (error) {
        console.error('Erreur promotion manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// MODIFIER UN UTILISATEUR
router.put('/users/:id', async (req, res) => {
    const { nom, prenom, email, telephone, service, statut } = req.body;
    const userId = req.params.id;
    
    try {
        await pool.query(
            `UPDATE users SET 
                nom = $1, 
                prenom = $2, 
                email = $3, 
                telephone = $4, 
                service = $5, 
                statut = $6, 
                modifie_le = NOW()
             WHERE id = $7`,
            [nom, prenom, email, telephone || null, service || null, statut || 'actif', userId]
        );
        
        res.json({ message: 'Utilisateur modifié avec succès' });
        
    } catch (error) {
        console.error('Erreur modification:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// RÉINITIALISER LE MOT DE PASSE D'UN UTILISATEUR
router.put('/users/:id/reset-password', async (req, res) => {
    const userId = req.params.id;
    const { password } = req.body;
    
    try {
        const userResult = await pool.query('SELECT nom, prenom, email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        const user = userResult.rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.query('UPDATE users SET password_hash = $1, modifie_le = NOW() WHERE id = $2', [hashedPassword, userId]);
        
        await sendPasswordChangedEmail(user.email, user.nom, user.prenom);
        
        res.json({ message: 'Mot de passe réinitialisé avec succès' });
        
    } catch (error) {
        console.error('Erreur reset password:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// SUPPRIMER UN UTILISATEUR
router.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;
    
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// EXPORT EXCEL DES UTILISATEURS
router.get('/export-users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut,
                    array_agg(r.nom) as roles, u.cree_le
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             GROUP BY u.id
             ORDER BY u.cree_le DESC`
        );
        
        const data = result.rows.map(row => ({
            'ID': row.id,
            'Nom': row.nom,
            'Prénom': row.prenom,
            'Email': row.email,
            'Téléphone': row.telephone || '',
            'Service': row.service || '',
            'Rôle': row.roles.join(', '),
            'Statut': row.statut === 'actif' ? 'Actif' : row.statut === 'invited' ? 'Invité' : 'Inactif',
            'Date création': new Date(row.cree_le).toLocaleDateString('fr-FR')
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        
        ws['!cols'] = [
            { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
            { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=utilisateurs_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        
    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// RENVOYER EMAIL D'ACTIVATION
router.post('/resend-activation/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1 AND statut = $2', [userId, 'invited']);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé ou déjà actif' });
        }
        
        const user = userResult.rows[0];
        const activationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpire = new Date();
        tokenExpire.setHours(tokenExpire.getHours() + 48);
        
        await pool.query(
            'UPDATE users SET token_activation = $1, token_activation_expire = $2 WHERE id = $3',
            [activationToken, tokenExpire, userId]
        );
        
        await sendActivationEmail(user.email, user.nom, user.prenom, activationToken);
        
        res.json({ message: 'Email d\'activation renvoyé' });
        
    } catch (error) {
        console.error('Erreur renvoi email:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ VALIDATION ADMIN (2ème étape) ============

// Récupérer les demandes pré-approuvées par les managers (en attente validation admin)
router.get('/pending-approvals', async (req, res) => {
    try {
        // Demandes de congés pré-approuvées
        const congesResult = await pool.query(
            `SELECT dc.*, u.nom, u.prenom, u.email, u.service, tc.nom as type_name,
                    m.nom as manager_nom, m.prenom as manager_prenom,
                    'conges' as request_type
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             LEFT JOIN users m ON dc.approbateur_id = m.id
             WHERE dc.statut = 'pending_admin'
             ORDER BY dc.date_approbation ASC`
        );
        
        // Demandes de permissions pré-approuvées
        const permissionsResult = await pool.query(
            `SELECT dp.*, u.nom, u.prenom, u.email, u.service, 'Permission' as type_name,
                    m.nom as manager_nom, m.prenom as manager_prenom,
                    'permission' as request_type
             FROM demandes_permissions dp
             JOIN users u ON dp.utilisateur_id = u.id
             LEFT JOIN users m ON dp.approbateur_id = m.id
             WHERE dp.statut = 'pending_admin'
             ORDER BY dp.date_approbation ASC`
        );
        
        const allPending = [...congesResult.rows, ...permissionsResult.rows];
        allPending.sort((a, b) => new Date(a.date_approbation) - new Date(b.date_approbation));
        
        res.json(allPending);
    } catch (error) {
        console.error('Erreur pending approvals:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Admin approuve définitivement une demande (congé ou permission)
router.put('/final-approve/:id', async (req, res) => {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { request_type } = req.body;
    
    try {
        if (request_type === 'permission') {
            // Approuver définitivement une permission
            const requestResult = await pool.query(
                `SELECT dp.*, u.nom, u.prenom, u.email, u.manager_id
                 FROM demandes_permissions dp
                 JOIN users u ON dp.utilisateur_id = u.id
                 WHERE dp.id = $1 AND dp.statut = 'pending_admin'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            await pool.query(
                `UPDATE demandes_permissions 
                 SET statut = 'approved', approbateur_id = $1, date_approbation = NOW()
                 WHERE id = $2`,
                [adminId, requestId]
            );
            
            // Notification pour l'employé
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'approuve_final_permission', '✅ Permission définitivement approuvée', 
                         'Félicitations ! Votre demande de permission du ${demande.date_permission} a été définitivement approuvée par l\'administrateur.', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            // Notification pour le manager
            if (demande.manager_id) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'approuve_final_permission', '✅ Permission approuvée définitivement', 
                             'La demande de permission de ${demande.prenom} ${demande.nom} a été définitivement approuvée par l\'administrateur.', 
                             '/dashboard/manager/validations', NOW())`,
                    [demande.manager_id]
                );
            }
            
            res.json({ message: 'Permission définitivement approuvée' });
            
        } else {
            // Approuver définitivement un congé
            const requestResult = await pool.query(
                `SELECT dc.*, u.nom, u.prenom, u.email, u.manager_id
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.statut = 'pending_admin'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            await pool.query(
                `UPDATE demandes_conges 
                 SET statut = 'approved', approbateur_id = $1, date_approbation = NOW()
                 WHERE id = $2`,
                [adminId, requestId]
            );
            
            // Déduire du solde
            const currentYear = new Date().getFullYear();
            await pool.query(
                `UPDATE solde_conges 
                 SET pris_jours = pris_jours + $1, restant_jours = restant_jours - $1
                 WHERE utilisateur_id = $2 AND annee = $3 AND type_conge_id = $4`,
                [demande.nombre_jours, demande.utilisateur_id, currentYear, demande.type_conge_id]
            );
            
            // Notification pour l'employé
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'approuve_final', '✅ Congé définitivement approuvé', 
                         'Félicitations ! Votre demande de congé du ${demande.date_debut} au ${demande.date_fin} a été définitivement approuvée par l\'administrateur.', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            // Notification pour le manager
            if (demande.manager_id) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'approuve_final', '✅ Demande de congé approuvée définitivement', 
                             'La demande de congé de ${demande.prenom} ${demande.nom} a été définitivement approuvée par l\'administrateur.', 
                             '/dashboard/manager/validations', NOW())`,
                    [demande.manager_id]
                );
            }
            
            res.json({ message: 'Demande définitivement approuvée' });
        }
        
    } catch (error) {
        console.error('Erreur final approve:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Admin refuse définitivement une demande (congé ou permission)
router.put('/final-reject/:id', async (req, res) => {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { motif, request_type } = req.body;
    const motifFinal = motif || 'Non spécifié par l\'administrateur';
    
    try {
        if (request_type === 'permission') {
            // Refuser définitivement une permission
            const requestResult = await pool.query(
                `SELECT dp.*, u.nom, u.prenom, u.email, u.manager_id
                 FROM demandes_permissions dp
                 JOIN users u ON dp.utilisateur_id = u.id
                 WHERE dp.id = $1 AND dp.statut = 'pending_admin'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            await pool.query(
                `UPDATE demandes_permissions 
                 SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
                 WHERE id = $3`,
                [adminId, motifFinal, requestId]
            );
            
            // Notification pour l'employé
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'refus_admin_permission', '❌ Permission définitivement refusée', 
                         'Votre demande de permission a été définitivement refusée par l\'administrateur.\n\nMotif : ${motifFinal}', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            // Notification pour le manager
            if (demande.manager_id) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'refus_admin_permission', '❌ Permission définitivement refusée', 
                             'La demande de permission de ${demande.prenom} ${demande.nom} a été définitivement refusée par l\'administrateur.\n\nMotif : ${motifFinal}', 
                             '/dashboard/manager/validations', NOW())`,
                    [demande.manager_id]
                );
            }
            
            res.json({ message: 'Permission définitivement refusée' });
            
        } else {
            // Refuser définitivement un congé
            const requestResult = await pool.query(
                `SELECT dc.*, u.nom, u.prenom, u.email, u.manager_id
                 FROM demandes_conges dc
                 JOIN users u ON dc.utilisateur_id = u.id
                 WHERE dc.id = $1 AND dc.statut = 'pending_admin'`,
                [requestId]
            );
            
            if (requestResult.rows.length === 0) {
                return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
            }
            
            const demande = requestResult.rows[0];
            
            await pool.query(
                `UPDATE demandes_conges 
                 SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
                 WHERE id = $3`,
                [adminId, motifFinal, requestId]
            );
            
            // Notification pour l'employé
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'refus_admin', '❌ Demande de congé définitivement refusée', 
                         'Votre demande de congé a été définitivement refusée par l\'administrateur.\n\nMotif : ${motifFinal}', 
                         '/dashboard/employee/requests', NOW())`,
                [demande.utilisateur_id]
            );
            
            // Notification pour le manager
            if (demande.manager_id) {
                await pool.query(
                    `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                     VALUES ($1, 'refus_admin', '❌ Demande de congé refusée définitivement', 
                             'La demande de congé de ${demande.prenom} ${demande.nom} a été définitivement refusée par l\'administrateur.\n\nMotif : ${motifFinal}', 
                             '/dashboard/manager/validations', NOW())`,
                    [demande.manager_id]
                );
            }
            
            res.json({ message: 'Demande définitivement refusée' });
        }
        
    } catch (error) {
        console.error('Erreur final reject:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ GESTION DES DEMANDES (liste toutes les demandes) ============

router.get('/leave-requests', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT dc.*, u.nom, u.prenom, tc.nom as type_name
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             ORDER BY dc.cree_le DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur leave-requests:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ CODES D'INSCRIPTION ============

router.get('/codes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ci.*, r.nom as role_name
             FROM codes_inscription ci
             JOIN roles r ON ci.role_id = r.id
             ORDER BY ci.cree_le DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur codes:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/generate-code', async (req, res) => {
    const { role, max_utilisations, description } = req.body;
    
    try {
        const roleResult = await pool.query('SELECT id FROM roles WHERE nom = $1', [role]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ message: 'Rôle invalide' });
        }
        
        const code = `${role.toUpperCase()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        
        await pool.query(
            `INSERT INTO codes_inscription (code, role_id, description, max_utilisations, cree_le)
             VALUES ($1, $2, $3, $4, NOW())`,
            [code, roleResult.rows[0].id, description || null, max_utilisations || null]
        );
        
        res.json({ message: 'Code généré', code });
    } catch (error) {
        console.error('Erreur generate-code:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/codes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM codes_inscription WHERE id = $1', [req.params.id]);
        res.json({ message: 'Code supprimé' });
    } catch (error) {
        console.error('Erreur delete code:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ LOGS ============
router.get('/logs', async (req, res) => {
    res.json([]);
});

// ============ PARAMÈTRES ============
router.get('/settings', async (req, res) => {
    res.json({
        cp_jours_par_an: 25,
        rtt_jours_par_an: 12,
        max_conges_consecutifs: 20,
        preavis_minimum: 2,
        permission_max_heures_mois: 4
    });
});

router.put('/settings', async (req, res) => {
    res.json({ message: 'Paramètres enregistrés !' });
});

// ============ GESTION DES MANAGERS (AJOUT EMPLOYÉ À L'ÉQUIPE) ============

// Assigner un manager à un employé
router.put('/assign-manager/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { managerId } = req.body;
    const adminId = req.user.id;
    
    try {
        const employeeCheck = await pool.query(`SELECT * FROM users WHERE id = $1`, [employeeId]);
        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Employé non trouvé' });
        }
        
        const managerCheck = await pool.query(
            `SELECT u.* FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1 AND r.nom = 'manager'`,
            [managerId]
        );
        
        if (managerCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Manager non trouvé ou invalide' });
        }
        
        await pool.query(
            `UPDATE users SET manager_id = $1, modifie_le = NOW() WHERE id = $2`,
            [managerId, employeeId]
        );
        
        res.json({ message: 'Manager assigné avec succès à l\'employé' });
        
    } catch (error) {
        console.error('Erreur assign manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer tous les managers (pour sélection dans l'assignation)
router.get('/managers-list', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'manager'
             ORDER BY u.nom ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur managers-list:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;