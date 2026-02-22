const { pool } = require('./config/database');

(async () => {
    try {
        console.log('🔌 Testing DB Connection...');
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ Database Connected!', res.rows[0]);
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Database Connection Failed:', err);
        process.exit(1);
    }
})();
