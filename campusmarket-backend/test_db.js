require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDB() {
    console.log('Connectando a:', process.env.DB_NAME);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Consultando tabla usuario...');
        const [rows] = await connection.query('SELECT * FROM usuario LIMIT 1');
        console.log('Resultado:', rows);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

testDB();
