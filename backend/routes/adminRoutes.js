// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');
const { 
    sendAdminApprovalEmail, 
    sendAdminRejectionEmail,
    sendManagerApprovalEmail,
    sendManagerRejectionEmail
} = require('../utils/emailService');

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
            `SELECT COUNT(*) FROM solde_conges WHERE restant_jours < 5 AND annee = $1 AND type_conge_id = 1`,
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

// ============ STATISTIQUES PAR MOIS (TOUS LES MOIS) ============
router.get('/stats-by-month', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        
        const result = await pool.query(`
            SELECT 
                mois_num,
                mois_nom,
                COALESCE(total, 0) as total
            FROM (
                VALUES 
                    (1, 'Janvier'), (2, 'Février'), (3, 'Mars'),
                    (4, 'Avril'), (5, 'Mai'), (6, 'Juin'),
                    (7, 'Juillet'), (8, 'Août'), (9, 'Septembre'),
                    (10, 'Octobre'), (11, 'Novembre'), (12, 'Décembre')
            ) AS months(mois_num, mois_nom)
            LEFT JOIN (
                SELECT 
                    EXTRACT(MONTH FROM date_debut) as mois,
                    COUNT(*) as total
                FROM demandes_conges
                WHERE EXTRACT(YEAR FROM date_debut) = $1
                GROUP BY EXTRACT(MONTH FROM date_debut)
            ) AS stats ON months.mois_num = stats.mois
            ORDER BY mois_num ASC
        `, [year]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur stats-by-month:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ STATISTIQUES PAR TYPE ============
router.get('/stats-by-type', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                type_id,
                type_nom,
                COALESCE(total, 0) as total
            FROM (
                VALUES 
                    (1, 'Congés Payés'),
                    (2, 'Congé sans solde')
            ) AS types(type_id, type_nom)
            LEFT JOIN (
                SELECT 
                    type_conge_id,
                    COUNT(*) as total
                FROM demandes_conges
                GROUP BY type_conge_id
            ) AS stats ON types.type_id = stats.type_conge_id
            ORDER BY type_id ASC
        `);
        
        const formattedResult = result.rows.map(row => ({
            type: row.type_nom,
            total: parseInt(row.total) || 0
        }));
        
        console.log('Stats par type:', formattedResult);
        res.json(formattedResult);
    } catch (error) {
        console.error('Erreur stats-by-type:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ ANNÉES DISPONIBLES ============
router.get('/available-years', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT EXTRACT(YEAR FROM date_debut) as annee
            FROM demandes_conges
            UNION
            SELECT EXTRACT(YEAR FROM CURRENT_DATE) as annee
            ORDER BY annee DESC
        `);
        
        const years = result.rows.map(row => parseInt(row.annee));
        if (years.length === 0) {
            years.push(new Date().getFullYear());
        }
        
        res.json(years);
    } catch (error) {
        console.error('Erreur available-years:', error);
        res.json([new Date().getFullYear()]);
    }
});

