const { pool } = require('./config/database');

async function check() {
    try {
        console.log('--- VENDEDORES ---');
        const [vendors] = await pool.query('SELECT * FROM vendedor');
        console.log(vendors);

        console.log('\n--- PRODUCTOS CON VENDEDOR ---');
        const [products] = await pool.query(`
            SELECT 
                p.ID_Producto, 
                p.Nombre, 
                p.ID_Vendedor,
                v.Nombre_Tienda 
            FROM producto p 
            LEFT JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor 
            LIMIT 5
        `);
        console.log(products);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

check();
