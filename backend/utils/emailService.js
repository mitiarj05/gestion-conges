// backend/utils/emailService.js
const mailjet = require('node-mailjet');

let mailjetClient = null;
let mailjetConfigured = false;

// Initialisation Mailjet - Appelée immédiatement
const initMailjet = () => {
    // Utiliser les mêmes noms que sur Render
    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_API_SECRET;  // ⚠️ API_SECRET (pas SECRET_KEY)
    const fromEmail = process.env.MAILJET_FROM_EMAIL || 'mitiarj05@gmail.com';
    const fromName = process.env.MAILJET_FROM_NAME || 'Gestion des Congés';
    
    console.log('=== INIT MAILJET ===');
    console.log('MAILJET_API_KEY:', apiKey ? '✅ Présent' : '❌ Manquant');
    console.log('MAILJET_API_SECRET:', apiSecret ? '✅ Présent' : '❌ Manquant');
    console.log('MAILJET_FROM_EMAIL:', fromEmail);
    console.log('MAILJET_FROM_NAME:', fromName);
    
    if (apiKey && apiSecret && apiKey !== '' && apiSecret !== '') {
        try {
            mailjetClient = mailjet.apiConnect(apiKey, apiSecret);
            mailjetConfigured = true;
            console.log('✅ Mailjet configuré avec succès');
            return true;
        } catch (error) {
            console.error('❌ Erreur configuration Mailjet:', error.message);
            mailjetConfigured = false;
            return false;
        }
    }
    console.warn('⚠️ Mailjet non configuré - variables manquantes');
    mailjetConfigured = false;
    return false;
};

// Initialisation immédiate
initMailjet();

// Envoyer un email via Mailjet
const sendEmail = async (to, subject, htmlContent, toName = '') => {
    try {
        if (!mailjetConfigured) {
            console.log(`❌ Email non envoyé à ${to}: Mailjet non configuré`);
            return false;
        }
        
        const fromEmail = process.env.MAILJET_FROM_EMAIL || 'mitiarj05@gmail.com';
        const fromName = process.env.MAILJET_FROM_NAME || 'Gestion des Congés';
        
        console.log(`📧 Envoi d'email à: ${to}`);
        console.log(`   Sujet: ${subject}`);
        
        const request = mailjetClient.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: fromEmail,
                        Name: fromName
                    },
                    To: [
                        {
                            Email: to,
                            Name: toName || to.split('@')[0]
                        }
                    ],
                    Subject: subject,
                    HTMLPart: htmlContent,
                    TextPart: htmlContent.replace(/<[^>]*>/g, '')
                }
            ]
        });
        
        const result = await request;
        console.log(`✅ Email envoyé avec succès à ${to} (${subject})`);
        if (result.body && result.body.Messages) {
            console.log(`   Message ID: ${result.body.Messages[0]?.To?.[0]?.MessageID || 'inconnu'}`);
        }
        return true;
    } catch (error) {
        console.error(`❌ Erreur envoi email à ${to}:`, error.message);
        if (error.statusCode) {
            console.error(`   Status Code: ${error.statusCode}`);
        }
        if (error.response && error.response.body) {
            console.error(`   Détails:`, JSON.stringify(error.response.body, null, 2));
        }
        return false;
    }
};

// ============ EMAIL RÉINITIALISATION MOT DE PASSE ============
const sendResetPasswordEmail = async (email, userName, resetUrl) => {
    const subject = '🔐 Réinitialisation de votre mot de passe - Gestion des Congés';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Réinitialisation mot de passe</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 550px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
                .info-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 8px; }
                .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px; font-size: 13px; }
                .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
                .footer a { color: #667eea; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <div class="greeting">Bonjour <strong>${userName}</strong>,</div>
                    <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
                    <div class="info-box">
                        <strong>🔐 Réinitialisation du mot de passe</strong><br/>
                        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                    </div>
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">🔑 Réinitialiser mon mot de passe</a>
                    </div>
                    <div class="warning-box">
                        <strong>⚠️ Attention :</strong><br/>
                        • Ce lien est valable pendant <strong>1 heure</strong>.<br/>
                        • Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                    </div>
                    <p style="margin-top: 24px; font-size: 12px; word-break: break-all;">
                        Lien direct : <a href="${resetUrl}">${resetUrl}</a>
                    </p>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés - Tous droits réservés</p>
                    <p><a href="${process.env.FRONTEND_URL || 'https://gestion-conges-1.onrender.com'}">Accéder à l'application</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(email, subject, html, userName);
};

// ============ EMAIL QUAND MANAGER APPROUVE ============
const sendManagerApprovalEmail = async (employeEmail, employeNom, dates, jours) => {
    const subject = '✅ Votre demande de congé a été approuvée par votre manager';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande approuvée par manager</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: #0f3460; color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .info-card { background: #e8f4fd; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 28px; background: #0f3460; color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <h2>Bonjour ${employeNom},</h2>
                    <p>✅ Votre manager a <strong>approuvé</strong> votre demande de congé.</p>
                    <div class="info-card">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jour(s)</p>
                    </div>
                    <p>Votre demande est maintenant en attente de validation finale par l'administrateur.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://gestion-conges-1.onrender.com'}/dashboard/employee/requests" class="button">📋 Voir mes demandes</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, subject, html, employeNom);
};

