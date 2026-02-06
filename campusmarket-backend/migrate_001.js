const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Verificando columnas en tabla pedido...');

        const [columns] = await connection.query('SHOW COLUMNS FROM pedido');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('QR_Token')) {
            console.log('Añadiendo columna QR_Token...');
            await connection.query('ALTER TABLE pedido ADD COLUMN QR_Token VARCHAR(255) NULL');
        }

        if (!columnNames.includes('Metodo_Pago')) {
            console.log('Añadiendo columna Metodo_Pago...');
            await connection.query("ALTER TABLE pedido ADD COLUMN Metodo_Pago VARCHAR(50) DEFAULT 'Efectivo'");
        }

        if (!columnNames.includes('PayPal_Transaction_ID')) {
            console.log('Añadiendo columna PayPal_Transaction_ID...');
            await connection.query('ALTER TABLE pedido ADD COLUMN PayPal_Transaction_ID VARCHAR(255) NULL');
        }

        console.log('Migración completada exitosamente.');
    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await connection.end();
    }
}

migrate();
