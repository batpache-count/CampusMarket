const { pool } = require('../config/database');

// Obtener carrito del usuario
exports.getCart = async (req, res) => {
    console.log('[GetCart] Request received for user:', req.user ? req.user.ID_Usuario : 'unknown');
    try {
        const userId = req.user.ID_Usuario;
        const [rows] = await pool.query(`
            SELECT 
                c.ID_Carrito,
                c.ID_Producto as id,
                c.Cantidad as quantity,
                p.Nombre as name,
                p.Precio as price,
                p.Imagen_URL as image,
                p.Stock,
                p.ID_Vendedor,
                v.Nombre_Tienda as seller
            FROM carrito c
            JOIN producto p ON c.ID_Producto = p.ID_Producto
            LEFT JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor
            WHERE c.ID_Usuario = ?
        `, [userId]);

        console.log(`[GetCart] User ${userId} retrieved ${rows.length} items`);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener el carrito' });
    }
};

// Agregar al carrito (y reservar stock)
exports.addToCart = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.ID_Usuario;
        const { productId, quantity = 1 } = req.body;

        console.log(`[AddToCart] User: ${userId}, Product: ${productId}, Qty: ${quantity}`);

        // 1. Verificar stock disponible
        const [productRows] = await connection.query(
            'SELECT Stock FROM producto WHERE ID_Producto = ? FOR UPDATE',
            [productId]
        );

        if (productRows.length === 0) {
            throw new Error('Producto no encontrado');
        }

        const stockDisponible = productRows[0].Stock;
        console.log(`[AddToCart] Stock disponible en DB: ${stockDisponible}`);

        if (stockDisponible < quantity) {
            console.log(`[AddToCart] Stock insuficiente. Requerido: ${quantity}, Disponible: ${stockDisponible}`);
            return res.status(400).json({ message: 'No hay suficiente stock disponible' });
        }

        // 2. Verificar si ya está en el carrito
        const [cartRows] = await connection.query(
            'SELECT Cantidad FROM carrito WHERE ID_Usuario = ? AND ID_Producto = ?',
            [userId, productId]
        );

        if (cartRows.length > 0) {
            // Actualizar cantidad
            await connection.query(
                'UPDATE carrito SET Cantidad = Cantidad + ? WHERE ID_Usuario = ? AND ID_Producto = ?',
                [quantity, userId, productId]
            );
        } else {
            // Insertar nuevo
            await connection.query(
                'INSERT INTO carrito (ID_Usuario, ID_Producto, Cantidad) VALUES (?, ?, ?)',
                [userId, productId, quantity]
            );
        }

        // 3. Restar stock (RESERVAR)
        await connection.query(
            'UPDATE producto SET Stock = Stock - ? WHERE ID_Producto = ?',
            [quantity, productId]
        );
        console.log(`[AddToCart] Stock restado. Nuevo stock: ${stockDisponible - quantity}`);

        await connection.commit();
        res.json({ message: 'Producto agregado y stock reservado' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message || 'Error al agregar al carrito' });
    } finally {
        connection.release();
    }
};

// Remover del carrito (y liberar stock)
exports.removeFromCart = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.ID_Usuario;
        const productId = req.params.id;

        // 1. Obtener cantidad en carrito
        const [cartRows] = await connection.query(
            'SELECT Cantidad FROM carrito WHERE ID_Usuario = ? AND ID_Producto = ?',
            [userId, productId]
        );

        if (cartRows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado en el carrito' });
        }

        const quantityToRestore = cartRows[0].Cantidad;

        // 2. Eliminar del carrito
        await connection.query(
            'DELETE FROM carrito WHERE ID_Usuario = ? AND ID_Producto = ?',
            [userId, productId]
        );

        // 3. Restaurar stock
        await connection.query(
            'UPDATE producto SET Stock = Stock + ? WHERE ID_Producto = ?',
            [quantityToRestore, productId]
        );

        await connection.commit();
        res.json({ message: 'Producto eliminado y stock restaurado' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar del carrito' });
    } finally {
        connection.release();
    }
};

// Disminuir cantidad (liberar 1 unidad de stock)
exports.decreaseQuantity = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.ID_Usuario;
        const productId = req.params.id;

        const [cartRows] = await connection.query(
            'SELECT Cantidad FROM carrito WHERE ID_Usuario = ? AND ID_Producto = ?',
            [userId, productId]
        );

        if (cartRows.length === 0) return res.status(404).json({ message: 'No encontrado' });

        const currentQty = cartRows[0].Cantidad;

        if (currentQty > 1) {
            // Disminuir en carrito
            await connection.query(
                'UPDATE carrito SET Cantidad = Cantidad - 1 WHERE ID_Usuario = ? AND ID_Producto = ?',
                [userId, productId]
            );
            // Aumentar stock
            await connection.query(
                'UPDATE producto SET Stock = Stock + 1 WHERE ID_Producto = ?',
                [productId]
            );
        } else {
            // Si es 1, eliminar y restaurar todo (reutilizar lógica o hacerlo aquí)
            await connection.query('DELETE FROM carrito WHERE ID_Usuario = ? AND ID_Producto = ?', [userId, productId]);
            await connection.query('UPDATE producto SET Stock = Stock + 1 WHERE ID_Producto = ?', [productId]);
        }

        await connection.commit();
        res.json({ message: 'Cantidad actualizada' });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Error' });
    } finally {
        connection.release();
    }
};

// Vaciar carrito (liberar todo el stock)
exports.clearCart = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.ID_Usuario;

        // Obtener todos los items para saber cuánto restaurar
        const [items] = await connection.query('SELECT ID_Producto, Cantidad FROM carrito WHERE ID_Usuario = ?', [userId]);

        for (const item of items) {
            await connection.query('UPDATE producto SET Stock = Stock + ? WHERE ID_Producto = ?', [item.Cantidad, item.ID_Producto]);
        }

        await connection.query('DELETE FROM carrito WHERE ID_Usuario = ?', [userId]);

        await connection.commit();
        res.json({ message: 'Carrito vaciado y stock restaurado' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Error al vaciar carrito' });
    } finally {
        connection.release();
    }
};

// Finalizar compra (vaciar carrito SIN restaurar stock)
exports.finalizeCart = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.ID_Usuario;

        // Solo eliminamos los items del carrito, el stock ya se restó al agregar
        await connection.query('DELETE FROM carrito WHERE ID_Usuario = ?', [userId]);

        await connection.commit();
        res.json({ message: 'Carrito finalizado' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Error al finalizar carrito' });
    } finally {
        connection.release();
    }
};
