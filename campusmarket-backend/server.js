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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURACIÓN DE CARPETA UPLOADS ---
const uploadsPath = path.join(process.cwd(), 'uploads');

// Middleware específico para servir imágenes sin bloqueos
app.use('/uploads', (req, res, next) => {
    console.log(`🖼️ Solicitud de imagen: ${req.url}`);
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/buyer', require('./routes/buyerRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));

// --- Inicio del Servidor ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
});