// ============ DEMANDES FILTRÉES PAR PÉRIODE ============
router.get('/leave-requests-filtered', async (req, res) => {
    const { periode } = req.query;
    
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
        const result = await pool.query(`
            SELECT dc.id,
                    TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                    TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                    dc.nombre_jours, dc.statut, dc.cree_le,
                    u.nom, u.prenom,
                    CASE 
                        WHEN dc.type_conge_id = 1 THEN 'Congés Payés'
                        ELSE 'Congé sans solde'
                    END as type_name
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE 1=1 ${dateCondition}
             ORDER BY dc.cree_le DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur leave-requests-filtered:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ GESTION DES UTILISATEURS ============

router.get('/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut, u.salaire_base,
                    array_agg(r.nom) as roles, u.cree_le
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

router.get('/employees-only', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service, u.salaire_base
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'employe'
             AND NOT EXISTS (
                 SELECT 1 FROM utilisateurs_roles ur2 
                 WHERE ur2.utilisateur_id = u.id AND ur2.role_id IN (
                     SELECT id FROM roles WHERE nom IN ('manager', 'admin')
                 )
             )
             ORDER BY u.nom ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur employees-only:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ EMPLOYÉS POUR LA PAIE ============
router.get('/employees-for-payroll', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.nom, 
                u.prenom, 
                u.email, 
                u.service, 
                u.statut, 
                COALESCE(u.salaire_base, 500000) as salaire_base,
                COALESCE(array_agg(DISTINCT r.nom) FILTER (WHERE r.nom IS NOT NULL), '{}') as roles
            FROM users u
            LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY u.id
            ORDER BY u.nom ASC
        `);
        
        const employes = result.rows.filter(user => 
            user.roles.includes('employe') || user.roles.includes('manager')
        );
        
        res.json(employes);
    } catch (error) {
        console.error('Erreur employees-for-payroll:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/create-employee', async (req, res) => {
    const { nom, prenom, email, password, telephone, service, salaire_base } = req.body;
    
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        const employeRole = await pool.query('SELECT id FROM roles WHERE nom = $1', ['employe']);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userResult = await pool.query(
            `INSERT INTO users (nom, prenom, email, password_hash, telephone, service, statut, salaire_base, cree_le)
             VALUES ($1, $2, $3, $4, $5, $6, 'actif', $7, NOW())
             RETURNING id`,
            [nom, prenom, email, hashedPassword, telephone || null, service || null, salaire_base || 500000]
        );
        
        const userId = userResult.rows[0].id;
        
        await pool.query(
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id)
             VALUES ($1, $2)`,
            [userId, employeRole.rows[0].id]
        );
        
        const currentYear = new Date().getFullYear();
        await pool.query(
            `INSERT INTO solde_conges (utilisateur_id, annee, type_conge_id, total_jours, restant_jours)
             VALUES ($1, $2, 1, 25, 25)`,
            [userId, currentYear]
        );
        
        res.status(201).json({ message: 'Employé créé avec succès' });
        
    } catch (error) {
        console.error('Erreur création employé:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/promote-to-manager', async (req, res) => {
    const { userId } = req.body;
    
    try {
        const userCheck = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.salaire_base, array_agg(r.nom) as roles
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
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id)
             VALUES ($1, $2)`,
            [userId, managerRole.rows[0].id]
        );
        
        await pool.query(
            `UPDATE users SET salaire_base = 1000000 WHERE id = $1 AND salaire_base < 1000000`,
            [userId]
        );
        
        res.json({ message: `${user.prenom} ${user.nom} est maintenant manager ! Salaire mis à jour à 1 000 000 Ar` });
        
    } catch (error) {
        console.error('Erreur promotion manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/users/:id', async (req, res) => {
    const { nom, prenom, email, telephone, service, statut, salaire_base } = req.body;
    const userId = req.params.id;
    
    try {
        await pool.query(
            `UPDATE users SET 
                nom = $1, prenom = $2, email = $3, telephone = $4, service = $5, statut = $6, salaire_base = $7
             WHERE id = $8`,
            [nom, prenom, email, telephone || null, service || null, statut || 'actif', salaire_base || 500000, userId]
        );
        
        res.json({ message: 'Utilisateur modifié avec succès' });
        
    } catch (error) {
        console.error('Erreur modification:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/users/:id/reset-password', async (req, res) => {
    const userId = req.params.id;
    const { password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('Erreur reset password:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM demandes_conges WHERE utilisateur_id = $1', [req.params.id]);
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/export-users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut, u.salaire_base,
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
            'Salaire de base': `${row.salaire_base || 0} Ar`,
            'Rôle': row.roles.join(', '),
            'Statut': row.statut === 'actif' ? 'Actif' : 'Inactif'
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=utilisateurs.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ EXPORT DEMANDES EXCEL ============
router.get('/export-demandes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.nom, 
                u.prenom, 
                COALESCE(u.service, '-') as service,
                CASE 
                    WHEN dc.type_conge_id = 1 THEN 'Congés Payés'
                    ELSE 'Congé sans solde'
                END as type_conge,
                TO_CHAR(dc.date_debut, 'DD/MM/YYYY') as date_debut,
                TO_CHAR(dc.date_fin, 'DD/MM/YYYY') as date_fin,
                dc.nombre_jours,
                CASE 
                    WHEN dc.statut = 'approved' THEN 'Approuvé'
                    WHEN dc.statut = 'pending_manager' THEN 'En attente manager'
                    WHEN dc.statut = 'pending_admin' THEN 'En attente admin'
                    WHEN dc.statut = 'rejected' THEN 'Refusé'
                    ELSE dc.statut
                END as statut,
                TO_CHAR(dc.cree_le, 'DD/MM/YYYY HH24:MI') as date_demande,
                COALESCE(dc.motif, '-') as motif,
                COALESCE(dc.motif_refus, '-') as motif_refus,
                COALESCE(m.prenom || ' ' || m.nom, '-') as manager_nom
            FROM demandes_conges dc
            JOIN users u ON dc.utilisateur_id = u.id
            LEFT JOIN users m ON u.manager_id = m.id
            ORDER BY dc.cree_le DESC
        `);
        
        const ws = XLSX.utils.json_to_sheet(result.rows);
        ws['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
            { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
            { wch: 18 }, { wch: 30 }, { wch: 30 }, { wch: 20 }
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Demandes_Conges');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=demandes_conges_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        
    } catch (error) {
        console.error('Erreur export demandes:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ VALIDATION ADMIN ============

router.get('/pending-approvals', async (req, res) => {
    try {
        const congesResult = await pool.query(
            `SELECT dc.id, 
                    TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                    TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                    dc.nombre_jours, dc.motif, dc.statut,
                    u.nom, u.prenom, u.email, u.service,
                    CASE 
                        WHEN dc.type_conge_id = 1 THEN 'Congés Payés'
                        ELSE 'Congé sans solde'
                    END as type_name,
                    m.nom as manager_nom, m.prenom as manager_prenom,
                    'conges' as request_type,
                    dc.date_approbation
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             LEFT JOIN users m ON dc.approbateur_id = m.id
             WHERE dc.statut = 'pending_admin'
             ORDER BY dc.date_approbation ASC`
        );
        
        res.json(congesResult.rows);
    } catch (error) {
        console.error('Erreur pending approvals:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ FINAL APPROVE (avec email pour manager) ============
router.put('/final-approve/:id', async (req, res) => {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const io = req.app.get('io');
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, u.nom, u.prenom, u.email, u.manager_id, u.roles
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.statut = 'pending_admin'`,
            [requestId]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
        }
        
        const demande = requestResult.rows[0];
        const demandeurRoles = demande.roles || [];
        const estManager = demandeurRoles.includes('manager');
        
        await pool.query(
            `UPDATE demandes_conges 
             SET statut = 'approved', approbateur_id = $1, date_approbation = NOW()
             WHERE id = $2`,
            [adminId, requestId]
        );
        
        if (demande.type_conge_id === 1) {
            const currentYear = new Date().getFullYear();
            await pool.query(
                `UPDATE solde_conges 
                 SET pris_jours = pris_jours + $1, restant_jours = restant_jours - $1
                 WHERE utilisateur_id = $2 AND annee = $3 AND type_conge_id = 1`,
                [demande.nombre_jours, demande.utilisateur_id, currentYear]
            );
        }
        
        // Notification pour le demandeur
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'approuve_final', 'Congé définitivement approuvé', 
             $2, '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id, `Votre demande de congé du ${demande.date_debut} au ${demande.date_fin} a été définitivement approuvée.`]
        );
        
        io.to(`user_${demande.utilisateur_id}`).emit('new_notification', {
            titre: 'Congé définitivement approuvé',
            message: `Votre demande de congé du ${demande.date_debut} au ${demande.date_fin} a été approuvée.`,
            lien: '/dashboard/employee/requests'
        });
        
        // EMAIL POUR LE DEMANDEUR (employé OU manager)
        try {
            if (estManager) {
                await sendManagerApprovalEmail(
                    demande.email,
                    `${demande.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    demande.nombre_jours
                );
                console.log(`✅ Email d'approbation envoyé au manager ${demande.email}`);
            } else {
                await sendAdminApprovalEmail(
                    demande.email,
                    `${demande.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    demande.nombre_jours
                );
                console.log(`✅ Email d'approbation envoyé à l'employé ${demande.email}`);
            }
        } catch (emailError) {
            console.error('Erreur envoi email approbation:', emailError);
        }
        
        // Notification pour le manager (si la demande vient d'un employé)
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'approuve_final_manager', 'Demande de congé approuvée', 
                 $2, '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `La demande de congé de ${demande.prenom} ${demande.nom} a été définitivement approuvée.`]
            );
            
            io.to(`user_${demande.manager_id}`).emit('new_notification', {
                titre: 'Demande approuvée',
                message: `La demande de ${demande.prenom} ${demande.nom} a été approuvée.`,
                lien: '/dashboard/manager/validations'
            });
        }
        
        // Si le demandeur est manager, envoyer aussi une notification à son manager (si existant)
        if (estManager) {
            const managerOfManager = await pool.query(`SELECT manager_id, email, prenom FROM users WHERE id = $1`, [demande.utilisateur_id]);
            const managerId = managerOfManager.rows[0]?.manager_id;
            
            if (managerId) {
                const managerInfo = await pool.query(`SELECT email, prenom FROM users WHERE id = $1`, [managerId]);
                if (managerInfo.rows.length > 0) {
                    const manager = managerInfo.rows[0];
                    await sendManagerApprovalEmail(
                        manager.email,
                        `${manager.prenom}`,
                        `Le manager ${demande.prenom} ${demande.nom}`,
                        `${demande.date_debut} au ${demande.date_fin}`,
                        demande.nombre_jours
                    );
                    console.log(`✅ Email d'approbation envoyé au manager du manager: ${manager.email}`);
                }
            }
        }
        
        res.json({ message: 'Demande définitivement approuvée' });
        
    } catch (error) {
        console.error('Erreur final approve:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ FINAL REJECT (avec email pour manager) ============
router.put('/final-reject/:id', async (req, res) => {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { motif } = req.body;
    const motifFinal = motif || 'Non spécifié';
    const io = req.app.get('io');
    
    try {
        const requestResult = await pool.query(
            `SELECT dc.*, u.nom, u.prenom, u.email, u.manager_id, u.roles
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             WHERE dc.id = $1 AND dc.statut = 'pending_admin'`,
            [requestId]
        );
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Demande non trouvée ou déjà traitée' });
        }
        
        const demande = requestResult.rows[0];
        const demandeurRoles = demande.roles || [];
        const estManager = demandeurRoles.includes('manager');
        
        await pool.query(
            `UPDATE demandes_conges 
             SET statut = 'rejected', approbateur_id = $1, date_approbation = NOW(), motif_refus = $2
             WHERE id = $3`,
            [adminId, motifFinal, requestId]
        );
        
        // Notification pour le demandeur
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'refus_admin', 'Demande de congé refusée', 
             $2, '/dashboard/employee/requests', NOW())`,
            [demande.utilisateur_id, `Votre demande de congé a été refusée par l'administrateur. Motif : ${motifFinal}`]
        );
        
        io.to(`user_${demande.utilisateur_id}`).emit('new_notification', {
            titre: 'Demande refusée',
            message: `Votre demande de congé a été refusée. Motif : ${motifFinal}`,
            lien: '/dashboard/employee/requests'
        });
        
        // EMAIL POUR LE DEMANDEUR (employé OU manager)
        try {
            if (estManager) {
                await sendManagerRejectionEmail(
                    demande.email,
                    `${demande.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    motifFinal
                );
                console.log(`✅ Email de refus envoyé au manager ${demande.email}`);
            } else {
                await sendAdminRejectionEmail(
                    demande.email,
                    `${demande.prenom} ${demande.nom}`,
                    `${demande.date_debut} au ${demande.date_fin}`,
                    motifFinal
                );
                console.log(`✅ Email de refus envoyé à l'employé ${demande.email}`);
            }
        } catch (emailError) {
            console.error('Erreur envoi email refus:', emailError);
        }
        
        // Notification pour le manager (si la demande vient d'un employé)
        if (demande.manager_id) {
            await pool.query(
                `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                 VALUES ($1, 'refus_admin_manager', 'Demande de congé refusée', 
                 $2, '/dashboard/manager/validations', NOW())`,
                [demande.manager_id, `La demande de congé de ${demande.prenom} ${demande.nom} a été refusée définitivement.`]
            );
            
            io.to(`user_${demande.manager_id}`).emit('new_notification', {
                titre: 'Demande refusée',
                message: `La demande de ${demande.prenom} ${demande.nom} a été refusée.`,
                lien: '/dashboard/manager/validations'
            });
        }
        
        // Si le demandeur est manager, envoyer aussi une notification à son manager (si existant)
        if (estManager) {
            const managerOfManager = await pool.query(`SELECT manager_id, email, prenom FROM users WHERE id = $1`, [demande.utilisateur_id]);
            const managerId = managerOfManager.rows[0]?.manager_id;
            
            if (managerId) {
                const managerInfo = await pool.query(`SELECT email, prenom FROM users WHERE id = $1`, [managerId]);
                if (managerInfo.rows.length > 0) {
                    const manager = managerInfo.rows[0];
                    await sendManagerRejectionEmail(
                        manager.email,
                        `${manager.prenom}`,
                        `La demande du manager ${demande.prenom} ${demande.nom}`,
                        motifFinal
                    );
                    console.log(`✅ Email de refus envoyé au manager du manager: ${manager.email}`);
                }
            }
        }
        
        res.json({ message: 'Demande définitivement refusée' });
        
    } catch (error) {
        console.error('Erreur final reject:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/leave-requests', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT dc.id,
                    TO_CHAR(dc.date_debut, 'YYYY-MM-DD') as date_debut,
                    TO_CHAR(dc.date_fin, 'YYYY-MM-DD') as date_fin,
                    dc.nombre_jours, dc.statut, dc.cree_le,
                    u.nom, u.prenom,
                    CASE 
                        WHEN dc.type_conge_id = 1 THEN 'Congés Payés'
                        ELSE 'Congé sans solde'
                    END as type_name
             FROM demandes_conges dc
             JOIN users u ON dc.utilisateur_id = u.id
             ORDER BY dc.cree_le DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur leave-requests:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ PARAMÈTRES ============
router.get('/settings', async (req, res) => {
    res.json({
        cp_jours_par_an: 25,
        max_conges_consecutifs: 20,
        preavis_minimum: 2
    });
});

router.put('/settings', async (req, res) => {
    res.json({ message: 'Paramètres enregistrés !' });
});

// ============ GESTION DES MANAGERS ============

router.put('/assign-manager/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { managerId } = req.body;
    
    try {
        await pool.query(`UPDATE users SET manager_id = $1 WHERE id = $2`, [managerId, employeeId]);
        res.json({ message: 'Manager assigné avec succès' });
    } catch (error) {
        console.error('Erreur assign manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

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

// ============ NOTIFICATIONS ADMIN ============
router.get('/notifications', async (req, res) => {
    try {
        const adminId = req.user.id;
        
        const pendingValidations = await pool.query(`
            SELECT 
                'validation_requise' as type,
                'Demande à valider' as titre,
                CONCAT(u.prenom, ' ', u.nom, ' a fait une demande de ', 
                    CASE WHEN dc.type_conge_id = 1 THEN 'congés payés' ELSE 'congé sans solde' END,
                    ' du ', TO_CHAR(dc.date_debut, 'DD/MM/YYYY'), ' au ', TO_CHAR(dc.date_fin, 'DD/MM/YYYY')) as message,
                '/dashboard/admin' as lien,
                dc.cree_le as cree_le,
                false as est_lu
            FROM demandes_conges dc
            JOIN users u ON dc.utilisateur_id = u.id
            WHERE dc.statut = 'pending_admin'
            ORDER BY dc.cree_le DESC
            LIMIT 20
        `);
        
        const adminNotifications = await pool.query(`
            SELECT * FROM notifications 
            WHERE utilisateur_id = $1 OR (utilisateur_id IS NULL AND type IN ('admin_broadcast', 'system'))
            ORDER BY cree_le DESC 
            LIMIT 20
        `, [adminId]);
        
        const allNotifications = [...pendingValidations.rows, ...adminNotifications.rows];
        allNotifications.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
        
        res.json(allNotifications.slice(0, 20));
    } catch (error) {
        console.error('Erreur notifications admin:', error);
        res.json([]);
    }
});

router.put('/notifications/:id/read', async (req, res) => {
    try {
        await pool.query(`UPDATE notifications SET est_lu = true WHERE id = $1 AND utilisateur_id = $2`, 
            [req.params.id, req.user.id]);
        res.json({ message: 'Notification lue' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ LOGS ============
router.get('/logs', async (req, res) => {
    res.json([]);
});

module.exports = router;