const { pool } = require('./config/database');

(async () => {
    try {
        const client = await pool.connect();

        console.log('🔍 Searching for "Test Product With Image"...');
        const { rows } = await client.query(`SELECT * FROM producto WHERE "Nombre" ILIKE '%Test Product With Image%';`);

        if (rows.length > 0) {
            console.log(`✅ Found ${rows.length} product(s). Deleting...`);
            for (const prod of rows) {
                await client.query(`DELETE FROM producto WHERE "ID_Producto" = $1`, [prod.ID_Producto]);
                console.log(`🗑️ Deleted product ID: ${prod.ID_Producto}`);
            }
        } else {
            console.log('ℹ️ No test products found.');
        }

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
})();
