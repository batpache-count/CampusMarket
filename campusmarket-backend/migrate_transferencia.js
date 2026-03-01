const { pool } = require('./config/database');

async function migrate() {
    console.log('--- Iniciando migración: Agregar columnas de transferencia a Vendedor ---');
    try {
        // 1. Agregar Numero_Tarjeta
        await pool.query(`
            ALTER TABLE vendedor 
            ADD COLUMN IF NOT EXISTS "Numero_Tarjeta" TEXT;
        `);
        console.log('Columna Numero_Tarjeta añadida.');

        // 2. Agregar Nombre_Banco
        await pool.query(`
            ALTER TABLE vendedor 
            ADD COLUMN IF NOT EXISTS "Nombre_Banco" TEXT;
        `);
        console.log('Columna Nombre_Banco añadida.');

        console.log('--- Migración completada con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
