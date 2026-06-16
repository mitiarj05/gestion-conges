// backend/test-email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
const emailPort = parseInt(process.env.EMAIL_PORT) || 587;

console.log('=== TEST EMAIL ===');
console.log('Email User:', emailUser ? '✅ OK' : '❌ MANQUANT');
console.log('Email Pass:', emailPass ? '✅ OK' : '❌ MANQUANT');
console.log('Host:', emailHost);
console.log('Port:', emailPort);
console.log('');

if (!emailUser || !emailPass) {
    console.error('❌ Variables email manquantes!');
    console.log('');
    console.log('💡 Ajoutez dans votre .env:');
    console.log('   EMAIL_USER=votre_email@gmail.com');
    console.log('   EMAIL_PASS=votre_mot_de_passe_application');
    console.log('');
    console.log('📌 Pour Gmail, utilisez un "Mot de passe d\'application":');
    console.log('   https://myaccount.google.com/apppasswords');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
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

async function testEmail() {
    try {
        console.log('📧 Tentative d\'envoi d\'email...');
        console.log(`   À: ${emailUser}`);
        console.log(`   Depuis: ${emailUser}`);
        console.log('');

        const info = await transporter.sendMail({
            from: `"Gestion des Congés" <${emailUser}>`,
            to: emailUser,
            subject: '✅ Test Email - Gestion des Congés',
            html: `
                <h1>✅ Test réussi!</h1>
                <p>Ceci est un test d'email pour l'application Gestion des Congés.</p>
                <p>Email envoyé le: ${new Date().toLocaleString()}</p>
                <hr>
                <p><strong>Configuration:</strong></p>
                <ul>
                    <li>Host: ${emailHost}</li>
                    <li>Port: ${emailPort}</li>
                    <li>User: ${emailUser}</li>
                </ul>
                <p>✅ L'email fonctionne correctement avec Nodemailer!</p>
            `,
            text: 'Test réussi! Ceci est un test d\'email.'
        });

        console.log('✅ Email envoyé avec succès!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        console.log('');
        console.log('📧 Vérifiez votre boîte mail.');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi:');
        console.error('Message:', error.message);
        console.log('');
        console.log('💡 Causes possibles:');
        console.log('   1. Mot de passe incorrect');
        console.log('   2. Compte Gmail bloqué');
        console.log('   3. Mot de passe d\'application non généré');
        console.log('');
        console.log('🔧 Solutions:');
        console.log('   - Créez un "Mot de passe d\'application" sur:');
        console.log('     https://myaccount.google.com/apppasswords');
        console.log('   - Activez la vérification en deux étapes');
    }
}

testEmail();