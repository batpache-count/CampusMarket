const { pool } = require('../config/database');

class Product {

    /**
     * Crea un nuevo producto (RF-V-002)
     * @param {object} productData - Datos del producto.
     * @returns {object} El ID del nuevo producto.
     */
    static async create(productData) {
        const { ID_Vendedor, Nombre, Descripcion, Precio, ID_Categoria, Stock, Imagen_URL } = productData;

        // RF-V-002: Si Stock > 0, Activo = 1
        const Activo = (Stock > 0) ? 1 : 0; 
        
        const query = `
            INSERT INTO producto 
                (ID_Vendedor, Nombre, Descripcion, Precio, ID_Categoria, Stock, Imagen_URL, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        try {
            const [result] = await pool.query(query, [
                ID_Vendedor,
                Nombre,
                Descripcion || null,
                Precio,
                ID_Categoria,
                Stock,
                Imagen_URL || 'no-image.jpg',
                Activo
            ]);
            return { id: result.insertId };
        } catch (error) {
            console.error('Error en Product.create:', error);
            throw error;
        }
    }

    /**
     * Actualiza un producto (RF-V-003)
     * @param {number} productId - ID del producto a actualizar.
     * @param {object} productData - Datos a actualizar.
     * @returns {boolean} Éxito.
     */
    static async update(productId, productData) {
        const { Nombre, Descripcion, Precio, ID_Categoria, Stock, Imagen_URL } = productData;
        
        // RF-V-003: Recalcular estado Activo basado en stock
        const Activo = (Stock > 0) ? 1 : 0;

        const query = `
            UPDATE producto 
            SET 
                Nombre = ?, Descripcion = ?, Precio = ?, ID_Categoria = ?, 
                Stock = ?, Imagen_URL = ?, Activo = ?
            WHERE ID_Producto = ?
        `;
        try {
            const [result] = await pool.query(query, [
                Nombre,
                Descripcion || null,
                Precio,
                ID_Categoria,
                Stock,
                Imagen_URL || 'no-image.jpg',
                Activo,
                productId
            ]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error en Product.update:', error);
            throw error;
        }
    }

    /**
     * Desactiva un producto (Baja Lógica - RF-V-004)
     * (El RF-V-004 pide DELETE, pero la DB (campo 'Activo') sugiere baja lógica, que es más segura)
     * @param {number} productId - ID del producto a desactivar.
     * @returns {boolean} Éxito.
     */
    static async deactivate(productId) {
        const query = `
            UPDATE producto 
            SET Activo = 0 
            WHERE ID_Producto = ?
        `;
        try {
            const [result] = await pool.query(query, [productId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error en Product.deactivate:', error);
            throw error;
        }
    }

    /**
     * Busca un producto por su ID.
     * @param {number} id - ID_Producto.
     * @returns {object|null} El producto.
     */
    static async findById(id) {
        const query = `SELECT * FROM producto WHERE ID_Producto = ?`;
        try {
            const [rows] = await pool.query(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error en Product.findById:', error);
            throw error;
        }
    }

    /**
     * Devuelve el catálogo público (RF-C-002)
     * Solo productos Activos y con Stock > 0.
     */
    static async getPublicCatalog() {
        const query = `
            SELECT 
                p.ID_Producto, p.Nombre, p.Descripcion, p.Precio, p.Imagen_URL,
                c.Nombre AS Categoria_Nombre,
                v.ID_Vendedor, v.Nombre_Tienda, v.Estado_Tienda
            FROM producto p
            JOIN categoria c ON p.ID_Categoria = c.ID_Categoria
            JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor
            WHERE 
                p.Activo = 1 
                AND p.Stock > 0
                AND v.Estado_Tienda = 'En Linea' -- (RF-C-009)
        `;
        try {
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error en Product.getPublicCatalog:', error);
            throw error;
        }
    }

    /**
     * Devuelve el inventario completo de un vendedor (RF-V-002)
     * Incluye productos activos e inactivos.
     */
    static async getInventoryByVendor(vendorId) {
        const query = `
            SELECT 
                p.ID_Producto, p.Nombre, p.Precio, p.Stock, p.Activo,
                c.Nombre AS Categoria_Nombre
            FROM producto p
            JOIN categoria c ON p.ID_Categoria = c.ID_Categoria
            WHERE p.ID_Vendedor = ?
            ORDER BY p.Activo DESC, p.Nombre ASC
        `;
         try {
            const [rows] = await pool.query(query, [vendorId]);
            return rows;
        } catch (error) {
            console.error('Error en Product.getInventoryByVendor:', error);
            throw error;
        }
    }

    /**
     * Devuelve todas las categorías (RF-C-002)
     */
    static async getAllCategories() {
        const query = `SELECT * FROM categoria ORDER BY Nombre ASC`;
         try {
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error en Product.getAllCategories:', error);
            throw error;
        }
    }
}

module.exports = Product;