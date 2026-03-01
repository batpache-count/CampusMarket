const { pool } = require('./config/database');

async function migrate() {
    console.log('--- Iniciando migración: Agregar Toggles de Pago a Vendedor ---');
    try {
        await pool.query(`
            ALTER TABLE vendedor 
            ADD COLUMN IF NOT EXISTS "Transferencia_Activo" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "PayPal_Activo" BOOLEAN DEFAULT FALSE;
        `);
        console.log('Columnas Transferencia_Activo y PayPal_Activo añadidas.');

        console.log('--- Migración completada con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
