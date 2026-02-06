const { pool } = require('./config/database');

async function debugUser8() {
    try {
        const userId = 8;
        console.log(`--- Debugging User ${userId} ---`);

        // 1. Raw Items
        const [cartItems] = await pool.query('SELECT ID_Producto, ID_Carrito FROM carrito WHERE ID_Usuario = ?', [userId]);
        console.log(`Raw Cart Items: ${cartItems.length}`);

        for (const item of cartItems) {
            console.log(`> Checking Product ${item.ID_Producto}...`);
            const [prod] = await pool.query('SELECT ID_Producto, Nombre, ID_Vendedor FROM producto WHERE ID_Producto = ?', [item.ID_Producto]);
            if (prod.length === 0) {
                console.log('  [ERROR] Product does not exist!');
            } else {
                console.log(`  Product Found: ${prod[0].Nombre}, Vendor: ${prod[0].ID_Vendedor}`);
                const [vend] = await pool.query('SELECT * FROM vendedor WHERE ID_Vendedor = ?', [prod[0].ID_Vendedor]);
                if (vend.length === 0) {
                    console.log('  [WARN] Vendor does not exist!');
                } else {
                    console.log('  Vendor Exists.');
                }
            }
        }

        // 2. Full Query (mimic Controller)
        console.log('\n--- Controller Query Simulation ---');
        const [rows] = await pool.query(`
            SELECT 
                c.ID_Carrito,
                c.ID_Producto as id,
                p.Nombre as name
            FROM carrito c
            JOIN producto p ON c.ID_Producto = p.ID_Producto
            LEFT JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor
            WHERE c.ID_Usuario = ?
        `, [userId]);

        console.log(`Controller Query Return Count: ${rows.length}`);
        if (rows.length > 0) console.log(rows[0]);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

debugUser8();
