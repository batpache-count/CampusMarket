require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function dumpSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        decimalNumbers: true
    });

    try {
        const [tables] = await connection.query('SHOW TABLES');
        let schemaSQL = `-- Generado automáticamente para CampusMarket\n\n`;
        schemaSQL += `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;\n`;
        schemaSQL += `USE \`${process.env.DB_NAME}\`;\n\n`;

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            try {
                console.log(`Procesando tabla: ${tableName}`);
                const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
                schemaSQL += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
                schemaSQL += createTable[0]['Create Table'] + ';\n\n';
            } catch (err) {
                console.error(`⚠️ Error al volcar tabla ${tableName}:`, err.message);
                schemaSQL += `-- Error al volcar tabla ${tableName}: ${err.message}\n\n`;
            }
        }

        fs.writeFileSync('database.sql', schemaSQL);
        console.log('✅ Esquema guardado en database.sql');
    } catch (error) {
        console.error('❌ Error al volcar el esquema:', error);
    } finally {
        await connection.end();
    }
}

dumpSchema();
