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

// PUT /api/auth/profile
const multer = require('multer');
const path = require('path');

// --- Multer Config (Profile Images) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Using same uploads folder for simplicity
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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