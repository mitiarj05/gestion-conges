// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// Configuration du transporteur email
let transporter = null;

const initTransporter = () => {
    if (!transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
};

// Envoyer email d'activation
const sendActivationEmail = async (email, nom, prenom, token) => {
    try {
        initTransporter();
        
        if (!transporter) {
            console.log('Email non configuré, skip envoi');
            return false;
        }
        
        const activationLink = `http://localhost:3000/activate?token=${token}`;
        
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Gestion Congés" <noreply@gestion-conges.com>',
            to: email,
            subject: 'Activation de votre compte - Gestion des Congés',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #0f3460; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9f9f9; }
                        .button { display: inline-block; padding: 12px 24px; background: #0f3460; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; padding: 20px; font-size: 12px; color: #888; }
                        .code { background: #f0f0f0; padding: 10px; font-family: monospace; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏢 Gestion des Congés</h1>
                        </div>
                        <div class="content">
                            <h2>Bienvenue ${prenom} ${nom} !</h2>
                            <p>Votre compte a été créé par l'administrateur.</p>
                            <p>Cliquez sur le bouton ci-dessous pour activer votre compte et définir votre mot de passe :</p>
                            <div style="text-align: center;">
                                <a href="${activationLink}" class="button">Activer mon compte</a>
                            </div>
                            <p>Ou copiez ce lien dans votre navigateur :</p>
                            <div class="code">${activationLink}</div>
                            <p><strong>⚠️ Ce lien expire dans 48 heures.</strong></p>
                        </div>
                        <div class="footer">
                            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                            <p>&copy; 2024 Gestion des Congés</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log('Email envoyé à:', email);
        return true;
        
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
};

// Envoyer email de notification de mot de passe modifié
const sendPasswordChangedEmail = async (email, nom, prenom) => {
    try {
        initTransporter();
        
        if (!transformer) {
            return false;
        }
        
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Gestion Congés" <noreply@gestion-conges.com>',
            to: email,
            subject: 'Votre mot de passe a été modifié',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #0f3460; color: white; padding: 20px; text-align: center;">
                        <h1>🏢 Gestion des Congés</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2>Bonjour ${prenom} ${nom},</h2>
                        <p>Votre mot de passe a été réinitialisé par l'administrateur.</p>
                        <p>Voici vos nouveaux identifiants :</p>
                        <div style="background: #f0f0f0; padding: 15px; margin: 20px 0;">
                            <p><strong>Email :</strong> ${email}</p>
                            <p><strong>Mot de passe temporaire :</strong> <code>Temp123!</code></p>
                        </div>
                        <p>Nous vous recommandons de changer ce mot de passe lors de votre prochaine connexion.</p>
                    </div>
                </div>
            `
        });
        
        return true;
        
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
};

module.exports = { sendActivationEmail, sendPasswordChangedEmail };