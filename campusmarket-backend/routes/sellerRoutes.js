const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// --- Configuración de Multer (Subida de imágenes) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Carpeta donde se guardan
    },
    filename: function (req, file, cb) {
        // Nombre único: idUsuario + fecha + extensión
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'seller-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- Rutas ---

// 1. OBTENER PERFIL (NUEVA RUTA AGREGADA AQUÍ) ✅
// Esta ruta permite cargar la foto y nombre al entrar al dashboard
router.get(
    '/profile',
    protect,
    restrictTo('Vendedor'),
    sellerController.getSellerProfile
);

// 2. OBTENER ESTADÍSTICAS (KPIs)
router.get(
    '/stats',
    protect,
    restrictTo('Vendedor'),
    sellerController.getDashboardStats
);

// POST /api/seller/become-seller
router.post('/become-seller', protect, sellerController.becomeSeller);

// PUT /api/seller/profile (Actualizar datos de texto)
router.put(
    '/profile',
    protect,
    restrictTo('Vendedor'),
    sellerController.updateSellerProfile
);

// POST /api/seller/upload-photo
router.post(
    '/upload-photo',
    protect,
    restrictTo('Vendedor'),
    upload.single('photo'), // 'photo' es el nombre del campo que enviará Angular
    sellerController.uploadSellerPhoto
);

// Ver mis productos
router.get(
    '/my-products',
    protect,
    restrictTo('Vendedor'),
    sellerController.getMyProducts
);

// Borrar mi producto
router.delete(
    '/products/:id',
    protect,
    restrictTo('Vendedor'),
    sellerController.deleteProduct
);

module.exports = router;