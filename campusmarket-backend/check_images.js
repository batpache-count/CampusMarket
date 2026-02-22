const { pool } = require('./config/database');

async function checkImages() {
    try {
        const res = await pool.query(`
            SELECT "ID_Producto", "Nombre", "Imagen_URL" 
            FROM producto 
            LIMIT 5
        `);
        console.log('🖼️ Product Images in DB:', res.rows);
    } catch (err) {
        console.error('❌ Error checking images:', err);
    } finally {
        pool.end();
    }
}

checkImages();
