const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware 'protect': Verifica el token JWT.
 */
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const freshUser = await User.findById(decoded.id);

            if (!freshUser) {
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
                }
            }

            next();

        } catch (error) {
            console.error('Error de token:', error.message);
            return res.status(401).json({ message: 'Token no válido o expirado.' });
        }
    }

    if (!token) {
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
