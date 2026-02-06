const { pool } = require('./config/database');

async function debugQuery() {
    try {
        const userId = 4;
        console.log(`Debug queries for User ${userId}`);

        // 1. Raw Cart
        const [cartRows] = await pool.query('SELECT * FROM carrito WHERE ID_Usuario = ?', [userId]);
        console.log('1. Raw Cart Rows:', cartRows.length);
        if (cartRows.length > 0) console.log(cartRows[0]);

        // 2. Join Product
        const [joinProd] = await pool.query(`
            SELECT c.*, p.Nombre 
            FROM carrito c 
            JOIN producto p ON c.ID_Producto = p.ID_Producto 
            WHERE c.ID_Usuario = ?`, [userId]);
        console.log('2. Join Product Rows:', joinProd.length);

        // 3. Join Product + Left Join Vendor
        const [fullQuery] = await pool.query(`
            SELECT c.*, p.Nombre, v.Nombre_Tienda
            FROM carrito c 
            JOIN producto p ON c.ID_Producto = p.ID_Producto 
            LEFT JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor 
            WHERE c.ID_Usuario = ?`, [userId]);
        console.log('3. Full Query Rows:', fullQuery.length);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

debugQuery();
