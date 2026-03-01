const { pool } = require('./config/database');

const fs = require('fs');

async function check() {
    try {
        let output = '';
        output += '--- USUARIO ---\n';
        const userRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuario'");
        userRes.rows.forEach(c => output += `${c.column_name}: ${c.data_type}\n`);

        output += '\n--- VENDEDOR ---\n';
        const vendorRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vendedor'");
        vendorRes.rows.forEach(c => output += `${c.column_name}: ${c.data_type}\n`);

        fs.writeFileSync('db_schema.txt', output);
        console.log('Schema written to db_schema.txt');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
