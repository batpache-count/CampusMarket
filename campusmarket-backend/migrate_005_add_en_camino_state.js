require('dotenv').config();
const { pool } = require('./config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando migración: Añadiendo estado "En camino" y garantizando consistencia...');

        await client.query('BEGIN');

        // 1. Eliminar los constraints antiguos relacionados con Estado_Pedido
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

        // 2. Añadir el constraint completo y definitivo
        const newConstraintQuery = `
            ALTER TABLE pedido
            ADD CONSTRAINT "pedido_estado_check"
            CHECK ("Estado_Pedido" IN ('Pendiente', 'Pagado', 'En preparacion', 'Listo', 'En camino', 'Entregado', 'Cancelado'))
        `;
        await client.query(newConstraintQuery);
        console.log('  - Nuevo constraint "pedido_estado_check" con todos los estados añadido.');

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
