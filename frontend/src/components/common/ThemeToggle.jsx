// frontend/src/components/common/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button 
            onClick={toggleTheme} 
            className="theme-toggle"
            title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
        >
            {theme === 'light' ? '🌙' : '☀️'}
            <span className="theme-toggle-text">
                {theme === 'light' ? 'Mode sombre' : 'Mode clair'}
            </span>
        </button>
    );
}

export default ThemeToggle;