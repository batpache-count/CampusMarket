const { pool } = require('./config/database');

async function debug() {
    try {
        console.log('1. SELECT Nombre...');
        await pool.query('SELECT Nombre FROM producto LIMIT 1');
        console.log('✅ Nombre OK');

        console.log('2. SELECT ID_Producto...');
        await pool.query('SELECT ID_Producto FROM producto LIMIT 1');
        console.log('✅ ID_Producto OK');

        console.log('3. SELECT `ID_Producto` (backticks)...');
        await pool.query('SELECT `ID_Producto` FROM producto LIMIT 1');
        console.log('✅ Backticks OK');

        console.log('4. SELECT p.ID_Producto (alias)...');
        await pool.query('SELECT p.ID_Producto FROM producto p LIMIT 1');
        console.log('✅ Alias OK');

    } catch (error) {
        console.error('❌ FALLÓ:', error.sqlMessage || error);
    } finally {
        process.exit();
    }
}

debug();
