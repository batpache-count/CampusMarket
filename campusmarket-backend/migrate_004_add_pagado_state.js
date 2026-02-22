require('dotenv').config();
const { pool } = require('./config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando migración: Añadiendo estado "Pagado"...');

        await client.query('BEGIN');

        // 1. Eliminar el constraint antiguo (si existe) o simplemente añadir el nuevo permiso
        // En Postgres, para modificar una restricción CHECK, a veces es más limpio borrarla y recrearla
        // O si no tiene nombre específico, podemos buscarlo o simplemente intentar añadir el estado si fuera un ENUM.
        // Dado el schema original, el check es anónimo. Vamos a intentar recrearlo.

        // Primero buscamos el nombre del constraint
        const findConstraintQuery = `
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'pedido'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%Estado_Pedido%';
        `;
        const { rows } = await client.query(findConstraintQuery);

        if (rows.length > 0) {
            for (const row of rows) {
                await client.query(`ALTER TABLE pedido DROP CONSTRAINT "${row.conname}"`);
                console.log(`  - Constraint antiguo "${row.conname}" eliminado.`);
            }
        }

        // 2. Añadir el nuevo constraint con 'Pagado'
        const newConstraintQuery = `
            ALTER TABLE pedido
            ADD CONSTRAINT "pedido_estado_check"
            CHECK ("Estado_Pedido" IN ('Pendiente', 'Pagado', 'En preparacion', 'Listo', 'Entregado', 'Cancelado'))
        `;
        await client.query(newConstraintQuery);
        console.log('  - Nuevo constraint "pedido_estado_check" (con "Pagado") añadido.');

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
