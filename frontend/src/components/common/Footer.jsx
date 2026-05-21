// frontend/src/components/common/Footer.jsx
import React from 'react';

function Footer() {
    const currentYear = new Date().getFullYear();
    
    return (
        <footer className="app-footer">
            <p>&copy; {currentYear} Gestion des Congés - Application pour entreprise privée</p>
            <p>Tous droits réservés</p>
        </footer>
    );
}

export default Footer;