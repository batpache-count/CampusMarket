const Product = require('../models/Product');
const User = require('../models/User');
const { pool } = require('../config/database');
const supabase = require('../config/supabaseClient');
const path = require('path');

// Helper para obtener ID Vendedor
const getVendorId = async (userId) => {
    const profile = await User.findVendorProfileByUserId(userId);
    return profile ? profile.ID_Vendedor : null;
};

/**
 * Helper para subir a Supabase
 */
const uploadToSupabase = async (file, prefix = 'product') => {
    const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

    const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

    return publicUrl;
};

/**
 * CREAR PRODUCTO
 */
exports.createProduct = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'La imagen es obligatoria.' });
        }

        const Imagen_URL = await uploadToSupabase(req.file);

        const Nombre = req.body.name || req.body.Nombre;
        const Descripcion = req.body.description || req.body.Descripcion;
        const Precio = req.body.price || req.body.Precio;
        const Stock = req.body.stock || req.body.Stock;
        const ID_Categoria = req.body.category || req.body.ID_Categoria;

        const vendorId = await getVendorId(req.user.ID_Usuario);
        if (!vendorId) return res.status(403).json({ message: 'No eres vendedor.' });

        const query = `
            INSERT INTO producto ("Nombre", "Descripcion", "Precio", "Stock", "ID_Categoria", "ID_Vendedor", "Imagen_URL", "Activo")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING "ID_Producto"
        `;

        const { rows } = await pool.query(query, [
            Nombre, Descripcion, Precio, Stock, ID_Categoria, vendorId, Imagen_URL, false
        ]);

        res.status(201).json({
            message: 'Producto creado exitosamente',
            productId: rows[0].ID_Producto,
            image: Imagen_URL
        });

    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ message: 'Error al subir imagen o guardar en BD.' });
    }
};

/**
 * OBTENER CATALOGO PÚBLICO (Con Promedio de Calificación)
 */
