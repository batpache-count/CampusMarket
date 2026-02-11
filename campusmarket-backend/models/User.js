const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Modelo para crear un nuevo usuario en la DB.
 * El rol por defecto es 'Comprador' (RF-C-001).
 * La contraseña se hashea antes de guardarla.
 */
class User {

    /**
     * Crea un nuevo usuario.
     * @param {object} userData - Datos del usuario { Nombre, Apellido_Paterno, Apellido_Materno, Email, Contrasena, Telefono, Rol }
     * @returns {object} El ID del nuevo usuario insertado.
     */
    static async create(userData) {
        const { Nombre, Apellido_Paterno, Apellido_Materno, Email, Contrasena, Telefono, Rol } = userData;

        // Hashear la contraseña (RF-C-001)
        const hashedPassword = await bcrypt.hash(Contrasena, 10);

        const query = `
            INSERT INTO usuario ("Nombre", "Apellido_Paterno", "Apellido_Materno", "Email", "Contrasena", "Telefono", "Rol")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING "ID_Usuario"
        `;

        try {
            const { rows } = await pool.query(query, [
                Nombre,
                Apellido_Paterno,
                Apellido_Materno,
                Email,
                hashedPassword,
                Telefono || null,
                Rol || 'Comprador'
            ]);
            return { id: rows[0].ID_Usuario };
        } catch (error) {
            console.error('Error en User.create:', error);
            throw error;
        }
    }

    /**
     * Busca un usuario por su email.
     * Usado para verificar si un email ya existe (RF-C-001)
     * y para el proceso de login.
     * @param {string} email - Email del usuario.
     * @returns {object|null} Los datos del usuario si se encuentra.
     */
    static async findByEmail(email) {
        const query = `
            SELECT * FROM usuario 
            WHERE "Email" = $1
        `;
        try {
            const { rows } = await pool.query(query, [email]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en User.findByEmail:', error);
            throw error;
        }
    }

    /**
     * Busca un usuario por su ID.
     * Usado por el middleware 'protect' para verificar la sesión.
     * @param {number} id - ID_Usuario.
     * @returns {object|null} Los datos del usuario (sin contraseña).
     */
    static async findById(id) {
        const query = `
            SELECT "ID_Usuario", "Nombre", "Apellido_Paterno", "Email", "Telefono", "Rol", "Imagen_URL" 
            FROM usuario 
            WHERE "ID_Usuario" = $1
        `;
        try {
            const { rows } = await pool.query(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en User.findById:', error);
            throw error;
        }
    }

    /**
     * Busca el perfil de Vendedor asociado a un ID de Usuario.
     * @param {number} userId - ID_Usuario.
     * @returns {object|null} Los datos del vendedor.
     */
    static async findVendorProfileByUserId(userId) {
        const query = `
            SELECT * FROM vendedor 
            WHERE "ID_Usuario" = $1
        `;
        try {
            const { rows } = await pool.query(query, [userId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en User.findVendorProfile:', error);
            throw error;
        }
    }

    /**
     * Busca el usuario asociado a un ID de Vendedor.
     * @param {number} vendorId - ID_Vendedor.
     * @returns {object|null} El usuario (ID_Usuario).
     */
    static async findUserByVendorId(vendorId) {
        const query = `
            SELECT "ID_Usuario" FROM vendedor 
            WHERE "ID_Vendedor" = $1
        `;
        try {
            const { rows } = await pool.query(query, [vendorId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en User.findUserByVendorId:', error);
            throw error;
        }
    }

    /**
     * Transición de Comprador a Vendedor (RF-V-001)
     * Realiza una transacción para actualizar el rol e insertar el perfil.
     * @param {number} userId - ID_Usuario.
     * @param {object} storeData - { Nombre_Tienda, Descripcion_Tienda }
     * @returns {object} El perfil del nuevo vendedor.
     */
    static async becomeSeller(userId, storeData) {
        const { Nombre_Tienda, Descripcion_Tienda } = storeData;
        const client = await pool.connect(); // Iniciar transacción

        try {
            await client.query('BEGIN');

            // 1. Actualizar el rol del usuario
            const updateUserQuery = `
                UPDATE usuario 
                SET "Rol" = 'Vendedor' 
                WHERE "ID_Usuario" = $1
            `;
            await client.query(updateUserQuery, [userId]);

            // 2. Insertar el perfil en la tabla 'vendedor'
            const insertVendorQuery = `
                INSERT INTO vendedor ("ID_Usuario", "Nombre_Tienda", "Descripcion_Tienda")
                VALUES ($1, $2, $3)
                RETURNING "ID_Vendedor"
            `;
            const { rows } = await client.query(insertVendorQuery, [
                userId,
                Nombre_Tienda,
                Descripcion_Tienda || null
            ]);

            await client.query('COMMIT'); // Confirmar transacción

            return {
                ID_Vendedor: rows[0].ID_Vendedor,
                Nombre_Tienda: Nombre_Tienda
            };

        } catch (error) {
            await client.query('ROLLBACK'); // Revertir en caso de error
            console.error('Error en User.becomeSeller:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Actualiza el perfil de un Vendedor (RF-V-001, V-011, V-012)
     * @param {number} vendorId - ID_Vendedor.
     * @param {object} profileData - Datos a actualizar.
     * @returns {boolean} Éxito.
     */
    static async updateSellerProfile(vendorId, profileData) {
        const {
            Nombre_Tienda,
            Descripcion_Tienda,
            Estado_Tienda,
            Tiempo_Arrepentimiento_Min,
            Tiempo_Retraso_Comida_Min
        } = profileData;

        const query = `
            UPDATE vendedor 
            SET 
                "Nombre_Tienda" = $1,
                "Descripcion_Tienda" = $2,
                "Estado_Tienda" = $3,
                "Tiempo_Arrepentimiento_Min" = $4,
                "Tiempo_Retraso_Comida_Min" = $5
            WHERE "ID_Vendedor" = $6
        `;

        try {
            const result = await pool.query(query, [
                Nombre_Tienda,
                Descripcion_Tienda,
                Estado_Tienda,
                Tiempo_Arrepentimiento_Min,
                Tiempo_Retraso_Comida_Min,
                vendorId
            ]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error en User.updateSellerProfile:', error);
            throw error;
        }
    }
}

module.exports = User;