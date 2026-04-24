// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

// Récupérer tous les utilisateurs
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut,
                    array_agg(r.nom) as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             GROUP BY u.id`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les employés de l'équipe du manager (déjà assignés)
router.get('/my-team', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service, u.poste, u.date_embauche
             FROM users u
             WHERE u.manager_id = $1
             ORDER BY u.nom ASC`,
            [managerId]
        );
        
        console.log(`👥 Manager ${managerId} a ${result.rows.length} membres dans son equipe`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur my-team:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// NOUVEAU - Récupérer les informations du manager de l'employé connecté
router.get('/my-manager', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Récupérer le manager_id de l'employé
        const userResult = await pool.query(
            `SELECT manager_id FROM users WHERE id = $1`,
            [userId]
        );
        
        const managerId = userResult.rows[0]?.manager_id;
        
        if (!managerId) {
            return res.status(404).json({ 
                message: 'Vous n\'avez pas de manager assigné. Veuillez contacter votre administrateur.' 
            });
        }
        
        // Récupérer les informations du manager
        const managerResult = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.poste,
                    COUNT(DISTINCT e.id) as team_count
             FROM users u
             LEFT JOIN users e ON e.manager_id = u.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [managerId]
        );
        
        if (managerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Manager non trouvé' });
        }
        
        console.log(`📋 Infos manager pour employé ${userId}:`, managerResult.rows[0]);
        res.json(managerResult.rows[0]);
        
    } catch (error) {
        console.error('Erreur my-manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les employés disponibles (sans manager)
router.get('/available-employees', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'employe' 
             AND (u.manager_id IS NULL OR u.manager_id = 0)
             AND u.id != $1
             ORDER BY u.nom ASC`,
            [managerId]
        );
        
        console.log(`📋 Employés disponibles pour manager ${managerId}: ${result.rows.length}`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur available-employees:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer TOUS les employés (pour admin)
router.get('/all-employees', authMiddleware, requireRoles(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service, u.manager_id,
                    CONCAT(manager.nom, ' ', manager.prenom) as manager_name
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             LEFT JOIN users manager ON manager.id = u.manager_id
             WHERE r.nom = 'employe'
             ORDER BY u.nom ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur all-employees:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Ajouter un membre à l'équipe (par manager)
router.post('/add-team-member', authMiddleware, async (req, res) => {
    const { employee_id } = req.body;
    const managerId = req.user.id;
    
    try {
        console.log(`🔵 Tentative d'ajout: manager ${managerId}, employee ${employee_id}`);
        
        // Vérifier que l'utilisateur est manager
        const roleCheck = await pool.query(
            `SELECT COUNT(*) FROM utilisateurs_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.utilisateur_id = $1 AND r.nom = 'manager'`,
            [managerId]
        );
        
        if (parseInt(roleCheck.rows[0].count) === 0) {
            return res.status(403).json({ message: 'Accès réservé aux managers' });
        }
        
        // Vérifier si l'employé existe et est bien un employé
        const employeeCheck = await pool.query(
            `SELECT u.id, u.manager_id, u.nom, u.prenom
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1 AND r.nom = 'employe'`,
            [employee_id]
        );
        
        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Employé non trouvé' });
        }
        
        const employe = employeeCheck.rows[0];
        
        // Vérifier si l'employé a déjà un manager
        if (employe.manager_id && employe.manager_id !== managerId) {
            return res.status(400).json({ 
                message: `Cet employé (${employe.prenom} ${employe.nom}) est déjà rattaché à un autre manager.` 
            });
        }
        
        // Assigner le manager à l'employé
        await pool.query(
            `UPDATE users SET manager_id = $1, modifie_le = NOW() WHERE id = $2`,
            [managerId, employee_id]
        );
        
        console.log(`✅ Manager ${managerId} assigné à l'employé ${employee_id}`);
        
        // Log l'action
        await pool.query(
            `INSERT INTO logs_application (utilisateur_id, action, entite_type, entite_id, cree_le)
             VALUES ($1, 'ADD_TEAM_MEMBER', 'users', $2, NOW())`,
            [managerId, employee_id]
        );
        
        // Créer une notification pour l'employé
        const managerInfo = await pool.query(
            `SELECT nom, prenom FROM users WHERE id = $1`,
            [managerId]
        );
        const manager = managerInfo.rows[0];
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'team_added', 'Nouveau manager', 
                     'Vous avez ete ajoute a l equipe de ${manager.prenom} ${manager.nom}. Vous pouvez maintenant faire des demandes de conge.', 
                     '/dashboard/employee', NOW())`,
            [employee_id]
        );
        
        res.json({ message: 'Membre ajouté à votre équipe avec succès' });
        
    } catch (error) {
        console.error('Erreur ajout membre:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// Supprimer un membre de l'équipe
router.delete('/remove-team-member/:employeeId', authMiddleware, async (req, res) => {
    const { employeeId } = req.params;
    const managerId = req.user.id;
    
    try {
        // Vérifier que l'employé appartient bien à ce manager
        const checkResult = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND manager_id = $2`,
            [employeeId, managerId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Employé non trouvé dans votre équipe' });
        }
        
        // Retirer le manager
        await pool.query(
            `UPDATE users SET manager_id = NULL, modifie_le = NOW() WHERE id = $1`,
            [employeeId]
        );
        
        console.log(`✅ Employé ${employeeId} retiré de l'équipe du manager ${managerId}`);
        
        res.json({ message: 'Membre retiré de l\'équipe' });
        
    } catch (error) {
        console.error('Erreur remove member:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les employés (pour manager) - Ancienne méthode conservée pour compatibilité
router.get('/employees', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'employe'
             AND (u.manager_id IS NULL OR u.manager_id = 0)
             AND u.id != $1
             ORDER BY u.nom ASC`,
            [managerId]
        );
        
        console.log(`📋 Employés disponibles pour manager ${managerId}: ${result.rows.length}`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur employees:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut, u.manager_id,
                    array_agg(r.nom) as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;