// backend/utils/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;
let emailConfigured = false;

// ============ INITIALISATION ============

const initTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT) || 587;
    
    console.log('=== INIT EMAIL SERVICE (Nodemailer) ===');
    console.log('EMAIL_USER:', emailUser ? '✅ Présent' : '❌ Manquant');
    console.log('EMAIL_PASS:', emailPass ? '✅ Présent' : '❌ Manquant');
    console.log('EMAIL_HOST:', emailHost);
    console.log('EMAIL_PORT:', emailPort);
    
    if (emailUser && emailPass && emailUser !== '' && emailPass !== '') {
        try {
            transporter = nodemailer.createTransport({
                host: emailHost,
                port: emailPort,
                secure: emailPort === 465,
                auth: {
                    user: emailUser,
                    pass: emailPass
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ Erreur vérification Nodemailer:', error.message);
                    emailConfigured = false;
                } else {
                    console.log('✅ Nodemailer configuré avec succès');
                    console.log('   📧 Envoi depuis:', emailUser);
                    emailConfigured = true;
                }
            });
            
            return true;
        } catch (error) {
            console.error('❌ Erreur configuration Nodemailer:', error.message);
            emailConfigured = false;
            return false;
        }
    }
    
    console.warn('⚠️ Email non configuré - variables manquantes');
    emailConfigured = false;
    return false;
};

initTransporter();

// ============ FONCTION D'ENVOI D'EMAIL ============

