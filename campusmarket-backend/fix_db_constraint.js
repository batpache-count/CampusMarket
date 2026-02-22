const { pool } = require('./config/database');

async function fixConstraint() {
    const client = await pool.connect();
    try {
        console.log('Iniciando actualización de restricción de base de datos...');

        // 1. Intentar identificar el nombre de la restricción si no es el estándar
        // El error decía "pedido_estado_check", así que usaremos ese.
        const constraintName = 'pedido_estado_check';

        console.log(`Eliminando restricción antigua: ${constraintName}`);
        await client.query(`ALTER TABLE pedido DROP CONSTRAINT IF EXISTS "${constraintName}"`);

        console.log('Añadiendo nueva restricción con estados: Pendiente, En preparacion, Listo, Entregado, Cancelado, Autorizado, Pagado, En camino');
        await client.query(`
            ALTER TABLE pedido 
            ADD CONSTRAINT "${constraintName}" 
            CHECK ("Estado_Pedido" IN ('Pendiente', 'En preparacion', 'Listo', 'Entregado', 'Cancelado', 'Autorizado', 'Pagado', 'En camino'))
        `);

        console.log('✅ Restricción actualizada con éxito.');

    } catch (error) {
        console.error('❌ Error al actualizar la restricción:', error);
    } finally {
        client.release();
        process.exit();
    }
}

fixConstraint();
