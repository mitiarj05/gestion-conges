// frontend/src/components/common/Loader.jsx
import React from 'react';

function Loader({ size = 'md', text = 'Chargement...' }) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };
    
    return (
        <div className="loader-container">
            <div className={`loader-spinner ${sizes[size]}`}>
                <div className="loader-ring"></div>
                <div className="loader-ring"></div>
                <div className="loader-ring"></div>
            </div>
            {text && <p className="loader-text">{text}</p>}
        </div>
    );
}

export default Loader;