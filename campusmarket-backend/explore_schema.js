const { pool, connectDB } = require('./config/database');

async function checkSchema() {
    await connectDB();
    try {
        const [rows] = await pool.query(`DESCRIBE usuario`);
        console.log('--- SCHEMA USUARIO ---');
        console.table(rows);
    } catch (error) {
        console.error(error);
    }
    process.exit();
}

checkSchema();
