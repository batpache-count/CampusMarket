const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ==========================================================
// Rutas de Pedidos
// Todas las rutas están protegidas por el middleware 'protect'
// ==========================================================

/**
 * @route POST /api/orders
 * @desc Crear un nuevo pedido (RF-C-004).
 * @access Privada (Cualquier usuario logueado)
 */
router.post(
    '/', 
    protect, 
    orderController.createOrder
);

/**
 * @route GET /api/orders/my-orders
 * @desc Obtener el historial de pedidos del Comprador (RF-C-005).
 * @access Privada (Cualquier usuario logueado)
 */
router.get(
    '/my-orders',
    protect,
    orderController.getMyOrdersAsBuyer
);

/**
 * @route GET /api/orders/my-sales
 * @desc Obtener las ventas recibidas por el Vendedor (RF-V-007).
 * @access Privada (Solo Vendedor)
 */
router.get(
    '/my-sales',
    protect,
    restrictTo('Vendedor'),
    orderController.getMyOrdersAsSeller
);

/**
 * @route GET /api/orders/:id/details
 * @desc Obtener el detalle (productos) de un pedido (RF-V-009).
 * @access Privada (Comprador o Vendedor propietario)
 */
router.get(
    '/:id/details',
    protect,
    orderController.getOrderDetails
);

/**
 * @route PUT /api/orders/:id/status
 * @desc Actualizar el estado de un pedido (RF-V-008).
 * @access Privada (Solo Vendedor propietario)
 */
router.put(
    '/:id/status',
    protect,
    restrictTo('Vendedor'),
    orderController.updateOrderStatus
);

module.exports = router;
