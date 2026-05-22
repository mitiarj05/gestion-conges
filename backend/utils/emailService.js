// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// Configuration du transporteur email
let transporter = null;

const initTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
};

// Envoyer un email de notification
const sendNotificationEmail = async (to, subject, htmlContent) => {
    try {
        initTransporter();
        
        if (!transporter) {
            console.log('Email non configuré, skip envoi');
            return false;
        }
        
        const info = await transporter.sendMail({
            from: `"Gestion Congés" <${process.env.EMAIL_USER || 'noreply@gestion-conges.com'}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });
        
        console.log('Email envoyé à:', to);
        return true;
    } catch (error) {
        console.error('Erreur envoi email:', error);
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
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
                .container { max-width: 550px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 32px 24px; background: white; }
                .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
                .info-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 8px; }
                .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 40px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
                .button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
                .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px; font-size: 13px; }
                .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
                .footer a { color: #667eea; text-decoration: none; }
                .info-text { font-size: 12px; color: #64748b; margin-top: 20px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                    <p>Solution RH professionnelle</p>
                </div>
                <div class="content">
                    <div class="greeting">
                        Bonjour <strong>${userName}</strong>,
                    </div>
                    <p>Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte Gestion des Congés.</p>
                    
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
                        • Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br/>
                        • Pour des raisons de sécurité, ne partagez pas ce lien.
                    </div>
                    
                    <p style="margin-top: 24px;">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
                    <p style="background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all; font-size: 12px;">
                        ${resetUrl}
                    </p>
                </div>
                <div class="footer">
                    <p>© 2024 Gestion des Congés - Tous droits réservés</p>
                    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                    <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Accéder à l'application</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendNotificationEmail(email, subject, html);
};

// Email quand manager approuve
const sendManagerApprovalEmail = async (employeEmail, employeNom, dates, jours) => {
    const subject = '✅ Votre demande de congé a été approuvée par votre manager';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #0f3460; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 24px; background: #0f3460; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                </div>
                <div class="content">
                    <h2>Bonjour ${employeNom},</h2>
                    <p>Votre manager a <strong>approuvé</strong> votre demande de congé.</p>
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jours</p>
                    </div>
                    <p>Votre demande est maintenant en attente de validation finale par l'administrateur.</p>
                    <p>Vous serez notifié une fois la validation finale effectuée.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/requests" class="button">Voir mes demandes</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                    <p>&copy; 2026 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendNotificationEmail(employeEmail, subject, html);
};

// Email quand manager refuse
const sendManagerRejectionEmail = async (employeEmail, employeNom, dates, motif) => {
    const subject = '❌ Votre demande de congé a été refusée';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                </div>
                <div class="content">
                    <h2>Bonjour ${employeNom},</h2>
                    <p>Votre manager a <strong>refusé</strong> votre demande de congé.</p>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>❌ Motif du refus :</strong> ${motif}</p>
                    </div>
                    <p>Vous pouvez faire une nouvelle demande en tenant compte de ce motif.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/new-request" class="button" style="background: #28a745;">Faire une nouvelle demande</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                    <p>&copy; 2026 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendNotificationEmail(employeEmail, subject, html);
};

// Email quand admin approuve définitivement
const sendAdminApprovalEmail = async (employeEmail, employeNom, dates, jours) => {
    const subject = '✅ Votre demande de congé a été définitivement approuvée';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 24px; background: #0f3460; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                </div>
                <div class="content">
                    <h2>Félicitations ${employeNom} !</h2>
                    <p>Votre demande de congé a été <strong>définitivement approuvée</strong> par l'administrateur.</p>
                    <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jours</p>
                    </div>
                    <p>Profitez bien de vos congés ! 🎉</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employee/calendar" class="button">Voir mon calendrier</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                    <p>&copy; 2026 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendNotificationEmail(employeEmail, subject, html);
};

// Email quand admin refuse définitivement
const sendAdminRejectionEmail = async (employeEmail, employeNom, dates, motif) => {
    const subject = '❌ Votre demande de congé a été définitivement refusée';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                </div>
                <div class="content">
                    <h2>Bonjour ${employeNom},</h2>
                    <p>Votre demande de congé a été <strong>définitivement refusée</strong> par l'administrateur.</p>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>❌ Motif du refus :</strong> ${motif}</p>
                    </div>
                    <p>Vous pouvez contacter l'administrateur pour plus d'informations.</p>
                </div>
                <div class="footer">
                    <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                    <p>&copy; 2026 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendNotificationEmail(employeEmail, subject, html);
};

// Email notification au manager d'une nouvelle demande
const sendNewRequestToManagerEmail = async (managerEmail, managerNom, employeNom, dates, jours) => {
    const subject = '📋 Nouvelle demande de congé à valider';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 24px; background: #0f3460; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏢 Gestion des Congés</h1>
                </div>
                <div class="content">
                    <h2>Bonjour ${managerNom},</h2>
                    <p><strong>${employeNom}</strong> a fait une nouvelle demande de congé.</p>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>📅 Dates :</strong> ${dates}</p>
                        <p><strong>📊 Durée :</strong> ${jours} jours</p>
                    </div>
                    <p>Veuillez vous connecter pour approuver ou refuser cette demande.</p>
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/manager/validations" class="button">Valider les demandes</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                    <p>&copy; 2026 Gestion des Congés</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return sendNotificationEmail(managerEmail, subject, html);
};

module.exports = {
    sendResetPasswordEmail,
    sendManagerApprovalEmail,
    sendManagerRejectionEmail,
    sendAdminApprovalEmail,
    sendAdminRejectionEmail,
    sendNewRequestToManagerEmail
};