const { pool } = require('./config/database');

async function migrate() {
    console.log('--- Iniciando migración: Agregar Nombre_Cuenta a Vendedor ---');
    try {
        await pool.query(`
            ALTER TABLE vendedor 
            ADD COLUMN IF NOT EXISTS "Nombre_Cuenta" TEXT;
        `);
        console.log('Columna Nombre_Cuenta añadida.');

        console.log('--- Migración completada con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
