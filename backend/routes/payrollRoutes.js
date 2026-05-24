// backend/routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');
const { sendEmail } = require('../utils/emailService');

router.use(authMiddleware);

// ============ FONCTION D'ENVOI D'EMAIL DE BULLETIN ============
const sendBulletinEmail = async (email, nomEmploye, mois, annee, netAPayer, salaireBase, prime) => {
    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const moisNom = moisNoms[mois - 1];
    
    const subject = `📄 Votre bulletin de paie - ${moisNom} ${annee}`;
    
    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toLocaleString();
    };
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bulletin de paie</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
                .info-card { background: #e8f4fd; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .info-card p { margin: 8px 0; }
                .amount { font-size: 24px; font-weight: 700; color: #10b981; }
                .button { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
                .total-row { display: flex; justify-content: space-between; padding: 12px 0; margin-top: 12px; border-top: 2px solid #667eea; font-weight: bold; font-size: 16px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <div class="greeting">Bonjour <strong>${nomEmploye}</strong>,</div>
                    <p>Votre bulletin de paie pour la période de <strong>${moisNom} ${annee}</strong> est disponible.</p>
                    
                    <div class="info-card">
                        <h3 style="margin: 0 0 16px 0; color: #0f3460;">📊 Détail de votre paie</h3>
                        <div class="detail-row">
                            <span>Salaire de base :</span>
                            <strong>${formatNumber(salaireBase)} Ar</strong>
                        </div>
                        <div class="detail-row">
                            <span>Prime :</span>
                            <strong>${formatNumber(prime)} Ar</strong>
                        </div>
                        <div class="detail-row">
                            <span>Salaire brut :</span>
                            <strong>${formatNumber(parseFloat(salaireBase) + parseFloat(prime))} Ar</strong>
                        </div>
                        <div class="total-row">
                            <span>💰 NET À PAYER :</span>
                            <span class="amount">${formatNumber(netAPayer)} Ar</span>
                        </div>
                    </div>
                    
                    <p>Vous pouvez consulter et télécharger tous vos bulletins dans votre espace personnel.</p>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/payroll" class="button">📄 Voir mes bulletins</a>
                    </div>
                    
                    <p style="margin-top: 24px; font-size: 12px; color: #666;">
                        Ce document a été généré automatiquement. Si vous avez des questions, veuillez contacter votre service RH.
                    </p>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés - Tous droits réservés</p>
                    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Accéder à l'application</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return sendEmail(email, subject, html, nomEmploye);
};

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
            SELECT p.*, u.nom, u.prenom, u.email, u.service,
                   array_agg(DISTINCT r.nom) FILTER (WHERE r.nom IS NOT NULL) as roles
            FROM paie_employes p
            JOIN users u ON p.utilisateur_id = u.id
            LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            LEFT JOIN roles r ON ur.role_id = r.id
            GROUP BY p.id, u.id
            ORDER BY p.annee DESC, p.mois DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur tous-bulletins:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ GÉNÉRER BULLETIN INDIVIDUEL ============
router.post('/generer-bulletin', requireRoles(['admin']), async (req, res) => {
    const { utilisateur_id, mois, annee, salaire_base, prime } = req.body;

    try {
        const userCheck = await pool.query(`
            SELECT u.id, u.nom, u.prenom, u.email, u.salaire_base, u.service,
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

        const employe = userCheck.rows[0];

        const existCheck = await pool.query(
            `SELECT id FROM paie_employes WHERE utilisateur_id = $1 AND mois = $2 AND annee = $3`,
            [utilisateur_id, mois, annee]
        );

        if (existCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Un bulletin existe déjà pour cette période' });
        }

        const salaireBaseUtilise = salaire_base || employe.salaire_base || 500000;

        // Calculer les absences non payées
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
        
        // Notification dans l'application
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'bulletin_paie', 'Bulletin de paie disponible', 
             $2, '/dashboard/employee/payroll', NOW())`,
            [utilisateur_id, `Votre bulletin de paie pour ${moisNoms[mois - 1]} ${annee} est disponible. Net : ${netAPayer.toFixed(0)} Ar`]
        );
        
        // Envoi d'email
        try {
            await sendBulletinEmail(
                employe.email,
                `${employe.prenom} ${employe.nom}`,
                mois,
                annee,
                netAPayer,
                salaireBaseUtilise,
                prime || 0
            );
            console.log(`✅ Email de bulletin envoyé à ${employe.email}`);
        } catch (emailError) {
            console.error('Erreur envoi email bulletin:', emailError);
        }

        res.status(201).json({ message: 'Bulletin généré avec succès', bulletin: result.rows[0] });

    } catch (error) {
        console.error('Erreur génération bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ GÉNÉRER POUR TOUS LES EMPLOYÉS (AVEC EMAILS) ============
router.post('/generer-bulletins-equipe', requireRoles(['admin']), async (req, res) => {
    const { mois, annee, envoyer_email = true } = req.body;
    
    try {
        const employes = await pool.query(`
            SELECT DISTINCT u.id, u.nom, u.prenom, u.email, u.salaire_base, u.service,
                   array_agg(r.nom) as roles
            FROM users u
            JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.nom = 'employe' OR r.nom = 'manager'
            GROUP BY u.id
            ORDER BY u.nom ASC
        `);
        
        let successCount = 0;
        let errorCount = 0;
        let emailSentCount = 0;
        let details = [];
        let emailErrors = [];
        
        for (const employe of employes.rows) {
            try {
                const existCheck = await pool.query(
                    `SELECT id FROM paie_employes WHERE utilisateur_id = $1 AND mois = $2 AND annee = $3`,
                    [employe.id, mois, annee]
                );
                
                if (existCheck.rows.length === 0) {
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
                    
                    // Notification dans l'application
                    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                    await pool.query(
                        `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
                         VALUES ($1, 'bulletin_paie', 'Bulletin de paie disponible', 
                         $2, '/dashboard/employee/payroll', NOW())`,
                        [employe.id, `Votre bulletin de paie pour ${moisNoms[mois - 1]} ${annee} est disponible. Net : ${netAPayer.toFixed(0)} Ar`]
                    );
                    
                    // Envoyer email si demandé
                    if (envoyer_email && employe.email) {
                        try {
                            await sendBulletinEmail(
                                employe.email,
                                `${employe.prenom} ${employe.nom}`,
                                mois,
                                annee,
                                netAPayer,
                                salaireBase,
                                0
                            );
                            emailSentCount++;
                        } catch (emailErr) {
                            emailErrors.push(`${employe.prenom} ${employe.nom}: ${emailErr.message}`);
                        }
                    }
                    
                    const roleLabel = employe.roles.includes('manager') ? '👔 Manager' : '👤 Employé';
                    details.push(`${roleLabel} ${employe.prenom} ${employe.nom}: ${netAPayer.toFixed(0)} Ar`);
                }
            } catch (e) {
                errorCount++;
                console.error(`Erreur pour employe ${employe.id}:`, e);
                details.push(`❌ Erreur: ${employe.prenom} ${employe.nom}`);
            }
        }
        
        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        let messageEmail = '';
        if (envoyer_email) {
            messageEmail = ` ${emailSentCount} email(s) envoyé(s)${emailErrors.length > 0 ? ` (${emailErrors.length} erreurs)` : ''}`;
        }
        
        res.json({ 
            message: `✅ Génération terminée : ${successCount} bulletins créés, ${errorCount} erreurs.${messageEmail}`,
            successCount,
            errorCount,
            emailSentCount,
            emailErrors,
            details,
            mois: moisNoms[mois - 1],
            annee
        });
        
    } catch (error) {
        console.error('Erreur generation bulletins equipe:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ MARQUER COMME PAYÉ AVEC EMAIL ============
router.put('/marquer-paye/:id', requireRoles(['admin']), async (req, res) => {
    try {
        const datePaiement = new Date().toISOString().split('T')[0];
        
        // Récupérer les infos du bulletin pour envoyer un email de confirmation
        const bulletinInfo = await pool.query(`
            SELECT p.*, u.email, u.prenom, u.nom
            FROM paie_employes p
            JOIN users u ON p.utilisateur_id = u.id
            WHERE p.id = $1
        `, [req.params.id]);
        
        await pool.query(
            `UPDATE paie_employes SET statut = 'paye', date_paiement = $1 WHERE id = $2`,
            [datePaiement, req.params.id]
        );
        
        // Envoyer email de confirmation de paiement
        if (bulletinInfo.rows.length > 0) {
            const bulletin = bulletinInfo.rows[0];
            const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                              'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            const moisNom = moisNoms[bulletin.mois - 1];
            
            const subject = `✅ Paiement de votre bulletin - ${moisNom} ${bulletin.annee}`;
            const formatNumber = (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? '0' : num.toLocaleString();
            };
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Confirmation de paiement</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
                        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
                        .content { padding: 32px 24px; }
                        .amount { font-size: 28px; font-weight: 700; color: #10b981; text-align: center; margin: 20px 0; }
                        .button { display: inline-block; padding: 12px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 40px; }
                        .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏢 Gestion des Congés</h1>
                            <p>Confirmation de paiement</p>
                        </div>
                        <div class="content">
                            <h2>Bonjour ${bulletin.prenom} ${bulletin.nom},</h2>
                            <p>Votre bulletin de paie pour <strong>${moisNom} ${bulletin.annee}</strong> a été marqué comme <strong style="color: #10b981;">PAYÉ</strong>.</p>
                            <div class="amount">${formatNumber(bulletin.net_a_payer)} Ar</div>
                            <p>Date de paiement : <strong>${new Date().toLocaleDateString('fr-FR')}</strong></p>
                            <div style="text-align: center; margin-top: 24px;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/payroll" class="button">📄 Voir mon bulletin</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>© 2025 Gestion des Congés</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            await sendEmail(bulletin.email, subject, html, `${bulletin.prenom} ${bulletin.nom}`);
            console.log(`✅ Email de confirmation de paiement envoyé à ${bulletin.email}`);
        }
        
        res.json({ message: 'Bulletin marqué comme payé' });
    } catch (error) {
        console.error('Erreur marquer payé:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ MODIFIER BULLETIN ============
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

// ============ SUPPRIMER BULLETIN ============
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