const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyerController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @route GET /api/buyer/metrics
 * @desc Obtener métricas para el dashboard del comprador
 * @access Privada
 */
router.get('/metrics', protect, buyerController.getMetrics);

/**
 * @route PUT /api/buyer/profile
 * @desc Actualizar datos del perfil
 * @access Privada
 */
router.put('/profile', protect, buyerController.updateProfile);

module.exports = router;
