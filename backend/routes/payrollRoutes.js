// backend/routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

router.use(authMiddleware);

// ============ STATISTIQUES ============
router.get('/stats', requireRoles(['admin']), async (req, res) => {
    try {
        const totalNet = await pool.query(`SELECT COALESCE(SUM(net_a_payer), 0) as total FROM paie_employes WHERE statut = 'paye'`);
        
        const totalEmployes = await pool.query(`
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.nom = 'employe'
        `);
        
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const payesCeMois = await pool.query(`
            SELECT COUNT(*) as total FROM paie_employes 
            WHERE statut = 'paye' AND mois = $1 AND annee = $2
        `, [currentMonth, currentYear]);
        
        res.json({
            total_employes_payes: parseInt(payesCeMois.rows[0].total) || 0,
            total_net: parseFloat(totalNet.rows[0].total) || 0,
            employes_non_payes: Math.max(0, parseInt(totalEmployes.rows[0].total) - parseInt(payesCeMois.rows[0].total)),
            moyenne_salaire: 0
        });
    } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ ADMIN ============

router.get('/tous-bulletins', requireRoles(['admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.nom, u.prenom, u.email, u.service
            FROM paie_employes p
            JOIN users u ON p.utilisateur_id = u.id
            ORDER BY p.annee DESC, p.mois DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur tous-bulletins:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/generer-bulletin', requireRoles(['admin']), async (req, res) => {
    const { utilisateur_id, mois, annee, salaire_base, prime } = req.body;

    try {
        const userCheck = await pool.query(`
            SELECT u.id, u.salaire_base, 
                   array_agg(r.nom) as roles
            FROM users u
            LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = $1
            GROUP BY u.id
        `, [utilisateur_id]);
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Employé non trouvé' });
        }

        const existCheck = await pool.query(
            `SELECT id FROM paie_employes WHERE utilisateur_id = $1 AND mois = $2 AND annee = $3`,
            [utilisateur_id, mois, annee]
        );

        if (existCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Un bulletin existe déjà pour cette période' });
        }

        // Utiliser le salaire saisi ou le salaire de base de l'utilisateur
        const salaireBaseUtilise = salaire_base || userCheck.rows[0].salaire_base || 500000;

        // Calculer les absences non payées (congés sans solde - type_conge_id = 2)
        const absences = await pool.query(`
            SELECT COALESCE(SUM(nombre_jours), 0) as jours_absence
            FROM demandes_conges
            WHERE utilisateur_id = $1 
            AND statut = 'approved' 
            AND type_conge_id = 2
            AND EXTRACT(MONTH FROM date_debut) = $2 
            AND EXTRACT(YEAR FROM date_debut) = $3
        `, [utilisateur_id, mois, annee]);

        const joursAbsence = parseInt(absences.rows[0].jours_absence || 0);
        const joursOuvres = 22;
        const tauxJournalier = salaireBaseUtilise / joursOuvres;
        const retenueAbsence = Math.round(tauxJournalier * joursAbsence * 100) / 100;
        
        // Calcul du salaire brut avec prime unique
        const salaireBrut = parseFloat(salaireBaseUtilise) + parseFloat(prime || 0);
        const netAPayer = Math.round((salaireBrut - retenueAbsence) * 100) / 100;

        const result = await pool.query(
            `INSERT INTO paie_employes 
             (utilisateur_id, mois, annee, salaire_base, salaire_brut, 
              prime_transport, jours_absence_non_paye, retenue_absence, net_a_payer, statut)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'valide')
             RETURNING *`,
            [utilisateur_id, mois, annee, salaireBaseUtilise, salaireBrut, 
             prime || 0, joursAbsence, retenueAbsence, netAPayer]
        );

        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'bulletin_paie', 'Bulletin de paie disponible', 
             $2, '/dashboard/employee/payroll', NOW())`,
            [utilisateur_id, `Votre bulletin de paie pour ${moisNoms[mois - 1]} ${annee} est disponible. Net : ${netAPayer.toFixed(0)} Ar`]
        );

        res.status(201).json({ message: 'Bulletin généré avec succès', bulletin: result.rows[0] });

    } catch (error) {
        console.error('Erreur génération bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ GÉNÉRER POUR TOUS LES EMPLOYÉS ============
router.post('/generer-bulletins-equipe', requireRoles(['admin']), async (req, res) => {
    const { mois, annee } = req.body;
    
    try {
        const employes = await pool.query(`
            SELECT DISTINCT u.id, u.nom, u.prenom, u.salaire_base,
                   array_agg(r.nom) as roles
            FROM users u
            JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.nom = 'employe'
            GROUP BY u.id
            ORDER BY u.nom ASC
        `);
        
        let successCount = 0;
        let errorCount = 0;
        let details = [];
        
        for (const employe of employes.rows) {
            try {
                const existCheck = await pool.query(
                    `SELECT id FROM paie_employes WHERE utilisateur_id = $1 AND mois = $2 AND annee = $3`,
                    [employe.id, mois, annee]
                );
                
                if (existCheck.rows.length === 0) {
                    // Utiliser le salaire individuel de l'employé
                    const salaireBase = employe.salaire_base || 500000;
                    
                    const absences = await pool.query(`
                        SELECT COALESCE(SUM(nombre_jours), 0) as jours_absence
                        FROM demandes_conges
                        WHERE utilisateur_id = $1 
                        AND statut = 'approved' 
                        AND type_conge_id = 2
                        AND EXTRACT(MONTH FROM date_debut) = $2 
                        AND EXTRACT(YEAR FROM date_debut) = $3
                    `, [employe.id, mois, annee]);
                    
                    const joursAbsence = parseInt(absences.rows[0].jours_absence || 0);
                    const joursOuvres = 22;
                    const tauxJournalier = salaireBase / joursOuvres;
                    const retenueAbsence = Math.round(tauxJournalier * joursAbsence * 100) / 100;
                    const netAPayer = Math.round((salaireBase - retenueAbsence) * 100) / 100;
                    
                    await pool.query(
                        `INSERT INTO paie_employes 
                         (utilisateur_id, mois, annee, salaire_base, salaire_brut, 
                          jours_absence_non_paye, retenue_absence, net_a_payer, statut)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'valide')`,
                        [employe.id, mois, annee, salaireBase, salaireBase, joursAbsence, retenueAbsence, netAPayer]
                    );
                    successCount++;
                    const roleLabel = employe.roles.includes('manager') ? '👔 Manager' : '👤 Employé';
                    details.push(`${roleLabel} ${employe.prenom} ${employe.nom}: ${netAPayer.toFixed(0)} Ar`);
                }
            } catch (e) {
                errorCount++;
                console.error(`Erreur pour employe ${employe.id}:`, e);
            }
        }
        
        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        res.json({ 
            message: `✅ Génération terminée : ${successCount} bulletins créés, ${errorCount} erreurs`,
            successCount,
            errorCount,
            details,
            mois: moisNoms[mois - 1],
            annee
        });
        
    } catch (error) {
        console.error('Erreur generation bulletins equipe:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

router.put('/marquer-paye/:id', requireRoles(['admin']), async (req, res) => {
    try {
        const datePaiement = new Date().toISOString().split('T')[0];
        await pool.query(
            `UPDATE paie_employes SET statut = 'paye', date_paiement = $1 WHERE id = $2`,
            [datePaiement, req.params.id]
        );
        res.json({ message: 'Bulletin marqué comme payé' });
    } catch (error) {
        console.error('Erreur marquer payé:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/bulletin/:id', requireRoles(['admin']), async (req, res) => {
    const { salaire_base, prime } = req.body;
    
    try {
        const bulletinExist = await pool.query(`SELECT * FROM paie_employes WHERE id = $1`, [req.params.id]);
        if (bulletinExist.rows.length === 0) {
            return res.status(404).json({ message: 'Bulletin non trouvé' });
        }
        
        const bulletin = bulletinExist.rows[0];
        
        const salaireBrut = parseFloat(salaire_base) + parseFloat(prime || 0);
        const netAPayer = Math.round((salaireBrut - parseFloat(bulletin.retenue_absence || 0)) * 100) / 100;
        
        await pool.query(
            `UPDATE paie_employes 
             SET salaire_base = $1, salaire_brut = $2, prime_transport = $3, net_a_payer = $4
             WHERE id = $5`,
            [salaire_base, salaireBrut, prime || 0, netAPayer, req.params.id]
        );
        
        res.json({ message: 'Bulletin modifié avec succès' });
    } catch (error) {
        console.error('Erreur modification bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/bulletin/:id', requireRoles(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM paie_employes WHERE id = $1', [req.params.id]);
        res.json({ message: 'Bulletin supprimé' });
    } catch (error) {
        console.error('Erreur suppression bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ EMPLOYÉ ============

router.get('/mes-bulletins', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM paie_employes WHERE utilisateur_id = $1 ORDER BY annee DESC, mois DESC LIMIT 12`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur mes-bulletins:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;