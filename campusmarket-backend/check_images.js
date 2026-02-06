const { pool } = require('./config/database');

async function checkImages() {
    try {
        console.log('Checking image URLs...');
        const [rows] = await pool.query('SELECT ID_Producto, Nombre, Imagen_URL FROM producto LIMIT 5');
        console.log(rows);
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit();
}

checkImages();
