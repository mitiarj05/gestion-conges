const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Non authentifié' });
        }
        
        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ 
                message: 'Accès refusé. Rôle insuffissant.',
                required: allowedRoles,
                yourRoles: userRoles
            });
        }
        
        next();
    };
};

module.exports = { requireRoles };