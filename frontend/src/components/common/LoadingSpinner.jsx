// frontend/src/components/common/LoadingSpinner.jsx
import React from 'react';

function LoadingSpinner({ size = 'md', text = 'Chargement...' }) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };
    
    return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            {text && <div className="loading-text">{text}</div>}
        </div>
    );
}

export default LoadingSpinner;