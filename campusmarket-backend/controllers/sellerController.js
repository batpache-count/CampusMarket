const User = require('../models/User');
const Product = require('../models/Product');
const { pool } = require('../config/database');

/**
 * 1. Obtener productos del vendedor (Para el Dashboard)
 */
exports.getMyProducts = async (req, res) => {
    try {
        // Obtener ID Vendedor
        const vendorProfile = await User.findVendorProfileByUserId(req.user.ID_Usuario);
        if (!vendorProfile) {
            return res.status(404).json({ message: 'Vendedor no encontrado.' });
        }

        // Consultar productos
        const [products] = await pool.query(
            'SELECT * FROM producto WHERE ID_Vendedor = ? ORDER BY ID_Producto DESC',
            [vendorProfile.ID_Vendedor]
        );

        res.status(200).json(products);
    } catch (error) {
        console.error('Error en getMyProducts:', error);
        res.status(500).json({ message: 'Error al obtener productos.' });
    }
};

/**
 * 2. Borrar producto
 */
exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        await pool.query('DELETE FROM producto WHERE ID_Producto = ?', [productId]);
        res.status(200).json({ message: 'Producto eliminado.' });
    } catch (error) {
        console.error('Error en deleteProduct:', error);
        res.status(500).json({ message: 'Error al eliminar producto.' });
    }
};

/**
 * 3. Convertirse en Vendedor
 */
exports.becomeSeller = async (req, res) => {
    const userId = req.user.ID_Usuario;
    const { Nombre_Tienda } = req.body;

    if (!Nombre_Tienda) return res.status(400).json({ message: 'Nombre de tienda requerido.' });

    try {
        if (req.user.Rol === 'Vendedor') return res.status(400).json({ message: 'Ya eres vendedor.' });

        await User.becomeSeller(userId, req.body);
        res.status(201).json({ message: 'Perfil de vendedor creado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error interno.' });
    }
};

/**
 * 4. Actualizar Perfil (Texto)
 */
exports.updateSellerProfile = async (req, res) => {
    try {
        const vendorProfile = await User.findVendorProfileByUserId(req.user.ID_Usuario);
        if (!vendorProfile) return res.status(404).json({ message: 'No encontrado.' });

        // Normalizar nombres de campos del frontend
        const normalizedData = {
            Nombre_Tienda: req.body.nombre_tienda || req.body.Nombre_Tienda,
            Descripcion_Tienda: req.body.descripcion_tienda || req.body.Descripcion_Tienda
        };

        await User.updateSellerProfile(vendorProfile.ID_Vendedor, normalizedData);
        res.status(200).json({ message: 'Perfil actualizado.' });
    } catch (error) {
        console.error('Error en updateSellerProfile:', error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

/**
 * 5. Subir Foto de Perfil
 */
exports.uploadSellerPhoto = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No hay imagen.' });

    try {
        const vendorProfile = await User.findVendorProfileByUserId(req.user.ID_Usuario);
        if (!vendorProfile) return res.status(404).json({ message: 'Vendedor no encontrado.' });

        const photoUrl = req.file.filename;
        await pool.query('UPDATE vendedor SET Foto_Perfil = ? WHERE ID_Vendedor = ?', [photoUrl, vendorProfile.ID_Vendedor]);

        res.status(200).json({ message: 'Foto actualizada', photoUrl });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar foto.' });
    }
};

/**
 * 6. Obtener Perfil Completo (ESTA ES LA QUE FALTABA)
 * Sirve para cargar la foto y el nombre cuando entras al Dashboard.
 */
exports.getSellerProfile = async (req, res) => {
    try {
        const vendorProfile = await User.findVendorProfileByUserId(req.user.ID_Usuario);

        if (!vendorProfile) {
            return res.status(404).json({ message: 'Perfil de vendedor no encontrado.' });
        }

        // Devolvemos los datos para pintar el Sidebar
        res.status(200).json({
            nombre_tienda: vendorProfile.Nombre_Tienda,
            foto: vendorProfile.Foto_Perfil,
            descripcion: vendorProfile.Descripcion_Tienda
        });

    } catch (error) {
        console.error('Error en getSellerProfile:', error);
        res.status(500).json({ message: 'Error al cargar perfil.' });
    }
};

/**
 * 7. Obtener Estadísticas del Dashboard (RF-V-Dashboard)
 * Endpoint: GET /api/seller/stats
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const vendorProfile = await User.findVendorProfileByUserId(req.user.ID_Usuario);
        if (!vendorProfile) {
            return res.status(404).json({ message: 'Vendedor no encontrado.' });
        }
        const idVendedor = vendorProfile.ID_Vendedor;

        // Ejecutamos consultas en paralelo para mayor velocidad
        const [
            [totalSalesResult],
            [completedOrdersResult],
            [pendingOrdersResult],
            [activeProductsResult]
        ] = await Promise.all([
            // 1. Ingresos Totales (Solo pedidos Entregados)
            pool.query(
                `SELECT COALESCE(SUM(Precio_Total), 0) AS total 
                 FROM pedido 
                 WHERE ID_Vendedor = ? AND Estado_Pedido = 'Entregado'`,
                [idVendedor]
            ),
            // 2. Pedidos Completados
            pool.query(
                `SELECT COUNT(*) AS count 
                 FROM pedido 
                 WHERE ID_Vendedor = ? AND Estado_Pedido = 'Entregado'`,
                [idVendedor]
            ),
            // 3. Pedidos Pendientes (Pendiente o En preparacion)
            pool.query(
                `SELECT COUNT(*) AS count 
                 FROM pedido 
                 WHERE ID_Vendedor = ? AND Estado_Pedido IN ('Pendiente', 'En preparacion')`,
                [idVendedor]
            ),
            // 4. Productos Activos
            pool.query(
                `SELECT COUNT(*) AS count 
                 FROM producto 
                 WHERE ID_Vendedor = ? AND Activo = 1`, // Asumiendo que 1 es activo
                [idVendedor]
            )
        ]);

        res.status(200).json({
            ingresos_totales: Number(totalSalesResult[0].total),
            pedidos_completados: Number(completedOrdersResult[0].count),
            pedidos_pendientes: Number(pendingOrdersResult[0].count),
            productos_activos: Number(activeProductsResult[0].count)
        });

    } catch (error) {
        console.error('Error en getDashboardStats:', error);
        res.status(500).json({ message: 'Error al calcular estadísticas.' });
    }
};