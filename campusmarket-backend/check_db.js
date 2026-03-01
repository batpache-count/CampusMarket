const { pool } = require('./config/database');

async function check() {
    try {
        const res = await pool.query('SELECT * FROM categoria');
        console.log('Categories:', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
