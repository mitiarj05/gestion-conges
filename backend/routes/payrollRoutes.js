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
                        <div class="detail-row"><span>Salaire de base :</span><strong>${formatNumber(salaireBase)} Ar</strong></div>
                        <div class="detail-row"><span>Prime :</span><strong>${formatNumber(prime)} Ar</strong></div>
                        <div class="detail-row"><span>Salaire brut :</span><strong>${formatNumber(parseFloat(salaireBase) + parseFloat(prime))} Ar</strong></div>
                        <div class="total-row"><span>💰 NET À PAYER :</span><span class="amount">${formatNumber(netAPayer)} Ar</span></div>
                    </div>
                    
                    <p>Vous pouvez consulter et télécharger tous vos bulletins dans votre espace personnel.</p>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/payroll" class="button">📄 Voir mes bulletins</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Accéder à l'application</a></p>
                </div>
            </div>
        </html>
    `;
    
    return sendEmail(email, subject, html, nomEmploye);
};

// ============ STATISTIQUES ============
router.get('/stats', requireRoles(['admin']), async (req, res) => {
    try {
        const totalNet = await pool.query(`SELECT COALESCE(SUM(net_a_payer), 0) as total FROM paie_employes WHERE statut = 'paye'`);
        const totalEmployes = await pool.query(`SELECT COUNT(DISTINCT u.id) as total FROM users u JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id JOIN roles r ON ur.role_id = r.id WHERE r.nom = 'employe'`);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const payesCeMois = await pool.query(`SELECT COUNT(*) as total FROM paie_employes WHERE statut = 'paye' AND mois = $1 AND annee = $2`, [currentMonth, currentYear]);
        
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

// ============ ADMIN - TOUS LES BULLETINS ============
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
        const userCheck = await pool.query(`SELECT u.id, u.nom, u.prenom, u.email, u.salaire_base, u.service FROM users u WHERE u.id = $1`, [utilisateur_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ message: 'Employé non trouvé' });
        const employe = userCheck.rows[0];

        const existCheck = await pool.query(`SELECT id FROM paie_employes WHERE utilisateur_id = $1 AND mois = $2 AND annee = $3`, [utilisateur_id, mois, annee]);
        if (existCheck.rows.length > 0) return res.status(400).json({ message: 'Un bulletin existe déjà pour cette période' });

        const salaireBaseUtilise = salaire_base || employe.salaire_base || 500000;
        const primeValue = prime || 0;

        const absences = await pool.query(`SELECT COALESCE(SUM(nombre_jours), 0) as jours_absence FROM demandes_conges WHERE utilisateur_id = $1 AND statut = 'approved' AND type_conge_id = 2 AND EXTRACT(MONTH FROM date_debut) = $2 AND EXTRACT(YEAR FROM date_debut) = $3`, [utilisateur_id, mois, annee]);
        const joursAbsence = parseInt(absences.rows[0].jours_absence || 0);
        const joursOuvres = 22;
        const tauxJournalier = salaireBaseUtilise / joursOuvres;
        const retenueAbsence = Math.round(tauxJournalier * joursAbsence * 100) / 100;
        const salaireBrut = salaireBaseUtilise + primeValue;
        const netAPayer = Math.round((salaireBrut - retenueAbsence) * 100) / 100;

        const result = await pool.query(
            `INSERT INTO paie_employes (utilisateur_id, mois, annee, salaire_base, salaire_brut, prime_transport, jours_absence_non_paye, retenue_absence, net_a_payer, statut)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'valide') RETURNING *`,
            [utilisateur_id, mois, annee, salaireBaseUtilise, salaireBrut, primeValue, joursAbsence, retenueAbsence, netAPayer]
        );

        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        await pool.query(`INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le) VALUES ($1, 'bulletin_paie', 'Bulletin de paie disponible', $2, '/dashboard/employee/payroll', NOW())`, [utilisateur_id, `Votre bulletin de paie pour ${moisNoms[mois - 1]} ${annee} est disponible. Net : ${netAPayer.toFixed(0)} Ar`]);
        
        try {
            await sendBulletinEmail(employe.email, `${employe.prenom} ${employe.nom}`, mois, annee, netAPayer, salaireBaseUtilise, primeValue);
        } catch (emailError) { console.error('Erreur envoi email:', emailError); }

        res.status(201).json({ message: 'Bulletin généré avec succès', bulletin: result.rows[0] });
    } catch (error) {
        console.error('Erreur génération bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ GÉNÉRER POUR TOUS LES EMPLOYÉS (GÉNÉRATION MASSIVE) ============
router.post('/generer-bulletins-equipe', requireRoles(['admin']), async (req, res) => {
    const { mois, annee, employes_ids, prime_fixe, prime_pourcentage, envoyer_email = true } = req.body;
    
    console.log('========================================');
    console.log('=== DÉBUT GÉNÉRATION MASSIVE ===');
    console.log('========================================');
    console.log('📅 Mois:', mois, 'Année:', annee);
    console.log('💰 Prime fixe reçue (type):', typeof prime_fixe, 'valeur:', prime_fixe);
    console.log('💰 Prime pourcentage reçue (type):', typeof prime_pourcentage, 'valeur:', prime_pourcentage);
    console.log('👥 Employes IDs reçus:', employes_ids);
    console.log('📧 Envoyer email:', envoyer_email);
    console.log('========================================');
    
    try {
        // Construire la requête pour récupérer les employés
        let employesQuery = `
            SELECT DISTINCT u.id, u.nom, u.prenom, u.email, u.salaire_base, u.service
            FROM users u
            JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.nom IN ('employe', 'manager')
        `;
        
        const queryParams = [];
        
        // Filtrer par IDs spécifiques si fournis
        if (employes_ids && employes_ids.length > 0) {
            employesQuery += ` AND u.id = ANY($1::int[])`;
            queryParams.push(employes_ids);
            console.log('🔍 Filtrage par IDs spécifiques:', employes_ids);
        } else {
            console.log('🔍 Aucun filtre ID - Tous les employés seront traités');
        }
        
        employesQuery += ` ORDER BY u.nom ASC`;
        
        const employes = await pool.query(employesQuery, queryParams);
        
        console.log(`📊 Total employés trouvés en base: ${employes.rows.length}`);
        console.log('========================================');
        
        let successCount = 0;
        let errorCount = 0;
        let emailSentCount = 0;
        let details = [];
        let emailErrors = [];
        const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        // CONVERSION IMPORTANTE : S'assurer que ce sont des nombres
        const primeFixe = Number(prime_fixe) || 0;
        const primePourcentage = Number(prime_pourcentage) || 0;
        const joursOuvres = 22;
        
        console.log(`📊 Paramètres calculés (après conversion Number()):`);
        console.log(`   - Prime fixe: ${primeFixe} Ar (type: ${typeof primeFixe})`);
        console.log(`   - Prime pourcentage: ${primePourcentage}% (type: ${typeof primePourcentage})`);
        console.log(`   - Jours ouvrables par mois: ${joursOuvres}`);
        console.log('========================================');
        
        for (const employe of employes.rows) {
            console.log(`\n--- Traitement de: ${employe.prenom} ${employe.nom} (ID: ${employe.id}) ---`);
            console.log(`   Email: ${employe.email}`);
            console.log(`   Salaire base brut (avant conversion):`, employe.salaire_base, `type:`, typeof employe.salaire_base);
            
            try {
                // Vérifier si bulletin existe déjà
                const existCheck = await pool.query(`SELECT id FROM paie_employes WHERE utilisateur_id = $1 AND mois = $2 AND annee = $3`, [employe.id, mois, annee]);
                if (existCheck.rows.length > 0) {
                    console.log(`⚠️ ${employe.prenom} ${employe.nom}: Bulletin déjà existant, ignoré`);
                    continue;
                }
                
                // CONVERSION IMPORTANTE : S'assurer que salaireBase est un nombre
                const salaireBase = Number(employe.salaire_base) || 500000;
                console.log(`💰 Salaire base (après conversion Number): ${salaireBase} Ar (type: ${typeof salaireBase})`);
                
                // CALCUL DE LA PRIME
                const primeCalculee = primeFixe + (salaireBase * primePourcentage / 100);
                console.log(`💰 Calcul prime: ${primeFixe} + (${salaireBase} * ${primePourcentage} / 100) = ${primeCalculee} Ar`);
                
                // Récupérer les absences (congés sans solde)
                const absences = await pool.query(`
                    SELECT COALESCE(SUM(nombre_jours), 0) as jours_absence 
                    FROM demandes_conges 
                    WHERE utilisateur_id = $1 
                        AND statut = 'approved' 
                        AND type_conge_id = 2 
                        AND EXTRACT(MONTH FROM date_debut) = $2 
                        AND EXTRACT(YEAR FROM date_debut) = $3
                `, [employe.id, mois, annee]);
                
                const joursAbsence = Number(absences.rows[0].jours_absence) || 0;
                const tauxJournalier = salaireBase / joursOuvres;
                const retenueAbsence = Math.round(tauxJournalier * joursAbsence * 100) / 100;
                console.log(`📅 Jours d'absence: ${joursAbsence} jours`);
                console.log(`📅 Taux journalier: ${tauxJournalier.toFixed(2)} Ar/jour`);
                console.log(`📅 Retenue absence: ${retenueAbsence} Ar`);
                
                // CALCUL DU SALAIRE BRUT = Salaire de base + Prime
                const salaireBrut = salaireBase + primeCalculee;
                console.log(`💵 Salaire brut calculé: ${salaireBase} + ${primeCalculee} = ${salaireBrut} Ar`);
                
                // CALCUL DU NET À PAYER = Salaire brut - Retenue absence
                const netAPayer = salaireBrut - retenueAbsence;
                console.log(`💵 Net à payer calculé: ${salaireBrut} - ${retenueAbsence} = ${netAPayer} Ar`);
                
                // ARRONDI FINAL
                const netAPayerArrondi = Math.round(netAPayer * 100) / 100;
                const salaireBrutArrondi = Math.round(salaireBrut * 100) / 100;
                const primeCalculeeArrondie = Math.round(primeCalculee * 100) / 100;
                
                console.log(`📊 RÉSUMÉ FINAL pour ${employe.prenom} ${employe.nom}:`);
                console.log(`   - Salaire base: ${salaireBase} Ar`);
                console.log(`   - Prime: ${primeCalculeeArrondie} Ar`);
                console.log(`   - Salaire brut: ${salaireBrutArrondi} Ar`);
                console.log(`   - Absences: ${joursAbsence} jours`);
                console.log(`   - Retenue: ${retenueAbsence} Ar`);
                console.log(`   - NET À PAYER (arrondi): ${netAPayerArrondi} Ar`);
                console.log(`   - Vérification: Salaire base + Prime = ${salaireBase} + ${primeCalculeeArrondie} = ${salaireBase + primeCalculeeArrondie} Ar`);
                
                // Insertion en base de données
                const insertResult = await pool.query(`
                    INSERT INTO paie_employes 
                        (utilisateur_id, mois, annee, salaire_base, salaire_brut, prime_transport, 
                         jours_absence_non_paye, retenue_absence, net_a_payer, statut) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'valide')
                    RETURNING id, salaire_base, salaire_brut, prime_transport, net_a_payer
                `, [employe.id, mois, annee, salaireBase, salaireBrutArrondi, primeCalculeeArrondie, joursAbsence, retenueAbsence, netAPayerArrondi]);
                
                console.log(`✅ Bulletin inséré avec ID: ${insertResult.rows[0].id}`);
                console.log(`   - Vérification base - salaire_base: ${insertResult.rows[0].salaire_base}`);
                console.log(`   - Vérification base - prime_transport: ${insertResult.rows[0].prime_transport}`);
                console.log(`   - Vérification base - salaire_brut: ${insertResult.rows[0].salaire_brut}`);
                console.log(`   - Vérification base - net_a_payer: ${insertResult.rows[0].net_a_payer}`);
                successCount++;
                
                // Créer une notification
                await pool.query(`
                    INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le) 
                    VALUES ($1, 'bulletin_paie', 'Bulletin de paie disponible', $2, '/dashboard/employee/payroll', NOW())
                `, [employe.id, `Votre bulletin de paie pour ${moisNoms[mois - 1]} ${annee} est disponible. Net : ${netAPayerArrondi.toFixed(0)} Ar`]);
                
                // Envoyer l'email si demandé
                if (envoyer_email && employe.email) {
                    try {
                        await sendBulletinEmail(employe.email, `${employe.prenom} ${employe.nom}`, mois, annee, netAPayerArrondi, salaireBase, primeCalculeeArrondie);
                        emailSentCount++;
                        console.log(`📧 Email envoyé à ${employe.email}`);
                    } catch (emailErr) {
                        console.error(`❌ Erreur email pour ${employe.prenom} ${employe.nom}:`, emailErr.message);
                        emailErrors.push(`${employe.prenom} ${employe.nom}: ${emailErr.message}`);
                    }
                }
                
                details.push(`${employe.prenom} ${employe.nom}: Base=${salaireBase}, Prime=${primeCalculeeArrondie}, Brut=${salaireBrutArrondi}, Net=${netAPayerArrondi} Ar (Absences: ${joursAbsence}j, Retenue: ${retenueAbsence})`);
                console.log(`--- Fin traitement de ${employe.prenom} ${employe.nom} ---\n`);
                
            } catch (e) {
                errorCount++;
                console.error(`❌ ERREUR pour ${employe.prenom} ${employe.nom}:`, e.message);
                console.error(`   Stack:`, e.stack);
                details.push(`❌ Erreur: ${employe.prenom} ${employe.nom} - ${e.message}`);
            }
        }
        
        let messageEmail = '';
        if (envoyer_email) messageEmail = ` ${emailSentCount} email(s) envoyé(s)${emailErrors.length > 0 ? ` (${emailErrors.length} erreurs)` : ''}`;
        
        console.log('========================================');
        console.log('=== RÉSULTAT FINAL ===');
        console.log(`✅ Succès: ${successCount}`);
        console.log(`❌ Erreurs: ${errorCount}`);
        console.log(`📧 Emails envoyés: ${emailSentCount}`);
        console.log(`📧 Erreurs email: ${emailErrors.length}`);
        console.log('========================================');
        
        res.json({ 
            message: `✅ Génération terminée : ${successCount} bulletins créés, ${errorCount} erreurs.${messageEmail}`,
            successCount,
            errorCount,
            emailSentCount,
            emailErrors,
            details,
            mois: moisNoms[mois - 1],
            annee,
            debug: {
                prime_fixe_recue: prime_fixe,
                prime_pourcentage_recue: prime_pourcentage,
                prime_fixe_calculee: primeFixe,
                prime_pourcentage_calculee: primePourcentage,
                total_employes_trouves: employes.rows.length
            }
        });
        
    } catch (error) {
        console.error('❌ ERREUR GENERALE generation bulletins equipe:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message, stack: error.stack });
    }
});

