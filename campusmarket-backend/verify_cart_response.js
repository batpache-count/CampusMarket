const { pool } = require('./config/database');

async function checkCart() {
    try {
        const userId = 4; // User from previous step
        console.log(`Checking cart for user ${userId}...`);

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

        console.log('--- CART RESPONSE ---');
        console.log(JSON.stringify(rows));
        console.log('---------------------');

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkCart();
