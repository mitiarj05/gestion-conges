// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Récupérer le solde de l'utilisateur connecté - CORRIGÉ
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();
        
        // Récupérer tous les soldes pour l'utilisateur
        const result = await pool.query(
            `SELECT sc.*, tc.nom as type_name, tc.code
             FROM solde_conges sc
             JOIN types_conges tc ON sc.type_conge_id = tc.id
             WHERE sc.utilisateur_id = $1 AND sc.annee = $2`,
            [userId, currentYear]
        );
        
        console.log('Soldes trouvés pour utilisateur', userId, ':', result.rows);
        
        // Structure de retour avec toutes les valeurs
        const balance = {
            // Congés Payés (CP)
            cp_total: 0,
            cp_pris: 0,
            cp_restant: 0,
            // RTT
            rtt_total: 0,
            rtt_pris: 0,
            rtt_restant: 0,
            // Congés sans solde (SS)
            ss_total: 0,
            ss_pris: 0,
            ss_restant: 0,
            // Permission (pour compatibilité)
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
        
        // Pour compatibilité avec l'ancien format
        balance.paid = balance.cp_restant;
        balance.rtt = balance.rtt_restant;
        balance.unpaid = balance.ss_restant;
        
        console.log('Balance calculée:', balance);
        res.json(balance);
        
    } catch (error) {
        console.error('Erreur balance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les demandes de l'utilisateur connecté
router.get('/my-requests', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT dc.*, tc.nom as type_name,
                    CASE 
                        WHEN dc.statut = 'pending_manager' THEN 'En attente manager'
                        WHEN dc.statut = 'pending_admin' THEN 'En attente admin'
                        WHEN dc.statut = 'approved' THEN 'Approuve'
                        WHEN dc.statut = 'rejected' THEN 'Refuse'
                        ELSE dc.statut
                    END as status_label
             FROM demandes_conges dc
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE dc.utilisateur_id = $1
             ORDER BY dc.cree_le DESC`,
            [userId]
        );
        
        const requests = result.rows.map(row => ({
            id: row.id,
            start_date: row.date_debut,
            end_date: row.date_fin,
            type_id: row.type_conge_id,
            type: row.type_name,
            duration: parseFloat(row.nombre_jours),
            status: row.statut,
            status_label: row.status_label,
            motif: row.motif,
            motif_refus: row.motif_refus
        }));
        
        res.json(requests);
    } catch (error) {
        console.error('Erreur my-requests:', error);
        res.json([]);
    }
});

// Récupérer une demande spécifique (pour modification)
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

// Créer une demande de congé
router.post('/request', authMiddleware, async (req, res) => {
    const { type_id, start_date, end_date, motif } = req.body;
    const userId = req.user.id;
    
    try {
        const start = new Date(start_date);
        const end = new Date(end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Vérifier le solde disponible
        const currentYear = new Date().getFullYear();
        const soldeResult = await pool.query(
            `SELECT restant_jours FROM solde_conges 
             WHERE utilisateur_id = $1 AND annee = $2 AND type_conge_id = $3`,
            [userId, currentYear, type_id]
        );
        
        if (soldeResult.rows.length > 0) {
            const restant = parseFloat(soldeResult.rows[0].restant_jours);
            if (restant < days && type_id !== 3) { // Type 3 = Congé sans solde
                return res.status(400).json({ 
                    message: `Solde insuffisant. Il vous reste ${restant} jours.` 
                });
            }
        }
        
        const result = await pool.query(
            `INSERT INTO demandes_conges 
             (utilisateur_id, type_conge_id, date_debut, date_fin, nombre_jours, motif, statut)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending_manager')
             RETURNING id`,
            [userId, type_id, start_date, end_date, days, motif]
        );
        
        // Récupérer le manager de l'employe
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
                         '${employe.prenom} ${employe.nom} a fait une demande de conge du ${start_date} au ${end_date} (${days} jours)', 
                         '/dashboard/manager/validations', NOW())`,
                [managerId]
            );
            
            console.log(`Notification envoyee au manager ID: ${managerId}`);
        } else {
            console.log(`L employe ${userId} n a pas de manager assigne`);
        }
        
        res.status(201).json({ 
            message: 'Demande creee avec succes, en attente de validation par votre manager',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Erreur create request:', error);
        res.status(500).json({ message: 'Erreur lors de la creation: ' + error.message });
    }
});