// ============ EMAIL QUAND MANAGER REFUSE ============
const sendManagerRejectionEmail = async (employeEmail, employeNom, dates, motif) => {
    const subject = '❌ Votre demande de congé a été refusée';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande refusée</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: #dc3545; color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .info-card { background: #f8d7da; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 28px; background: #28a745; color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <h2>Bonjour ${employeNom},</h2>
                    <p>❌ Votre manager a <strong>refusé</strong> votre demande de congé.</p>
                    <div class="info-card">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>❌ Motif du refus :</strong> ${motif}</p>
                    </div>
                    <p>Vous pouvez faire une nouvelle demande en tenant compte de ce motif.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://gestion-conges-1.onrender.com'}/dashboard/employee/new-request" class="button">📝 Nouvelle demande</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, subject, html, employeNom);
};

// ============ EMAIL QUAND ADMIN APPROUVE DÉFINITIVEMENT ============
const sendAdminApprovalEmail = async (employeEmail, employeNom, dates, jours) => {
    const subject = '✅ Votre demande de congé a été définitivement approuvée';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande définitivement approuvée</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: #28a745; color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .info-card { background: #d4edda; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 28px; background: #0f3460; color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <h2>Félicitations ${employeNom} ! 🎉</h2>
                    <p>✅ Votre demande de congé a été <strong>définitivement approuvée</strong> par l'administrateur.</p>
                    <div class="info-card">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jour(s)</p>
                    </div>
                    <p>Profitez bien de vos congés ! ☀️</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://gestion-conges-1.onrender.com'}/dashboard/employee/calendar" class="button">📅 Voir mon calendrier</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, subject, html, employeNom);
};

// ============ EMAIL QUAND ADMIN REFUSE DÉFINITIVEMENT ============
const sendAdminRejectionEmail = async (employeEmail, employeNom, dates, motif) => {
    const subject = '❌ Votre demande de congé a été définitivement refusée';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande définitivement refusée</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: #dc3545; color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .info-card { background: #f8d7da; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <h2>Bonjour ${employeNom},</h2>
                    <p>❌ Votre demande de congé a été <strong>définitivement refusée</strong> par l'administrateur.</p>
                    <div class="info-card">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>❌ Motif du refus :</strong> ${motif}</p>
                    </div>
                    <p>Vous pouvez contacter l'administrateur pour plus d'informations.</p>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, subject, html, employeNom);
};

// ============ EMAIL NOTIFICATION AU MANAGER (NOUVELLE DEMANDE) ============
const sendNewRequestToManagerEmail = async (managerEmail, managerNom, employeNom, dates, jours) => {
    const subject = '📋 Nouvelle demande de congé à valider';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nouvelle demande à valider</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: #ff9800; color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .info-card { background: #fff3cd; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 28px; background: #0f3460; color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <h2>Bonjour ${managerNom},</h2>
                    <p>📋 <strong>${employeNom}</strong> a fait une nouvelle demande de congé.</p>
                    <div class="info-card">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jour(s)</p>
                    </div>
                    <p>Veuillez vous connecter pour approuver ou refuser cette demande.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://gestion-conges-1.onrender.com'}/dashboard/manager/validations" class="button">✅ Valider les demandes</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                    <p><small>Cet email est automatique, merci de ne pas y répondre.</small></p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(managerEmail, subject, html, managerNom);
};

// ============ EMAIL NOTIFICATION À L'ADMIN (NOUVELLE DEMANDE APRÈS MANAGER) ============
const sendAdminNewRequestEmail = async (adminEmail, adminName, employeNom, dates, jours) => {
    const subject = '📋 Nouvelle demande de congé en attente de validation - Admin';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nouvelle demande à valider (Admin)</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .info-card { background: #e8f4fd; padding: 20px; border-radius: 12px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle - Administration</p>
                </div>
                <div class="content">
                    <h2>Bonjour ${adminName},</h2>
                    <p>📋 Une demande de congé de <strong>${employeNom}</strong> est en attente de votre validation (2ème étape).</p>
                    <div class="info-card">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jour(s)</p>
                    </div>
                    <p>Veuillez vous connecter pour approuver ou refuser définitivement cette demande.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://gestion-conges-1.onrender.com'}/dashboard/admin" class="button">👑 Valider la demande</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                    <p><small>Cet email est automatique, merci de ne pas y répondre.</small></p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(adminEmail, subject, html, adminName);
};

// ============ EXPORT DES FONCTIONS ============
module.exports = {
    sendResetPasswordEmail,
    sendManagerApprovalEmail,
    sendManagerRejectionEmail,
    sendAdminApprovalEmail,
    sendAdminRejectionEmail,
    sendNewRequestToManagerEmail,
    sendAdminNewRequestEmail
};