exports.getPublicCatalog = async (req, res) => {
    try {
        // Filtering: If the user is logged in, we might want to hide their own products
        let filterClause = 'p."Activo" = true';
        const params = [];

        if (req.user && req.user.ID_Usuario) {
            const vendorId = await getVendorId(req.user.ID_Usuario);
            if (vendorId) {
                filterClause += ' AND p."ID_Vendedor" != $1';
                params.push(vendorId);
            }
        }

        const query = `
            SELECT 
                p.*, 
                c."Nombre" AS "Categoria_Nombre",
                v."Nombre_Tienda",
                v."Descripcion_Tienda",
                v."Banner_URL",
                v."ID_Usuario" AS "ID_Usuario_Vendedor",
                v."Transferencia_Activo",
                v."PayPal_Activo",
                COALESCE(stats."Promedio", 0) AS "Promedio_Calificacion",
                COALESCE(stats."Votos", 0) AS "Total_Votos"
            FROM producto p
            LEFT JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
            LEFT JOIN vendedor v ON p."ID_Vendedor" = v."ID_Vendedor"
            LEFT JOIN (
                SELECT "ID_Producto", AVG("Puntuacion") as "Promedio", COUNT(*) as "Votos"
                FROM calificacion_producto
                GROUP BY "ID_Producto"
            ) stats ON p."ID_Producto" = stats."ID_Producto"
            WHERE ${filterClause}
            ORDER BY p."ID_Producto" DESC
        `;
        const { rows: catalog } = await pool.query(query, params);
        res.json(catalog);
    } catch (error) {
        console.error('Error en getPublicCatalog:', error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

/**
 * OBTENER MI INVENTARIO
 */
exports.getMyInventory = async (req, res) => {
    try {
        const vendorId = await getVendorId(req.user.ID_Usuario);
        if (!vendorId) return res.status(403).json({ message: 'Vendedor no encontrado.' });

        const query = `
            SELECT 
                p.*, 
                c."Nombre" AS "Categoria_Nombre" 
            FROM producto p
            LEFT JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
            WHERE p."ID_Vendedor" = $1
            ORDER BY p."ID_Producto" DESC
        `;
        const { rows: inventory } = await pool.query(query, [vendorId]);
        res.json(inventory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

/**
 * ACTUALIZAR PRODUCTO
 */
exports.updateProduct = async (req, res) => {
    const productId = req.params.id;
    try {
        const { rows: oldProductRows } = await pool.query('SELECT "Stock", "Nombre" FROM producto WHERE "ID_Producto" = $1', [productId]);
        const oldStock = oldProductRows[0]?.Stock || 0;

        const updateData = { ...req.body };
        const params = [];
        let setClause = [];
        let paramIndex = 1;

        if (updateData.Nombre) { setClause.push(`"Nombre" = $${paramIndex++}`); params.push(updateData.Nombre); }
        if (updateData.Descripcion) { setClause.push(`"Descripcion" = $${paramIndex++}`); params.push(updateData.Descripcion); }
        if (updateData.Precio) { setClause.push(`"Precio" = $${paramIndex++}`); params.push(updateData.Precio); }
        if (updateData.Stock) { setClause.push(`"Stock" = $${paramIndex++}`); params.push(updateData.Stock); }
        if (updateData.ID_Categoria) { setClause.push(`"ID_Categoria" = $${paramIndex++}`); params.push(updateData.ID_Categoria); }
        if (updateData.hasOwnProperty('Activo')) { setClause.push(`"Activo" = $${paramIndex++}`); params.push(updateData.Activo); }

        if (req.file) {
            const Imagen_URL = await uploadToSupabase(req.file);
            setClause.push(`"Imagen_URL" = $${paramIndex++}`);
            params.push(Imagen_URL);
            updateData.Imagen_URL = Imagen_URL;
        }

        if (setClause.length > 0) {
            params.push(productId);
            await pool.query(`UPDATE producto SET ${setClause.join(', ')} WHERE "ID_Producto" = $${paramIndex}`, params);
        }

        // --- LÓGICA DE INTEGRIDAD: RESETEAR RESEÑAS SI CAMBIA NOMBRE O DESCRIPCIÓN ---
        // Si el nombre o descripción cambió significativamente, eliminamos las reseñas anteriores
        // para evitar productos "engañosos" (ej. Torta -> Flan manteniendo 5 estrellas).
        if (updateData.Nombre || updateData.Descripcion) {
            const oldName = oldProductRows[0].Nombre;
            // Solo si el nombre es diferente (comparación simple)
            if (updateData.Nombre && updateData.Nombre !== oldName) {
                await pool.query('DELETE FROM calificacion_producto WHERE "ID_Producto" = $1', [productId]);
                console.log(`[ProductUpdate] Reseñas eliminadas para producto ${productId} debido a cambio de nombre.`);
            }
        }
        // -------------------------------------------------------------------------------

        // Lógica de Notificación de Re-stock
        const newStock = updateData.Stock || updateData.stock || 0;
        if (oldStock === 0 && newStock > 0) {
            const Notification = require('../models/Notification');
            const { rows: favoritedBy } = await pool.query('SELECT "ID_Usuario" FROM favoritos WHERE "ID_Producto" = $1', [productId]);

            for (const fav of favoritedBy) {
                await Notification.create({
                    ID_Usuario: fav.ID_Usuario,
                    Tipo: 'STOCK_ALERT',
                    Mensaje: `¡Buenas noticias! El producto "${oldProductRows[0].Nombre}" que tenías en favoritos vuelve a estar disponible.`,
                    ID_Referencia: productId
                });
            }
        }

        res.status(200).json({ message: 'Producto actualizado.' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ message: 'Error al actualizar.' });
    }
};

/**
 * BORRAR PRODUCTO
 */
exports.deleteProduct = async (req, res) => {
    const productId = req.params.id;
    try {
        await pool.query('DELETE FROM producto WHERE "ID_Producto" = $1', [productId]);
        res.json({ message: 'Producto eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar.' });
    }
};
exports.deactivateProduct = exports.deleteProduct;

/**
 * OBTENER CATEGORÍAS
 */
exports.getCategories = async (req, res) => {
    try {
        const { rows: cats } = await pool.query('SELECT * FROM categoria');
        res.json(cats);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar categorías' });
    }
};

/**
 * OBTENER DETALLE POR ID (Con Calificación)
 */
exports.getProductById = async (req, res) => {
    try {
        const userId = req.user ? req.user.ID_Usuario : null;

        const query = `
            SELECT 
                p.*,
                c."Nombre" AS "Categoria_Nombre",
                v."Nombre_Tienda",
                v."Descripcion_Tienda",
                v."Banner_URL",
                v."ID_Usuario" AS "ID_Usuario_Vendedor",
                v."Numero_Tarjeta",
                v."Nombre_Banco",
                v."Nombre_Cuenta",
                v."Transferencia_Activo",
                v."PayPal_Activo",
                COALESCE(stats."Promedio", 0) AS "Promedio_Calificacion",
                COALESCE(stats."Votos", 0) AS "Total_Votos"
            FROM producto p
            LEFT JOIN categoria c ON p."ID_Categoria" = c."ID_Categoria"
            LEFT JOIN vendedor v ON p."ID_Vendedor" = v."ID_Vendedor"
            LEFT JOIN (
                SELECT "ID_Producto", AVG("Puntuacion") as "Promedio", COUNT(*) as "Votos"
                FROM calificacion_producto
                GROUP BY "ID_Producto"
            ) stats ON p."ID_Producto" = stats."ID_Producto"
            WHERE p."ID_Producto" = $1
        `;
        const { rows } = await pool.query(query, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'No encontrado' });

        const product = rows[0];

        // Verificar si el usuario ya calificó
        let userRating = null;
        let isFavorite = false;
        if (userId) {
            const { rows: ratingRows } = await pool.query(
                'SELECT "Puntuacion" FROM calificacion_producto WHERE "ID_Producto" = $1 AND "ID_Usuario" = $2',
                [req.params.id, userId]
            );
            if (ratingRows.length > 0) userRating = ratingRows[0].Puntuacion;

            const { rows: favRows } = await pool.query(
                'SELECT "ID_Favorito" FROM favoritos WHERE "ID_Producto" = $1 AND "ID_Usuario" = $2',
                [req.params.id, userId]
            );
            isFavorite = favRows.length > 0;
        }

        res.json({ ...product, userRating, isFavorite });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error servidor' });
    }
};

/**
 * CALIFICAR PRODUCTO
 */
exports.rateProduct = async (req, res) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.ID_Usuario;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Puntuación inválida (1-5).' });
    }

    try {
        const query = `
            INSERT INTO calificacion_producto ("ID_Producto", "ID_Usuario", "Puntuacion", "Comentario")
            VALUES ($1, $2, $3, $4)
            ON CONFLICT ("ID_Producto", "ID_Usuario") DO UPDATE 
            SET "Puntuacion" = $3, "Comentario" = $4, "Fecha" = NOW()
        `;
        await pool.query(query, [productId, userId, rating, comment]);

        res.json({ message: 'Calificación guardada.' });
    } catch (error) {
        console.error('Error al calificar:', error);
        res.status(500).json({ message: 'Error al guardar calificación.' });
    }
};

/**
 * AGREGAR/QUITAR DE FAVORITOS
 */
exports.toggleFavorite = async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.ID_Usuario;

    try {
        const { rows: exists } = await pool.query(
            'SELECT "ID_Favorito" FROM favoritos WHERE "ID_Usuario" = $1 AND "ID_Producto" = $2',
            [userId, productId]
        );

        if (exists.length > 0) {
            await pool.query('DELETE FROM favoritos WHERE "ID_Usuario" = $1 AND "ID_Producto" = $2', [userId, productId]);
            return res.json({ message: 'Eliminado de favoritos', isFavorite: false });
        } else {
            await pool.query('INSERT INTO favoritos ("ID_Usuario", "ID_Producto") VALUES ($1, $2)', [userId, productId]);
            return res.json({ message: 'Agregado a favoritos', isFavorite: true });
        }
    } catch (error) {
        console.error('Error in toggleFavorite:', error);
        res.status(500).json({ message: 'Error al actualizar favoritos.' });
    }
};

/**
 * OBTENER MIS FAVORITOS
 */
exports.getFavorites = async (req, res) => {
    try {
        const query = `
            SELECT p.*, v."Nombre_Tienda"
            FROM favoritos f
            JOIN producto p ON f."ID_Producto" = p."ID_Producto"
            JOIN vendedor v ON p."ID_Vendedor" = v."ID_Vendedor"
            WHERE f."ID_Usuario" = $1
            ORDER BY f."Fecha_Agregado" DESC
        `;
        const { rows: favs } = await pool.query(query, [req.user.ID_Usuario]);
        res.json(favs);
    } catch (error) {
        console.error('Error in getFavorites:', error);
        res.status(500).json({ message: 'Error al obtener favoritos.' });
    }
};

/**
 * OBTENER RESEÑAS DE UN PRODUCTO
 */
exports.getProductReviews = async (req, res) => {
    try {
        const query = `
            SELECT r.*, u."Nombre", u."Apellido_Paterno"
            FROM calificacion_producto r
            JOIN usuario u ON r."ID_Usuario" = u."ID_Usuario"
            WHERE r."ID_Producto" = $1
            ORDER BY r."Fecha" DESC
        `;
        const { rows: reviews } = await pool.query(query, [req.params.productId]);
        res.json(reviews);
    } catch (error) {
        console.error('Error in getProductReviews:', error);
        res.status(500).json({ message: 'Error al obtener reseñas.' });
    }
};