// ============ MARQUER COMME PAYÉ ============
router.put('/marquer-paye/:id', requireRoles(['admin']), async (req, res) => {
    try {
        const datePaiement = new Date().toISOString().split('T')[0];
        await pool.query(`UPDATE paie_employes SET statut = 'paye', date_paiement = $1 WHERE id = $2`, [datePaiement, req.params.id]);
        res.json({ message: 'Bulletin marqué comme payé' });
    } catch (error) {
        console.error('Erreur marquer payé:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ MODIFIER UN BULLETIN ============
router.put('/bulletin/:id', requireRoles(['admin']), async (req, res) => {
    const { salaire_base, prime } = req.body;
    try {
        const bulletinExist = await pool.query(`SELECT * FROM paie_employes WHERE id = $1`, [req.params.id]);
        if (bulletinExist.rows.length === 0) return res.status(404).json({ message: 'Bulletin non trouvé' });
        const bulletin = bulletinExist.rows[0];
        
        const salaireBrut = parseFloat(salaire_base) + parseFloat(prime || 0);
        const netAPayer = Math.round((salaireBrut - parseFloat(bulletin.retenue_absence || 0)) * 100) / 100;
        
        await pool.query(`
            UPDATE paie_employes 
            SET salaire_base = $1, salaire_brut = $2, prime_transport = $3, net_a_payer = $4 
            WHERE id = $5
        `, [salaire_base, salaireBrut, prime || 0, netAPayer, req.params.id]);
        
        res.json({ message: 'Bulletin modifié avec succès' });
    } catch (error) {
        console.error('Erreur modification bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ RECALCULER BULLETINS EXISTANTS ============
router.put('/recalculer-bulletins', requireRoles(['admin']), async (req, res) => {
    const { mois, annee, prime_fixe, prime_pourcentage } = req.body;
    
    console.log('=== RECALCUL BULLETINS ===');
    console.log('Mois:', mois, 'Année:', annee);
    console.log('Prime fixe:', prime_fixe, 'Prime %:', prime_pourcentage);
    
    try {
        const bulletins = await pool.query(`
            SELECT p.*, u.salaire_base as salaire_base_user 
            FROM paie_employes p 
            JOIN users u ON p.utilisateur_id = u.id 
            WHERE p.mois = $1 AND p.annee = $2
        `, [mois, annee]);

        const primeFixe = parseFloat(prime_fixe) || 0;
        const primePourcentage = parseFloat(prime_pourcentage) || 0;
        let updatedCount = 0;
        let details = [];

        for (const bulletin of bulletins.rows) {
            const salaireBase = parseFloat(bulletin.salaire_base);
            
            // Recalcul de la prime avec les nouveaux paramètres
            const primeCalculee = Math.round((primeFixe + (salaireBase * primePourcentage / 100)) * 100) / 100;
            const salaireBrut = Math.round((salaireBase + primeCalculee) * 100) / 100;
            const netAPayer = Math.round((salaireBrut - parseFloat(bulletin.retenue_absence || 0)) * 100) / 100;

            await pool.query(`
                UPDATE paie_employes 
                SET prime_transport = $1, salaire_brut = $2, net_a_payer = $3 
                WHERE id = $4
            `, [primeCalculee, salaireBrut, netAPayer, bulletin.id]);
            
            updatedCount++;
            details.push(`ID ${bulletin.id}: Prime=${primeCalculee}, Brut=${salaireBrut}, Net=${netAPayer}`);
        }
        
        console.log(`Recalcul terminé: ${updatedCount} bulletins mis à jour`);
        
        res.json({ 
            message: `✅ ${updatedCount} bulletin(s) recalculé(s) avec succès`, 
            updatedCount,
            details
        });
    } catch (error) {
        console.error('Erreur recalcul bulletins:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ SUPPRIMER UN BULLETIN ============
router.delete('/bulletin/:id', requireRoles(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM paie_employes WHERE id = $1', [req.params.id]);
        res.json({ message: 'Bulletin supprimé' });
    } catch (error) {
        console.error('Erreur suppression bulletin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ MES BULLETINS (EMPLOYÉ) ============
router.get('/mes-bulletins', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM paie_employes 
            WHERE utilisateur_id = $1 
            ORDER BY annee DESC, mois DESC 
            LIMIT 12
        `, [req.user.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur mes-bulletins:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;