const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ==========================================================
// Rutas de Vendedor (Protegidas y Restringidas a 'Vendedor')
// (RF-V-006: Gestión de Puntos de Entrega)
// ==========================================================

// --- Rutas para /api/locations ---

router.route('/')
    /**
     * @route POST /api/locations
     * @desc Crear un nuevo punto de entrega.
     * @access Privada (Vendedor)
     */
    .post(protect, restrictTo('Vendedor'), ubicacionController.createUbicacion)

    /**
     * @route GET /api/locations
     * @desc Obtener TODOS los puntos de entrega (activos e inactivos) del vendedor logueado.
     * @access Privada (Vendedor)
     */
    .get(protect, restrictTo('Vendedor'), ubicacionController.getMyUbicaciones);


// --- Rutas para /api/locations/:id ---

router.route('/:id')
    /**
     * @route PUT /api/locations/:id
     * @desc Actualizar un punto de entrega (nombre, desc, estado).
     * @access Privada (Vendedor - Propietario)
     */
    .put(protect, restrictTo('Vendedor'), ubicacionController.updateUbicacion)

    /**
     * @route DELETE /api/locations/:id
     * @desc Eliminar un punto de entrega (si no tiene pedidos activos).
     * @access Privada (Vendedor - Propietario)
     */
    .delete(protect, restrictTo('Vendedor'), ubicacionController.deleteUbicacion);


// ==========================================================
// Ruta de Comprador (Protegida)
// (RF-C-004: Flujo de Checkout)
// ==========================================================

/**
 * @route GET /api/locations/vendor/:idVendedor
 * @desc Obtener los puntos de entrega ACTIVOS de un vendedor específico.
 * @desc Usado por el Comprador al momento de hacer checkout.
 * @access Privada (Cualquier usuario logueado)
 */
router.get('/vendor/:idVendedor', ubicacionController.getVendorActiveUbicaciones);


module.exports = router;
