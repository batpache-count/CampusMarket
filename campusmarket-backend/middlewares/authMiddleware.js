const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware 'protect': Verifica el token JWT.
 */
const fs = require('fs');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const freshUser = await User.findById(decoded.id);

            if (!freshUser) {
                try { fs.appendFileSync('debug.log', `[Auth] User not found for ID: ${decoded.id}\n`); } catch (e) { }
                return res.status(401).json({ message: 'Usuario no encontrado.' });
            }

            req.user = {
                ...freshUser,
                tiendaId: decoded.tiendaId || null
            };

            // FIX: Si es vendedor pero no tiene tiendaId (por error previo), intentamos buscarlo
            if (req.user.Rol === 'Vendedor' && !req.user.tiendaId) {
                const vendorProfile = await User.findVendorProfileByUserId(req.user.ID_Usuario);
                if (vendorProfile) {
                    req.user.tiendaId = vendorProfile.ID_Vendedor;
                    try { fs.appendFileSync('debug.log', `[Auth] Recovered tiendaId: ${req.user.tiendaId} for User: ${req.user.ID_Usuario}\n`); } catch (e) { }
                } else {
                    try { fs.appendFileSync('debug.log', `[Auth] Vendor profile NOT found for User: ${req.user.ID_Usuario}\n`); } catch (e) { }
                }
            }

            next();

        } catch (error) {
            console.error('Error de token:', error.message);
            try { fs.appendFileSync('debug.log', `[Auth] Token Error: ${error.message}\n`); } catch (e) { }
            return res.status(401).json({ message: 'Token no válido o expirado.' });
        }
    }

    if (!token) {
        try { fs.appendFileSync('debug.log', `[Auth] No token provided\n`); } catch (e) { }
        return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
    }
};

/**
 * Middleware 'optionalAuth': Intenta autenticar pero no falla si no hay token.
 */
exports.optionalAuth = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id);
        if (currentUser) {
            req.user = currentUser;
        }
        next();
    } catch (error) {
        next();
    }
};

/**
 * Middleware 'restrictTo': Verifica roles específicos.
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.Rol)) {
            return res.status(403).json({
                message: 'No tienes permiso para realizar esta acción.'
            });
        }
        next();
    };
};
