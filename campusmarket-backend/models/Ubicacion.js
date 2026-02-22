const { pool } = require('../config/database');

/**
 * Modelo para gestionar el CRUD de Puntos de Entrega (RF-V-006)
 * Asociados a un Vendedor.
 */
class Ubicacion {

    /**
     * Crea un nuevo punto de entrega para un vendedor.
     * @param {number} idVendedor - El ID_Vendedor.
     * @param {object} data - { Nombre_Ubicacion, Descripcion, Dias_Disponibles, Hora_Inicio, Hora_Fin }
     */
    static async create(idVendedor, data) {
        const { Nombre_Ubicacion, Descripcion, Dias_Disponibles, Hora_Inicio, Hora_Fin } = data;
        const query = `
            INSERT INTO ubicacion_entrega 
            ("ID_Vendedor", "Nombre_Ubicacion", "Descripcion", "Dias_Disponibles", "Hora_Inicio", "Hora_Fin", "Activa")
            VALUES ($1, $2, $3, $4, $5, $6, TRUE) 
            RETURNING "ID_Ubicacion"
        `;
        try {
            const { rows } = await pool.query(query, [
                idVendedor,
                Nombre_Ubicacion,
                Descripcion || null,
                Dias_Disponibles || 'Lunes,Martes,Miércoles,Jueves,Viernes',
                Hora_Inicio || '09:00',
                Hora_Fin || '18:00'
            ]);
            return { id: rows[0].ID_Ubicacion };
        } catch (error) {
            console.error('Error en Ubicacion.create:', error);
            throw error;
        }
    }

    /**
     * Busca todas las ubicaciones (activas e inactivas) de un vendedor.
     */
    static async findByVendor(idVendedor) {
        const query = `
            SELECT "ID_Ubicacion", "Nombre_Ubicacion", "Descripcion", "Activa", "Dias_Disponibles", "Hora_Inicio", "Hora_Fin"
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
     * Actualiza una ubicación (Nombre, Descripcion, Estado, Horarios).
     */
    static async update(idUbicacion, data) {
        const { Nombre_Ubicacion, Descripcion, Activa, Dias_Disponibles, Hora_Inicio, Hora_Fin } = data;
        const query = `
            UPDATE ubicacion_entrega
            SET "Nombre_Ubicacion" = $1, 
                "Descripcion" = $2, 
                "Activa" = $3,
                "Dias_Disponibles" = $4,
                "Hora_Inicio" = $5,
                "Hora_Fin" = $6
            WHERE "ID_Ubicacion" = $7
        `;
        try {
            const result = await pool.query(query, [
                Nombre_Ubicacion,
                Descripcion || null,
                Activa,
                Dias_Disponibles,
                Hora_Inicio,
                Hora_Fin,
                idUbicacion
            ]);
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
