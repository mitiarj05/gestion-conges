// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// Configuration du transporteur email (à configurer avec vos identifiants)
let transporter = null;

const initTransporter = () => {
    if (!transporter) {
        // Pour Gmail (recommandé pour les tests)
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER, // Votre email Gmail
                pass: process.env.EMAIL_PASS  // Mot de passe d'application Gmail
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
                        <a href="http://localhost:3000/dashboard/employee/requests" class="button">Voir mes demandes</a>
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
                        <a href="http://localhost:3000/dashboard/employee/new-request" class="button" style="background: #28a745;">Faire une nouvelle demande</a>
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
                        <a href="http://localhost:3000/dashboard/employee/calendar" class="button">Voir mon calendrier</a>
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
                        <a href="http://localhost:3000/dashboard/manager/validations" class="button">Valider les demandes</a>
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
    sendManagerApprovalEmail,
    sendManagerRejectionEmail,
    sendAdminApprovalEmail,
    sendAdminRejectionEmail,
    sendNewRequestToManagerEmail
};