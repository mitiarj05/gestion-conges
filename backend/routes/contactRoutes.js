// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/send', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        await transporter.sendMail({
            from: `"${name}" <${email}>`,
            to: process.env.CONTACT_EMAIL || 'support@gestion-conges.com',
            subject: `[Contact] ${subject || 'Nouveau message'}`,
            html: `
                <h3>Nouveau message de contact</h3>
                <p><strong>Nom :</strong> ${name}</p>
                <p><strong>Email :</strong> ${email}</p>
                <p><strong>Sujet :</strong> ${subject || 'Non spécifié'}</p>
                <p><strong>Message :</strong></p>
                <p>${message}</p>
            `
        });
        
        res.json({ message: 'Message envoyé avec succès' });
    } catch (error) {
        console.error('Erreur envoi contact:', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi' });
    }
});

module.exports = router;