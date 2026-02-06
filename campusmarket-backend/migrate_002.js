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
        console.log('--- Iniciando Migración Completa ---');

        // 1. Verificar y arreglar tabla 'pedido'
        console.log('Verificando tabla pedido...');
        const [columns] = await connection.query('SHOW COLUMNS FROM pedido');
        const columnNames = columns.map(c => c.Field.toLowerCase());

        console.log('Columnas actuales:', columnNames.join(', '));

        if (!columnNames.includes('qr_token')) {
            console.log('Añadiendo columna QR_Token...');
            await connection.query('ALTER TABLE pedido ADD COLUMN QR_Token VARCHAR(255) NULL');
        } else {
            console.log('Columna QR_Token ya existe.');
        }

        if (!columnNames.includes('metodo_pago')) {
            console.log('Añadiendo columna Metodo_Pago...');
            await connection.query("ALTER TABLE pedido ADD COLUMN Metodo_Pago VARCHAR(50) DEFAULT 'Efectivo'");
        }

        if (!columnNames.includes('paypal_transaction_id')) {
            console.log('Añadiendo columna PayPal_Transaction_ID...');
            await connection.query('ALTER TABLE pedido ADD COLUMN PayPal_Transaction_ID VARCHAR(255) NULL');
        }

        // 2. Crear tabla 'encuentro' si no existe
        console.log('Verificando tabla encuentro...');
        // Primero verificamos si existe ubicacion_entrega_pedido y si queremos reusarla
        const [tables] = await connection.query("SHOW TABLES LIKE 'encuentro'");
        if (tables.length === 0) {
            console.log('Creando tabla encuentro...');
            await connection.query(`
                CREATE TABLE encuentro (
                    ID_Encuentro INT AUTO_INCREMENT PRIMARY KEY,
                    ID_Pedido INT NOT NULL,
                    ID_Ubicacion INT NOT NULL,
                    Hora_Encuentro VARCHAR(50) NOT NULL,
                    FOREIGN KEY (ID_Pedido) REFERENCES pedido(ID_Pedido)
                )
            `);
        } else {
            console.log('Tabla encuentro ya existe.');
        }

        console.log('--- Migración completada exitosamente ---');
    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await connection.end();
    }
}

migrate();
