const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectDB } = require('./config/database');

// --- Importar Rutas ---
const authRoutes = require('./routes/authRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/productRoutes');
const ubicacionRoutes = require('./routes/ubicacionRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Esenciales ---
app.use(cors({
    origin: '*', // Permitir a TODOS (solo para desarrollo, luego lo cambias a localhost:4200)
    optionsSuccessStatus: 200
}));

// --- Middlewares Globales ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    // Evitar loggear el body si es multipart (multer lo manejará y puede ser ruidoso/pesado)
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
    console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (!isMultipart) console.log('Body:', req.body);
    next();
});

// --- CONFIGURACIÓN DE CARPETA UPLOADS ---
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middleware específico para servir imágenes sin bloqueos
app.use('/uploads', (req, res, next) => {
    // REGLA DE ORO: Si la URL ya es una URL completa de Supabase o externa, redireccionamos
    // Esto evita que las imágenes "desaparezcan" si la BD tiene una URL completa pero el frontend intenta /uploads/https://...
    if (req.url.startsWith('/http')) {
        const fullUrl = req.url.substring(1); // Quitar el primer slash
        console.log(`🔀 Redireccionando solicitud de imagen corrupta: ${fullUrl}`);
        return res.redirect(fullUrl);
    }

    console.log(`🖼️ Solicitud de imagen local: ${req.url}`);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("Cross-Origin-Embedder-Policy", "credentialless");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
}, express.static(uploadsPath, {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

console.log('📂 Carpeta pública configurada en:', uploadsPath);


// --- Conexión a la Base de Datos ---
connectDB();

// --- Rutas de la Aplicación ---
app.get('/api', (req, res) => {
    res.status(200).json({ message: 'API activa' });
});

app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/locations', ubicacionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pagos', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/paypal', require('./routes/paypalRoutes'));
app.use('/api/payment', paymentRoutes);
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/buyer', require('./routes/buyerRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));

// --- Inicio del Servidor ---
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ACTIVO en puerto ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso. Intenta cerrar otros procesos o liberar el puerto.`);
        process.exit(1);
    } else {
        console.error('❌ Error al iniciar el servidor:', err);
    }
});
