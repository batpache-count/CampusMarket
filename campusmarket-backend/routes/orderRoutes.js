const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');


// ==========================================================
// Rutas de Pedidos
// ==========================================================

// --- Nueva Ruta para PayPal Authorization ---
router.post('/authorize-paypal', orderController.authorizePayPalOrder);

// --- Rutas Originales ---
router.post('/', protect, orderController.createOrder);
router.post('/crear-orden-paypal', protect, orderController.initPayPalOrder);

router.get('/my-orders', protect, orderController.getMyOrdersAsBuyer);
router.get('/my-sales', protect, restrictTo('Vendedor'), orderController.getMyOrdersAsSeller);
router.get('/:id/details', protect, orderController.getOrderDetails);
router.put('/:id/status', protect, restrictTo('Vendedor'), orderController.updateOrderStatus);
router.post('/:id/validate-qr', protect, restrictTo('Vendedor'), orderController.validateQR);
router.post('/:id/rate', protect, orderController.rateOrder);
router.post('/:id/confirm-receipt', protect, orderController.confirmReceipt);
router.post('/:id/voucher', protect, orderController.upload.single('image'), orderController.uploadVoucher);
router.post('/:id/report', protect, require('../controllers/reportController').createReport);
router.post('/webhook/paypal', orderController.handlePayPalWebhook);

module.exports = router;