const sendEmail = async (to, subject, htmlContent, toName = '') => {
    console.log(`📧 [sendEmail] Envoi à: ${to}`);
    console.log(`📧 [sendEmail] Sujet: ${subject}`);
    console.log(`📧 [sendEmail] Status: ${emailConfigured ? '✅ Configuré' : '❌ Non configuré'}`);
    
    if (!emailConfigured) {
        console.warn(`⚠️ [sendEmail] Email non envoyé à ${to} - Service non configuré`);
        return false;
    }
    
    try {
        const fromEmail = process.env.EMAIL_USER;
        const fromName = process.env.EMAIL_FROM_NAME || 'Gestion des Congés';
        
        console.log(`📧 [sendEmail] Envoi via Nodemailer à: ${to}`);
        
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: to,
            subject: subject,
            html: htmlContent
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [sendEmail] Email envoyé avec succès à ${to}`);
        console.log(`   Message ID: ${info.messageId}`);
        return true;
        
    } catch (error) {
        console.error(`❌ [sendEmail] Erreur envoi à ${to}:`, error.message);
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
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés - Tous droits réservés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(email, subject, html, userName);
};

// ============ EMAIL APPROBATION MANAGER (POUR L'EMPLOYÉ) ============

const sendManagerApprovalEmail = async (employeEmail, employeNom, dates, jours, type = 'congé') => {
    const typeLabel = type === 'permission' ? 'permission' : 'congé';
    const sujet = `✅ Votre demande de ${typeLabel} a été approuvée par votre manager`;
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
                    <p>✅ Votre manager a <strong>approuvé</strong> votre demande de ${typeLabel}.</p>
                    <div class="info-card">
                        <p><strong>📅 ${type === 'permission' ? 'Date' : 'Dates'} :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} ${type === 'permission' ? 'heure(s)' : 'jour(s)'}</p>
                    </div>
                    <p>Votre demande est maintenant en attente de validation finale par l'administrateur.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/requests" class="button">📋 Voir mes demandes</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, sujet, html, employeNom);
};

// ============ EMAIL REFUS MANAGER (POUR L'EMPLOYÉ) ============

const sendManagerRejectionEmail = async (employeEmail, employeNom, dates, motif, type = 'congé') => {
    const typeLabel = type === 'permission' ? 'permission' : 'congé';
    const sujet = `❌ Votre demande de ${typeLabel} a été refusée`;
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
                    <p>❌ Votre manager a <strong>refusé</strong> votre demande de ${typeLabel}.</p>
                    <div class="info-card">
                        <p><strong>📅 ${type === 'permission' ? 'Date' : 'Dates'} :</strong> ${dates}</p>
                        <p><strong>❌ Motif du refus :</strong> ${motif}</p>
                    </div>
                    <p>Vous pouvez faire une nouvelle demande en tenant compte de ce motif.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/new-request" class="button">📝 Nouvelle demande</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, sujet, html, employeNom);
};

// ============ EMAIL APPROBATION ADMIN (POUR L'EMPLOYÉ) ============

const sendAdminApprovalEmail = async (employeEmail, employeNom, dates, jours, type = 'congé') => {
    const typeLabel = type === 'permission' ? 'permission' : 'congé';
    const sujet = `✅ Votre demande de ${typeLabel} a été définitivement approuvée`;
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
                    <p>✅ Votre demande de ${typeLabel} a été <strong>définitivement approuvée</strong> par l'administrateur.</p>
                    <div class="info-card">
                        <p><strong>📅 ${type === 'permission' ? 'Date' : 'Dates'} :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} ${type === 'permission' ? 'heure(s)' : 'jour(s)'}</p>
                    </div>
                    <p>${type === 'permission' ? 'Bonne journée !' : 'Profitez bien de vos congés ! ☀️'}</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/calendar" class="button">📅 Voir mon calendrier</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(employeEmail, sujet, html, employeNom);
};

// ============ EMAIL REFUS ADMIN (POUR L'EMPLOYÉ) ============

const sendAdminRejectionEmail = async (employeEmail, employeNom, dates, motif, type = 'congé') => {
    const typeLabel = type === 'permission' ? 'permission' : 'congé';
    const sujet = `❌ Votre demande de ${typeLabel} a été définitivement refusée`;
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
                    <p>❌ Votre demande de ${typeLabel} a été <strong>définitivement refusée</strong> par l'administrateur.</p>
                    <div class="info-card">
                        <p><strong>📅 ${type === 'permission' ? 'Date' : 'Dates'} :</strong> ${dates}</p>
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
    return sendEmail(employeEmail, sujet, html, employeNom);
};

// ============ EMAIL NOUVELLE DEMANDE POUR MANAGER ============

const sendNewRequestToManagerEmail = async (managerEmail, managerNom, employeNom, dates, jours, type = 'congé') => {
    const typeLabel = type === 'permission' ? 'permission' : 'congé';
    const sujet = `📋 Nouvelle demande de ${typeLabel} à valider`;
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
                    <p>📋 <strong>${employeNom}</strong> a fait une nouvelle demande de ${typeLabel}.</p>
                    <div class="info-card">
                        <p><strong>📅 ${type === 'permission' ? 'Date' : 'Dates'} :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} ${type === 'permission' ? 'heure(s)' : 'jour(s)'}</p>
                    </div>
                    <p>Veuillez vous connecter pour approuver ou refuser cette demande.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/manager/validations" class="button">✅ Valider les demandes</a>
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
    return sendEmail(managerEmail, sujet, html, managerNom);
};

// ============ EMAIL NOUVELLE DEMANDE POUR ADMIN (QUAND MANAGER APPROUVE) ============

const sendAdminNewRequestEmail = async (adminEmail, adminName, employeNom, dates, jours, type = 'congé', managerNom = '') => {
    const typeLabel = type === 'permission' ? 'permission' : 'congé';
    const sujet = `📋 Nouvelle demande de ${typeLabel} en attente de validation - Admin`;
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
                    <p>📋 Une demande de ${typeLabel} de <strong>${employeNom}</strong> est en attente de votre validation (2ème étape).</p>
                    ${managerNom ? `<p>👔 Pré-validée par : <strong>${managerNom}</strong></p>` : ''}
                    <div class="info-card">
                        <p><strong>📅 ${type === 'permission' ? 'Date' : 'Dates'} :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} ${type === 'permission' ? 'heure(s)' : 'jour(s)'}</p>
                    </div>
                    <p>Veuillez vous connecter pour approuver ou refuser définitivement cette demande.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/admin" class="button">👑 Valider la demande</a>
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
    return sendEmail(adminEmail, sujet, html, adminName);
};

// ============ EXPORT ============
module.exports = {
    sendEmail,
    sendResetPasswordEmail,
    sendManagerApprovalEmail,
    sendManagerRejectionEmail,
    sendAdminApprovalEmail,
    sendAdminRejectionEmail,
    sendNewRequestToManagerEmail,
    sendAdminNewRequestEmail
};