const { pool } = require('./config/database');

async function inspect() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM calificacion');
        console.log('--- COLUMNAS CALIFICACION ---');
        columns.forEach(col => {
            console.log(`"${col.Field}"`);
        });
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

inspect();
