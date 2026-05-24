// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

router.get('/my-team', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service
             FROM users u WHERE u.manager_id = $1 ORDER BY u.nom ASC`,
            [managerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur my-team:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/my-manager', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Récupérer le manager de l'utilisateur
        const userResult = await pool.query(
            `SELECT manager_id FROM users WHERE id = $1`,
            [userId]
        );
        
        const managerId = userResult.rows[0]?.manager_id;
        
        if (!managerId) {
            return res.status(404).json({ message: 'Aucun manager assigné' });
        }
        
        // Récupérer les infos du manager
        const managerResult = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service,
                    COUNT(DISTINCT e.id) as team_count
             FROM users u
             LEFT JOIN users e ON e.manager_id = u.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [managerId]
        );
        
        res.json(managerResult.rows[0]);
    } catch (error) {
        console.error('Erreur my-manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/available-employees', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'employe' AND (u.manager_id IS NULL OR u.manager_id = 0)
             AND u.id != $1
             ORDER BY u.nom ASC`,
            [managerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur available-employees:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/add-team-member', authMiddleware, async (req, res) => {
    const { employee_id } = req.body;
    const managerId = req.user.id;
    
    try {
        const roleCheck = await pool.query(
            `SELECT COUNT(*) FROM utilisateurs_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.utilisateur_id = $1 AND r.nom = 'manager'`,
            [managerId]
        );
        
        if (parseInt(roleCheck.rows[0].count) === 0) {
            return res.status(403).json({ message: 'Accès réservé aux managers' });
        }
        
        await pool.query(`UPDATE users SET manager_id = $1 WHERE id = $2`, [managerId, employee_id]);
        
        const managerInfo = await pool.query(`SELECT nom, prenom FROM users WHERE id = $1`, [managerId]);
        const manager = managerInfo.rows[0];
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'team_added', 'Nouveau manager', 
                     'Vous avez été ajouté à l équipe de ${manager.prenom} ${manager.nom}.', 
                     '/dashboard/employee', NOW())`,
            [employee_id]
        );
        
        res.json({ message: 'Membre ajouté' });
    } catch (error) {
        console.error('Erreur ajout membre:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/remove-team-member/:employeeId', authMiddleware, async (req, res) => {
    const { employeeId } = req.params;
    const managerId = req.user.id;
    
    try {
        await pool.query(`UPDATE users SET manager_id = NULL WHERE id = $1 AND manager_id = $2`, [employeeId, managerId]);
        res.json({ message: 'Membre retiré' });
    } catch (error) {
        console.error('Erreur remove member:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;