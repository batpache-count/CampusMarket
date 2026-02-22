const { pool } = require('./config/database');

(async () => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT "Activo", COUNT(*) FROM producto GROUP BY "Activo"');
        console.log(JSON.stringify(res.rows, null, 2));
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
})();
