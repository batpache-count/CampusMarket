const { pool } = require('../config/database');

/**
 * Modelo para gestionar el CRUD de Pedidos (RF-C-004, RF-V-007, RF-V-008)
 */
class Order {

    /**
     * Crea un nuevo pedido (RF-C-004).
     * Esta función es una TRANSACCIÓN. Si algo falla (ej. stock),
     * se hace rollback automáticamente.
     */
    static async create(orderData) {
        const {
            ID_Comprador,
            ID_Vendedor,
            ID_Ubicacion_Entrega,
            Hora_Encuentro,
            Precio_Total,
            items, // Array de productos
            Metodo_Pago,
            PayPal_Transaction_ID
        } = orderData;

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Crear el Pedido principal
            const pedidoQuery = `
                INSERT INTO pedido (ID_Comprador, ID_Vendedor, Estado_Pedido, Precio_Total, Metodo_Pago, PayPal_Transaction_ID, QR_Token)
                VALUES (?, ?, 'Pendiente', ?, ?, ?, ?)
            `;
            const [pedidoResult] = await connection.query(pedidoQuery, [
                ID_Comprador,
                ID_Vendedor,
                Precio_Total,
                Metodo_Pago || 'Efectivo',
                PayPal_Transaction_ID || null,
                orderData.QR_Token || null
            ]);
            const newPedidoId = pedidoResult.insertId;

            // 2. Insertar los detalles del pedido y actualizar stock
            for (const item of items) {
                const detalleQuery = `
                    INSERT INTO detalle_pedido (ID_Pedido, ID_Producto, Cantidad, Precio_Unitario)
                    VALUES (?, ?, ?, ?)
                `;
                await connection.query(detalleQuery, [
                    newPedidoId,
                    item.ID_Producto,
                    item.Cantidad,
                    item.Precio_Unitario
                ]);

                // Actualizar el stock del producto
                const updateStockQuery = `UPDATE producto SET Stock = Stock - ? WHERE ID_Producto = ?`;
                await connection.query(updateStockQuery, [item.Cantidad, item.ID_Producto]);
            }

            // 3. Insertar en la tabla 'encuentro' (RF-C-004)
            const encuentroQuery = `
                INSERT INTO encuentro (ID_Pedido, ID_Ubicacion, Hora_Encuentro)
                VALUES (?, ?, ?)
            `;
            await connection.query(encuentroQuery, [newPedidoId, ID_Ubicacion_Entrega, Hora_Encuentro]);

            await connection.commit();
            return newPedidoId;

        } catch (error) {
            await connection.rollback();
            console.error('Error en Order.create:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene los pedidos de un vendedor (RF-V-007).
     */
    static async findByVendor(idVendedor) {
        const query = `
            SELECT 
                p.ID_Pedido, 
                p.Fecha_Creacion, 
                p.Estado_Pedido, 
                p.Precio_Total,
                p.Metodo_Pago,
                p.PayPal_Transaction_ID,
                u.Nombre AS Nombre_Comprador,
                u.Email AS Email_Comprador
            FROM pedido p
            JOIN usuario u ON p.ID_Comprador = u.ID_Usuario
            WHERE p.ID_Vendedor = ?
            ORDER BY p.Fecha_Creacion DESC
        `;
        try {
            const [rows] = await pool.query(query, [idVendedor]);
            return rows;
        } catch (error) {
            console.error('Error en Order.findByVendor:', error);
            throw error;
        }
    }

    /**
     * Obtiene los pedidos de un comprador (RF-C-005).
     */
    static async findByBuyer(idComprador) {
        const query = `
            SELECT 
                p.ID_Pedido, 
                p.Fecha_Creacion, 
                p.Estado_Pedido, 
                p.Precio_Total,
                p.Metodo_Pago,
                p.PayPal_Transaction_ID,
                v.Nombre_Tienda AS Nombre_Vendedor
            FROM pedido p
            JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor
            WHERE p.ID_Comprador = ?
            ORDER BY p.Fecha_Creacion DESC
        `;
        try {
            const [rows] = await pool.query(query, [idComprador]);
            return rows;
        } catch (error) {
            console.error('Error en Order.findByBuyer:', error);
            throw error;
        }
    }

    /**
     * Obtiene los detalles (productos) de un pedido.
     */
    static async findDetails(idPedido) {
        const query = `
            SELECT 
                dp.ID_Producto,
                dp.Cantidad,
                dp.Precio_Unitario,
                prod.Nombre AS Nombre_Producto
            FROM detalle_pedido dp
            JOIN producto prod ON dp.ID_Producto = prod.ID_Producto
            WHERE dp.ID_Pedido = ?
        `;
        try {
            const [rows] = await pool.query(query, [idPedido]);
            return rows;
        } catch (error) {
            console.error('Error en Order.findDetails:', error);
            throw error;
        }
    }

    /**
     * Actualiza el estado de un pedido (RF-V-008).
     * Es una transacción para actualizar 'pedido' y registrar en 'historial_pedido'.
     * @param {number} idPedido - ID_Pedido.
     * @param {string} newStatus - Nuevo estado (ej. 'En preparacion').
     * @param {string} actor - Quién realiza el cambio (ej. 'Vendedor').
     * @returns {boolean} Éxito.
     */
    static async updateStatus(idPedido, newStatus, actor) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Obtener el estado anterior
            const [current] = await connection.query("SELECT Estado_Pedido FROM pedido WHERE ID_Pedido = ?", [idPedido]);
            const oldStatus = current[0].Estado_Pedido;

            if (oldStatus === newStatus) {
                await connection.rollback();
                return true; // No hay cambios
            }

            // 2. Actualizar el estado en la tabla 'pedido'
            const updateQuery = `UPDATE pedido SET Estado_Pedido = ? WHERE ID_Pedido = ?`;
            await connection.query(updateQuery, [newStatus, idPedido]);

            // 3. Registrar el cambio en la tabla 'historial_pedido' (RF-V-008)
            const historyQuery = `
                INSERT INTO historial_pedido (ID_Pedido, Estado_Anterior, Estado_Nuevo, Actor)
                VALUES (?, ?, ?, ?)
            `;
            await connection.query(historyQuery, [idPedido, oldStatus, newStatus, actor]);

            // 4. (Opcional) Si el estado es 'Cancelado', restaurar el stock
            if (newStatus === 'Cancelado' && oldStatus !== 'Cancelado') {
                const details = await Order.findDetails(idPedido);
                for (const item of details) {
                    await connection.query(
                        'UPDATE producto SET Stock = Stock + ? WHERE ID_Producto = ?',
                        [item.Cantidad, item.ID_Producto]
                    );
                }
            }

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            console.error('Error en Order.updateStatus:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Busca un pedido por ID (para verificar propiedad).
     * @param {number} idPedido - ID_Pedido.
     * @returns {object|null} El pedido.
     */
    static async findById(idPedido) {
        const query = `SELECT * FROM pedido WHERE ID_Pedido = ?`;
        try {
            const [rows] = await pool.query(query, [idPedido]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Order;