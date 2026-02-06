const { pool } = require('../config/database');

/**
 * Obtiene métricas detalladas para el comprador (Dashboard).
 */
exports.getMetrics = async (req, res) => {
    const userId = req.user.ID_Usuario;

    try {
        // 1. Resumen general (Total gastado y conteo)
        const [summary] = await pool.query(
            'SELECT SUM(Precio_Total) as totalSpent, COUNT(*) as orderCount FROM pedido WHERE ID_Comprador = ?',
            [userId]
        );

        // 2. Pedidos por estado
        const [statusStats] = await pool.query(
            'SELECT Estado_Pedido, COUNT(*) as count FROM pedido WHERE ID_Comprador = ? GROUP BY Estado_Pedido',
            [userId]
        );

        // 3. Gasto por mes (últimos 6 meses)
        const [monthlySpending] = await pool.query(
            `SELECT DATE_FORMAT(Fecha_Creacion, '%Y-%m') as month, SUM(Precio_Total) as amount 
             FROM pedido 
             WHERE ID_Comprador = ? AND Fecha_Creacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month`,
            [userId]
        );

        // 4. Distribución por categorías
        const [categoryDist] = await pool.query(
            `SELECT c.Nombre, SUM(dp.Cantidad * dp.Precio_Unitario) as spending
             FROM detalle_pedido dp
             JOIN producto p ON dp.ID_Producto = p.ID_Producto
             JOIN categoria c ON p.ID_Categoria = c.ID_Categoria
             JOIN pedido ped ON dp.ID_Pedido = ped.ID_Pedido
             WHERE ped.ID_Comprador = ?
             GROUP BY c.ID_Categoria ORDER BY spending DESC LIMIT 5`,
            [userId]
        );

        res.json({
            summary: {
                totalSpent: summary[0].totalSpent || 0,
                orderCount: summary[0].orderCount || 0
            },
            statusStats,
            monthlySpending,
            categoryDist
        });

    } catch (error) {
        console.error('Error obteniendo métricas de comprador:', error);
        res.status(500).json({ message: 'Error al obtener métricas.' });
    }
};
