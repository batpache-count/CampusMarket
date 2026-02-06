const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, restrictTo, optionalAuth } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// --- CONFIGURACIÓN DE MULTER (Subida de imágenes) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- RUTAS PÚBLICAS ---

// 1. Catálogo general
router.get('/', productController.getPublicCatalog);

// 2. Categorías
router.get('/categories', productController.getCategories);


// --- RUTAS PROTEGIDAS (VENDEDOR) ---

// 3. Crear Producto (Con imagen)
router.post(
    '/',
    protect,
    restrictTo('Vendedor'),
    upload.single('image'),
    productController.createProduct
);

// 4. Mi Inventario
router.get(
    '/my-inventory',
    protect,
    restrictTo('Vendedor'),
    productController.getMyInventory
);

// 5. Actualizar Producto
router.put(
    '/:id',
    protect,
    restrictTo('Vendedor'),
    upload.single('image'),
    productController.updateProduct
);

// 6. Eliminar/Desactivar Producto
router.delete(
    '/:id',
    protect,
    restrictTo('Vendedor'),
    productController.deactivateProduct
);


// --- CALIFICACIONES Y DETALLE ---

// 7. Calificar Producto
router.post(
    '/:productId/rate',
    protect,
    productController.rateProduct
);

// 8. Detalle de Producto (Auth opcional para ver mi calificación)
router.get('/:id', optionalAuth, productController.getProductById);

// 9. Favoritos
router.get('/my/favorites', protect, productController.getFavorites);
router.post('/:productId/favorite', protect, productController.toggleFavorite);

// 10. Reseñas
router.get('/:productId/reviews', productController.getProductReviews);

module.exports = router;