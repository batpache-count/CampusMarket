const { pool } = require('../config/database');

/**
 * Modelo para gestionar productos (RF-V-002, 003, 004, 005)
 */
class Product {

    /**
     * Crea un nuevo producto (RF-V-002).
     * @param {number} idVendedor - ID_Vendedor.
     * @param {object} productData - { ID_Categoria, Nombre, Descripcion, Precio, Stock, Imagen_URL }
     * @returns {object} El ID del producto creado.
     */
    static async create(productData) {
        const { ID_Vendedor, ID_Categoria, Nombre, Descripcion, Precio, Stock, Imagen_URL } = productData;

        // RF-V-002: Si Stock > 0, Activo = 1 (true)
        const Activo = (Stock > 0);

        const query = `
            INSERT INTO producto ("ID_Vendedor", "ID_Categoria", "Nombre", "Descripcion", "Precio", "Stock", "Imagen_URL", "Activo")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING "ID_Producto"
        `;
        try {
            const { rows } = await pool.query(query, [
                ID_Vendedor,
                ID_Categoria,
                Nombre,
                Descripcion || null,
                Precio,
                Stock,
                Imagen_URL || 'no-image.jpg',
                Activo
            ]);
            return { id: rows[0].ID_Producto };
        } catch (error) {
            console.error('Error en Product.create:', error);
            throw error;
        }
    }

    /**
     * Actualiza un producto (RF-V-003).
     * @param {number} idProducto - ID_Producto.
     * @param {object} productData - Datos a actualizar.
     * @returns {boolean} Éxito.
     */
    static async update(idProducto, productData) {
        const { Nombre, Descripcion, Precio, ID_Categoria, Stock, Imagen_URL } = productData;

        // RF-V-003: Recalcular estado Activo basado en stock
        const Activo = (Stock > 0);

        const query = `
            UPDATE producto
            SET "Nombre" = $1, "Descripcion" = $2, "Precio" = $3, "ID_Categoria" = $4, "Stock" = $5, "Imagen_URL" = $6, "Activo" = $7
            WHERE "ID_Producto" = $8
        `;
        try {
            const result = await pool.query(query, [
                Nombre,
                Descripcion || null,
                Precio,
                ID_Categoria,
                Stock,
                Imagen_URL || 'no-image.jpg',
                Activo,
                idProducto
            ]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error en Product.update:', error);
            throw error;
        }
    }

    /**
     * Desactiva un producto (Baja Lógica - RF-V-004).
     * @param {number} idProducto - ID_Producto.
     * @returns {boolean} Éxito.
     */
    static async deactivate(idProducto) {
        const query = `UPDATE producto SET "Activo" = FALSE WHERE "ID_Producto" = $1`;
        try {
            const result = await pool.query(query, [idProducto]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error en Product.deactivate:', error);
            throw error;
        }
    }

    /**
     * Busca un producto por ID.
     * @param {number} idProducto - ID_Producto.
     * @returns {object|null} Detalles del producto.
     */
    static async findById(idProducto) {
        // En Postgres COALESCE reemplaza a IFNULL
        const query = `
            SELECT 
                p.*,
                v."Nombre_Tienda",
                v."ID_Usuario" as "ID_Usuario_Vendedor",
                c."Nombre" as "Nombre_Categoria",
                COALESCE(AVG(cal."Puntuacion"), 0) as "Promedio_Calificacion",
                COUNT(cal."ID_Calificacion") as "Total_Calificaciones"
            FROM producto p
            JOIN vendedor v ON p."ID_Vendedor" = v."ID_Vendedor"
            JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
            LEFT JOIN calificacion_producto cal ON p."ID_Producto" = cal."ID_Producto"
            WHERE p."ID_Producto" = $1
            GROUP BY p."ID_Producto", v."Nombre_Tienda", v."ID_Usuario", c."Nombre"
        `;
        try {
            const { rows } = await pool.query(query, [idProducto]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en Product.findById:', error);
            throw error;
        }
    }

    /**
     * Catálogo público con filtros y paginación (RF-C-002).
     */
    static async getPublicCatalog(filters) {
        // Si no hay filtros, filters puede ser undefined, así que lo inicializamos
        const { topic, search, minPrice, maxPrice, limit, offset, excludeSellerId } = filters || {};

        // Base query
        let sql = `
            SELECT 
                p."ID_Producto", p."Nombre", p."Precio", p."Imagen_URL", p."Stock", p."ID_Categoria",
                v."Nombre_Tienda",
                c."Nombre" as "Nombre_Categoria"
            FROM producto p
            JOIN vendedor v ON p."ID_Vendedor" = v."ID_Vendedor"
            JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
            WHERE p."Activo" = TRUE AND p."Stock" > 0 AND v."Estado_Tienda" = 'En Linea'
        `;

        const params = [];
        let paramIndex = 1;

        if (topic) {
            // Asumimos que "topic" es el ID de categoría o nombre.
            // El código original usaba ID_Categoria = ?.
            // Necesitamos saber qué viene en 'topic'. Si es numero es ID.
            if (!isNaN(topic)) {
                sql += ` AND p."ID_Categoria" = $${paramIndex++}`;
                params.push(topic);
            }
        }

        if (search) {
            sql += ` AND (p."Nombre" ILIKE $${paramIndex} OR p."Descripcion" ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (minPrice) {
            sql += ` AND p."Precio" >= $${paramIndex++}`;
            params.push(minPrice);
        }

        if (maxPrice) {
            sql += ` AND p."Precio" <= $${paramIndex++}`;
            params.push(maxPrice);
        }

        if (excludeSellerId) {
            sql += ` AND p."ID_Vendedor" != $${paramIndex++}`;
            params.push(excludeSellerId);
        }

        sql += ` ORDER BY p."Fecha_Creacion" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit || 20, offset || 0);

        try {
            const { rows } = await pool.query(sql, params);
            return rows;
        } catch (error) {
            console.error('Error en Product.getPublicCatalog:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los productos de un vendedor (Dashboard).
     * @param {number} idVendedor - ID_Vendedor.
     * @returns {Array} Lista de productos.
     */
    static async getInventoryByVendor(idVendedor) {
        const query = `
            SELECT "ID_Producto", "Nombre", "Precio", "Stock", "Imagen_URL", "Activo",
                c."Nombre" as "Categoria_Nombre"
            FROM producto p
            JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
            WHERE "ID_Vendedor" = $1
            ORDER BY "Fecha_Creacion" DESC
        `;
        try {
            const { rows } = await pool.query(query, [idVendedor]);
            return rows;
        } catch (error) {
            console.error('Error en Product.getInventoryByVendor:', error);
            throw error;
        }
    }

    static async getCategories() {
        try {
            const { rows } = await pool.query('SELECT * FROM categoria');
            return rows;
        } catch (error) {
            console.error('Error en Product.getCategories:', error);
            throw error;
        }
    }
}

module.exports = Product;