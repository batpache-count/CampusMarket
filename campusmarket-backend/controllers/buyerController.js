const { pool } = require('../config/database');

/**
 * Obtiene métricas detalladas para el comprador (Dashboard).
 */
exports.getMetrics = async (req, res) => {
    const userId = req.user.ID_Usuario;

    try {
        // 1. Resumen general (Total gastado y conteo)
        const { rows: summary } = await pool.query(
            'SELECT SUM("Precio_Total") as "totalSpent", COUNT(*) as "orderCount" FROM pedido WHERE "ID_Comprador" = $1',
            [userId]
        );

        // 2. Pedidos por estado
        const { rows: statusStats } = await pool.query(
            'SELECT "Estado_Pedido", COUNT(*) as "count" FROM pedido WHERE "ID_Comprador" = $1 GROUP BY "Estado_Pedido"',
            [userId]
        );

        // 3. Gasto por mes (últimos 6 meses)
        // Postgres: TO_CHAR instead of DATE_FORMAT
        const { rows: monthlySpending } = await pool.query(
            `SELECT TO_CHAR("Fecha_Creacion", 'YYYY-MM') as month, SUM("Precio_Total") as amount 
             FROM pedido 
             WHERE "ID_Comprador" = $1 AND "Fecha_Creacion" >= (NOW() - INTERVAL '6 months')
             GROUP BY month ORDER BY month`,
            [userId]
        );

        // 4. Distribución por categorías
        const { rows: categoryDist } = await pool.query(
            `SELECT c."Nombre", SUM(dp."Cantidad" * dp."Precio_Unitario") as spending
             FROM detalle_pedido dp
             JOIN producto p ON dp."ID_Producto" = p."ID_Producto"
             JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
             JOIN pedido ped ON dp."ID_Pedido" = ped."ID_Pedido"
             WHERE ped."ID_Comprador" = $1
             GROUP BY c."ID_Categoria", c."Nombre" ORDER BY spending DESC LIMIT 5`,
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

/**
 * Actualiza el perfil del comprador.
 */
exports.updateProfile = async (req, res) => {
    const userId = req.user.ID_Usuario;
    const { nombre, telefono } = req.body;

    try {
        // Actualizar datos básicos (Nombre y Teléfono)
        await pool.query(
            'UPDATE usuario SET "Nombre" = $1, "Telefono" = $2 WHERE "ID_Usuario" = $3',
            [nombre, telefono, userId]
        );

        res.json({ message: 'Perfil actualizado correctamente.' });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ message: 'Error al actualizar perfil.' });
    }
};
