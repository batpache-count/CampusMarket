const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Testing connection to:', process.env.DATABASE_URL.split('@')[1]); // Hide creds
        const client = await pool.connect();
        console.log('✅ Connection established.');
        const res = await client.query('SELECT NOW()');
        console.log('✅ Query success:', res.rows[0]);
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Database Error:', err);
        process.exit(1);
    }
})();
