const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// --- Rutas Públicas de Autenticación ---

// POST /api/auth/register
// RF-C-001: Registro de Nuevo Usuario
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/send-verification-code
router.post('/send-verification-code', authController.sendVerificationCode);

// POST /api/auth/verify-code
router.post('/verify-code', authController.verifyCode);

// PUT /api/auth/profile
const multer = require('multer');
const path = require('path');

// --- Multer Config (Profile Images to memory) ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite 5MB
});

// PUT /api/auth/profile
// Ahora acepta imagen bajo el campo 'image'
router.put('/profile', protect, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(500).json({
                message: 'Error subiendo imagen: ' + (err.message || err),
                stack: err.stack
            });
        }
        next();
    });
}, authController.updateProfile);

// POST /api/auth/change-password
router.post('/change-password', protect, authController.changePassword);

module.exports = router;