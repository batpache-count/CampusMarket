const { pool } = require('../config/database');

/**
 * Modelo para gestionar el CRUD de Puntos de Entrega (RF-V-006)
 * Asociados a un Vendedor.
 */
class Ubicacion {

    /**
     * Crea un nuevo punto de entrega para un vendedor.
     * @param {number} idVendedor - El ID_Vendedor (de la tabla 'vendedor').
     * @param {object} data - { Nombre_Ubicacion, Descripcion }
     * @returns {object} El ID de la nueva ubicación.
     */
    static async create(idVendedor, data) {
        const { Nombre_Ubicacion, Descripcion } = data;
        const query = `
            INSERT INTO ubicacion_entrega ("ID_Vendedor", "Nombre_Ubicacion", "Descripcion", "Activa")
            VALUES ($1, $2, $3, TRUE) 
            RETURNING "ID_Ubicacion"
        `;
        try {
            const { rows } = await pool.query(query, [idVendedor, Nombre_Ubicacion, Descripcion || null]);
            return { id: rows[0].ID_Ubicacion };
        } catch (error) {
            console.error('Error en Ubicacion.create:', error);
            throw error;
        }
    }

    /**
     * Busca todas las ubicaciones (activas e inactivas) de un vendedor.
     * @param {number} idVendedor - El ID_Vendedor.
     * @returns {Array} Lista de ubicaciones.
     */
    static async findByVendor(idVendedor) {
        const query = `
            SELECT "ID_Ubicacion", "Nombre_Ubicacion", "Descripcion", "Activa"
            FROM ubicacion_entrega
            WHERE "ID_Vendedor" = $1
            ORDER BY "Activa" DESC, "Nombre_Ubicacion" ASC
        `;
        try {
            const { rows } = await pool.query(query, [idVendedor]);
            return rows;
        } catch (error) {
            console.error('Error en Ubicacion.findByVendor:', error);
            throw error;
        }
    }

    /**
     * Busca una ubicación específica por su ID.
     * @param {number} idUbicacion - El ID_Ubicacion.
     * @returns {object|null} La ubicación.
     */
    static async findById(idUbicacion) {
        const query = `SELECT * FROM ubicacion_entrega WHERE "ID_Ubicacion" = $1`;
        try {
            const { rows } = await pool.query(query, [idUbicacion]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en Ubicacion.findById:', error);
            throw error;
        }
    }

    /**
     * Actualiza una ubicación (Nombre, Descripcion, Estado).
     * @param {number} idUbicacion - El ID_Ubicacion.
     * @param {object} data - { Nombre_Ubicacion, Descripcion, Activa }
     * @returns {boolean} Éxito.
     */
    static async update(idUbicacion, data) {
        const { Nombre_Ubicacion, Descripcion, Activa } = data;
        const query = `
            UPDATE ubicacion_entrega
            SET "Nombre_Ubicacion" = $1, "Descripcion" = $2, "Activa" = $3
            WHERE "ID_Ubicacion" = $4
        `;
        try {
            const result = await pool.query(query, [Nombre_Ubicacion, Descripcion || null, Activa, idUbicacion]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error en Ubicacion.update:', error);
            throw error;
        }
    }

    /**
     * Verifica si una ubicación tiene pedidos activos asociados (RF-V-006).
     * @param {number} idUbicacion - El ID_Ubicacion.
     * @returns {boolean} True si tiene pedidos activos, False si no.
     */
    static async hasActiveOrders(idUbicacion) {
        const query = `
            SELECT 1 
            FROM encuentro e
            JOIN pedido p ON e."ID_Pedido" = p."ID_Pedido"
            WHERE e."ID_Ubicacion" = $1
            AND p."Estado_Pedido" IN ('Pendiente', 'En preparacion', 'Listo')
            LIMIT 1
        `;
        try {
            const { rows } = await pool.query(query, [idUbicacion]);
            return rows.length > 0;
        } catch (error) {
            console.error('Error en Ubicacion.hasActiveOrders:', error);
            throw error;
        }
    }

    /**
     * Elimina una ubicación (RF-V-006).
     * @param {number} idUbicacion - El ID_Ubicacion.
     * @returns {boolean} Éxito.
     */
    static async delete(idUbicacion) {
        const query = `DELETE FROM ubicacion_entrega WHERE "ID_Ubicacion" = $1`;
        try {
            const result = await pool.query(query, [idUbicacion]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error en Ubicacion.delete:', error);
            throw error;
        }
    }
}

module.exports = Ubicacion;
