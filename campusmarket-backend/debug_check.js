const { pool } = require('./config/database');

async function checkDebug() {
    try {
        const [products] = await pool.query('SELECT ID_Producto, Nombre, Stock FROM producto');
        console.log(JSON.stringify(products, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkDebug();
