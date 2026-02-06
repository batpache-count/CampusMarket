const { connectDB, pool } = require('./config/database');

async function checkColumn() {
    await connectDB();
    try {
        const [rows] = await pool.query(`SHOW COLUMNS FROM usuario LIKE 'Imagen_URL'`);
        if (rows.length > 0) {
            console.log("✅ Columna Imagen_URL EXISTE.");
            console.log(rows[0]);
        } else {
            console.log("❌ Columna Imagen_URL NO EXISTE.");
        }
    } catch (error) {
        console.error("Error verificando columna:", error);
    }
    process.exit();
}

checkColumn();
