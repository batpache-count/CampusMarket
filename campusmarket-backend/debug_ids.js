const { pool } = require('./config/database');

async function debugIds() {
    try {
        console.log('--- Checking IDs in Carrito ---');
        const [rows] = await pool.query('SELECT ID_Usuario FROM carrito');
        rows.forEach(r => {
            console.log(`User ID: ${r.ID_Usuario} (Type: ${typeof r.ID_Usuario})`);
        });

        console.log('\n--- Hardcoded Query Check ---');
        const [hardRows] = await pool.query('SELECT * FROM carrito WHERE ID_Usuario = 4');
        console.log(`Rows for User 4 (Hardcoded): ${hardRows.length}`);

        console.log('\n--- Param Query Check ---');
        const [paramRows] = await pool.query('SELECT * FROM carrito WHERE ID_Usuario = ?', [4]);
        console.log(`Rows for User 4 (Param): ${paramRows.length}`);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

debugIds();
