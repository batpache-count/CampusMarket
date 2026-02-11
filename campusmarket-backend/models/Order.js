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
            PayPal_Transaction_ID,
            QR_Token
        } = orderData;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Crear el Pedido principal
            const pedidoQuery = `
                INSERT INTO pedido ("ID_Comprador", "ID_Vendedor", "Estado_Pedido", "Precio_Total", "Metodo_Pago", "PayPal_Transaction_ID", "QR_Token")
                VALUES ($1, $2, 'Pendiente', $3, $4, $5, $6)
                RETURNING "ID_Pedido"
            `;
            const { rows: pedidoRows } = await client.query(pedidoQuery, [
                ID_Comprador,
                ID_Vendedor,
                Precio_Total,
                Metodo_Pago || 'Efectivo',
                PayPal_Transaction_ID || null,
                QR_Token || null
            ]);
            const newPedidoId = pedidoRows[0].ID_Pedido;

            // 2. Insertar los detalles del pedido y actualizar stock
            for (const item of items) {
                const detalleQuery = `
                    INSERT INTO detalle_pedido ("ID_Pedido", "ID_Producto", "Cantidad", "Precio_Unitario")
                    VALUES ($1, $2, $3, $4)
                `;
                await client.query(detalleQuery, [
                    newPedidoId,
                    item.ID_Producto,
                    item.Cantidad,
                    item.Precio_Unitario
                ]);

                // Actualizar el stock del producto
                const updateStockQuery = `UPDATE producto SET "Stock" = "Stock" - $1 WHERE "ID_Producto" = $2`;
                await client.query(updateStockQuery, [item.Cantidad, item.ID_Producto]);
            }

            // 3. Insertar en la tabla 'encuentro' (RF-C-004)
            // Nota: En Postgres no existe tabla ubicacion_entrega_pedido, sino encuentro según el schema original (migrate_002.js)
            // pero el create table de Ubicacion.js (hasActiveOrders) referencia 'ubicacion_entrega_pedido'.
            // Revisando 'database.sql' (reconstruido), la tabla es 'encuentro'.
            const encuentroQuery = `
                INSERT INTO encuentro ("ID_Pedido", "ID_Ubicacion", "Hora_Encuentro")
                VALUES ($1, $2, $3)
            `;
            await client.query(encuentroQuery, [newPedidoId, ID_Ubicacion_Entrega, Hora_Encuentro]);

            await client.query('COMMIT');
            return newPedidoId;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error en Order.create:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtiene los pedidos de un vendedor (RF-V-007).
     */
    static async findByVendor(idVendedor) {
        const query = `
            SELECT 
                p."ID_Pedido", 
                p."Fecha_Creacion", 
                p."Estado_Pedido", 
                p."Precio_Total",
                p."Metodo_Pago",
                p."PayPal_Transaction_ID",
                u."Nombre" AS "Nombre_Comprador",
                u."Email" AS "Email_Comprador"
            FROM pedido p
            JOIN usuario u ON p."ID_Comprador" = u."ID_Usuario"
            WHERE p."ID_Vendedor" = $1
            ORDER BY p."Fecha_Creacion" DESC
        `;
        try {
            const { rows } = await pool.query(query, [idVendedor]);
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
                p."ID_Pedido", 
                p."Fecha_Creacion", 
                p."Estado_Pedido", 
                p."Precio_Total",
                p."Metodo_Pago",
                p."PayPal_Transaction_ID",
                v."Nombre_Tienda" AS "Nombre_Vendedor"
            FROM pedido p
            JOIN vendedor v ON p."ID_Vendedor" = v."ID_Vendedor"
            WHERE p."ID_Comprador" = $1
            ORDER BY p."Fecha_Creacion" DESC
        `;
        try {
            const { rows } = await pool.query(query, [idComprador]);
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
                dp."ID_Producto",
                dp."Cantidad",
                dp."Precio_Unitario",
                prod."Nombre" AS "Nombre_Producto"
            FROM detalle_pedido dp
            JOIN producto prod ON dp."ID_Producto" = prod."ID_Producto"
            WHERE dp."ID_Pedido" = $1
        `;
        try {
            const { rows } = await pool.query(query, [idPedido]);
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
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Obtener el estado anterior
            const { rows: current } = await client.query('SELECT "Estado_Pedido" FROM pedido WHERE "ID_Pedido" = $1', [idPedido]);
            const oldStatus = current[0].Estado_Pedido;

            if (oldStatus === newStatus) {
                await client.query('ROLLBACK');
                return true; // No hay cambios
            }

            // 2. Actualizar el estado en la tabla 'pedido'
            const updateQuery = `UPDATE pedido SET "Estado_Pedido" = $1 WHERE "ID_Pedido" = $2`;
            await client.query(updateQuery, [newStatus, idPedido]);

            // 3. Registrar el cambio en la tabla 'historial_pedido' (RF-V-008)
            const historyQuery = `
                INSERT INTO historial_pedido ("ID_Pedido", "Estado_Anterior", "Estado_Nuevo", "Actor")
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(historyQuery, [idPedido, oldStatus, newStatus, actor]);

            // 4. (Opcional) Si el estado es 'Cancelado', restaurar el stock
            if (newStatus === 'Cancelado' && oldStatus !== 'Cancelado') {
                const details = await Order.findDetails(idPedido);
                for (const item of details) {
                    await client.query(
                        'UPDATE producto SET "Stock" = "Stock" + $1 WHERE "ID_Producto" = $2',
                        [item.Cantidad, item.ID_Producto]
                    );
                }
            }

            await client.query('COMMIT');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error en Order.updateStatus:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Busca un pedido por ID (para verificar propiedad).
     * @param {number} idPedido - ID_Pedido.
     * @returns {object|null} El pedido.
     */
    static async findById(idPedido) {
        const query = `SELECT * FROM pedido WHERE "ID_Pedido" = $1`;
        try {
            const { rows } = await pool.query(query, [idPedido]);
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Agrega una reseña al pedido (y potencialmente a los productos).
     * (RF-C-007)
     */
    static async addReview(idPedido, rating, comment) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Obtener productos del pedido
            const detalles = await Order.findDetails(idPedido);
            const orderData = await Order.findById(idPedido);
            const idComprador = orderData.ID_Comprador;

            // 2. Insertar reseña para cada producto (calificacion_producto)
            // Segun supabase_schema.sql la tabla es 'calificacion_producto'
            for (const item of detalles) {
                // Verificar si ya existe para evitar error de llave duplicada
                // Usamos ON CONFLICT DO UPDATE o ignoramos fallo si ya calificó
                const reviewQuery = `
                    INSERT INTO calificacion_producto ("ID_Producto", "ID_Usuario", "Puntuacion", "Comentario", "Fecha")
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT ("ID_Producto", "ID_Usuario") DO UPDATE 
                    SET "Puntuacion" = $3, "Comentario" = $4, "Fecha" = NOW()
                `;
                await client.query(reviewQuery, [item.ID_Producto, idComprador, rating, comment]);
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Validar QR (Nuevo método para Seller Dashboard)
    static async validateQR(orderId, tokenScan) {
        const query = `
            UPDATE pedido
            SET "Estado_Pedido" = 'Entregado'
            WHERE "ID_Pedido" = $1 AND "QR_Token" = $2 AND "Estado_Pedido" != 'Entregado'
        `;
        try {
            const result = await pool.query(query, [orderId, tokenScan]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error validating QR: ', error);
            throw error;
        }
    }
}

module.exports = Order;