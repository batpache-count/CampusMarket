const { pool } = require('./config/database');

(async () => {
    try {
        console.log('🔌 Connecting to DB...');
        const client = await pool.connect();

        console.log('🛠️ Adding "Activo" column to "producto" table...');
        await client.query(`
            ALTER TABLE producto 
            ADD COLUMN IF NOT EXISTS "Activo" BOOLEAN DEFAULT TRUE;
        `);

        console.log('✅ Column added successfully.');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding column:', err);
        process.exit(1);
    }
})();
