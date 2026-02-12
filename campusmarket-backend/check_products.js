const { pool } = require('./config/database');
require('dotenv').config();

async function checkProducts() {
    try {
        const { rows } = await pool.query('SELECT * FROM producto ORDER BY "ID_Producto" DESC LIMIT 5');
        console.log('--- RECENT PRODUCTS ---');
        rows.forEach(r => {
            console.log(`ID: ${r.ID_Producto}, Name: ${r.Nombre}, Image: ${r.Imagen_URL}`);
            console.log('Raw Keys:', Object.keys(r));
        });
        process.exit(0);
    } catch (err) {
        console.error('Error querying DB:', err);
        process.exit(1);
    }
}

checkProducts();
