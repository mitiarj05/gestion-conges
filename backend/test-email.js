// backend/test-email.js
const mailjet = require('node-mailjet');
require('dotenv').config();

const apiKey = process.env.MAILJET_API_KEY;
const apiSecret = process.env.MAILJET_SECRET_KEY;

console.log('=== TEST MAILJET ===');
console.log('API Key:', apiKey ? '✅ OK' : '❌ MANQUANTE');
console.log('API Secret:', apiSecret ? '✅ OK' : '❌ MANQUANT');
console.log('From Email:', process.env.MAILJET_FROM_EMAIL || 'non défini');
console.log('');

if (!apiKey || !apiSecret) {
    console.error('❌ Variables Mailjet manquantes!');
    process.exit(1);
}

// Syntaxe correcte pour node-mailjet v6
const mailjetClient = mailjet.apiConnect(apiKey, apiSecret);

async function testEmail() {
    try {
        console.log('📧 Tentative d\'envoi d\'email...');
        
        const request = mailjetClient.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.MAILJET_FROM_EMAIL || 'mitiarj05@gmail.com',
                        Name: process.env.MAILJET_FROM_NAME || 'Test Mailjet'
                    },
                    To: [
                        {
                            Email: 'mitiarj05@gmail.com',
                            Name: 'Test Recipient'
                        }
                    ],
                    Subject: 'Test Mailjet depuis API - Gestion des Congés',
                    HTMLPart: '<h1>✅ Test réussi!</h1><p>Ceci est un test de l\'API Mailjet pour l\'application Gestion des Congés.</p><p>Email envoyé le: ' + new Date().toLocaleString() + '</p>',
                    TextPart: 'Test réussi! Ceci est un test de l\'API Mailjet.'
                }
            ]
        });
        
        const result = await request;
        console.log('✅ Email envoyé avec succès!');
        console.log('Résultat:', JSON.stringify(result.body, null, 2));
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi:');
        console.error('Message:', error.message);
        if (error.statusCode) {
            console.error('Status Code:', error.statusCode);
        }
        if (error.response && error.response.body) {
            console.error('Détails:', error.response.body);
        }
    }
}

testEmail();