// MODIFIER une demande de congé (uniquement si en attente pending_manager)
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
                message: 'Demande non trouvable ou deja traitee. Seules les demandes en attente peuvent etre modifiees.' 
            });
        }
        
        const demande = requestCheck.rows[0];
        
        const start = new Date(start_date);
        const end = new Date(end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
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
                 VALUES ($1, 'demande_modifiee', 'Demande de conge modifiee',
                         '${demande.prenom} ${demande.nom} a modifie sa demande de conge (anciennement: ${oldDates}). Veuillez la revalider.',
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id]
            );
        }
        
        await pool.query(
            `INSERT INTO logs_application (utilisateur_id, action, entite_type, entite_id, cree_le)
             VALUES ($1, 'MODIFIER_DEMANDE_CONGE', 'demandes_conges', $2, NOW())`,
            [userId, requestId]
        );
        
        console.log(`Demande ${requestId} modifiee par l'utilisateur ${userId}`);
        
        res.json({ 
            message: 'Demande modifiee avec succes. Votre manager a ete notifie du changement.',
            old_dates: oldDates,
            new_dates: `${start_date} -> ${end_date}`
        });
        
    } catch (error) {
        console.error('Erreur update request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ANNULER une demande de congé (uniquement si en attente pending_manager)
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
                message: 'Demande non trouvable ou deja traitee. Impossible d annuler.' 
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
                         '${demande.prenom} ${demande.nom} a annule sa demande de conge (${demande.date_debut} -> ${demande.date_fin}).',
                         '/dashboard/manager/validations', NOW())`,
                [demande.manager_id]
            );
        }
        
        await pool.query(
            `INSERT INTO logs_application (utilisateur_id, action, entite_type, entite_id, cree_le)
             VALUES ($1, 'ANNULER_DEMANDE_CONGE', 'demandes_conges', $2, NOW())`,
            [userId, requestId]
        );
        
        console.log(`Demande ${requestId} annulee par l'utilisateur ${userId}`);
        
        res.json({ message: 'Demande annulee avec succes.' });
        
    } catch (error) {
        console.error('Erreur cancel request:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ VALIDATION PAR MANAGER (1ere etape) ============

router.get('/team-pending', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const result = await pool.query(
            `SELECT dc.*, u.nom, u.prenom, u.email, u.service, tc.nom as type_name
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE u.manager_id = $1 AND dc.statut = 'pending_manager'
             ORDER BY dc.cree_le ASC`,
            [managerId]
        );
        
        console.log(`Demandes en attente pour manager ${managerId}: ${result.rows.length}`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur team pending:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/manager-approve/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.statut = 'pending_manager'`,
            [requestId]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvee ou deja traitee' });
        }
        
        const demande = requestResult.rows[0];
        
        if (demande.manager_id !== managerId) {
            return res.status(403).json({ message: 'Vous n etes pas le manager de cet employe' });
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
                     'Votre demande de conge a ete validee par votre manager. En attente de validation finale par l administrateur.', 
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
                 VALUES ($1, 'validation_requise', 'Demande a valider definitivement', 
                         'Une demande de conge de ${demande.prenom} ${demande.nom} a ete pre-approuvee par le manager et attend votre validation finale.', 
                         '/dashboard/admin', NOW())`,
                [adminResult.rows[0].id]
            );
        }
        
        console.log(`Demande ${requestId} pre-approuvee par manager ${managerId}`);
        
        res.json({ message: 'Demande pre-approuvee, en attente de validation finale par l administrateur' });
        
    } catch (error) {
        console.error('Erreur manager approve:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

router.put('/manager-reject/:id', authMiddleware, async (req, res) => {
    const requestId = req.params.id;
    const managerId = req.user.id;
    const { motif } = req.body;
    const motifFinal = motif || 'Non specifie';
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, u.manager_id, u.nom, u.prenom, u.email
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.statut = 'pending_manager'`,
            [requestId]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvee ou deja traitee' });
        }
        
        const demande = requestResult.rows[0];
        
        if (demande.manager_id !== managerId) {
            return res.status(403).json({ message: 'Vous n etes pas le manager de cet employe' });
        }
        
        await pool.query(
            `UPDATE demandes_conges 
             SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
             WHERE id = $3`,
            [managerId, motifFinal, requestId]
        );
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'refus_manager', 'Demande de conge refusee', 
                     'Votre demande de conge a ete refusee par votre manager.\n\nMotif : ${motifFinal}', 
                     '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id]
        );
        
        console.log(`Demande ${requestId} refusee par manager ${managerId}`);
        
        res.json({ message: 'Demande refusee', motif: motifFinal });
        
    } catch (error) {
        console.error('Erreur manager reject:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

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
        res.json({ message: 'Notification marquee comme lue' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;