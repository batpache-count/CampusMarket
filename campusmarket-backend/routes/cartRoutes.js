const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.delete('/remove/:id', cartController.removeFromCart);
router.post('/decrease/:id', cartController.decreaseQuantity);
router.delete('/clear', cartController.clearCart);
router.post('/finalize', cartController.finalizeCart);

module.exports = router;
