import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

console.log('🚀 [INDEX] Démarrage de l\'application');

const root = ReactDOM.createRoot(document.getElementById('root'));

// Désactiver StrictMode pour éviter les doubles montages qui causent des problèmes de portal
root.render(
    <App />
);

console.log('✅ [INDEX] Application montée');