const { pool } = require('./config/database');

async function checkTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📊 Tables in DB:', res.rows.map(r => r.table_name));

        // Also check columns for 'usuario' if it exists
        const userTable = res.rows.find(r => r.table_name === 'usuario' || r.table_name === 'Usuario');
        if (userTable) {
            const cols = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${userTable.table_name}'
            `);
            console.log(`📋 Columns in '${userTable.table_name}':`, cols.rows.map(c => `${c.column_name} (${c.data_type})`));
        } else {
            console.log('❌ Table "usuario" NOT found!');
        }
    } catch (err) {
        console.error('❌ Error checking DB:', err);
    } finally {
        pool.end();
    }
}

checkTables();
