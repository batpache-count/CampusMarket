require('dotenv').config();
const { pool } = require('./config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando migración: Creando tabla de verificación de correo...');

        await client.query('BEGIN');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS public.email_verification (
                "Email" TEXT PRIMARY KEY,
                "Codigo" VARCHAR(6) NOT NULL,
                "Fecha_Creacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "Fecha_Expiracion" TIMESTAMP NOT NULL
            );
        `;
        await client.query(createTableQuery);
        console.log('  - Tabla "email_verification" creada.');

        await client.query('COMMIT');
        console.log('✅ Migración completada exitosamente.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error durante la migración:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
