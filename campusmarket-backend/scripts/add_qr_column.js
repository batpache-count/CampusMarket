const { pool, connectDB } = require('../config/database');

async function addQrColumn() {
    try {
        await connectDB();
        const connection = await pool.getConnection();
        console.log('🔌 Conectado a la BD via pool.');

        try {
            // Verificar si la columna ya existe
            const [columns] = await connection.query(`SHOW COLUMNS FROM pedido LIKE 'QR_Token'`);

            if (columns.length > 0) {
                console.log('ℹ️ La columna QR_Token YA EXISTE. No se requieren cambios.');
            } else {
                console.log('🚧 La columna QR_Token NO existe. Agregándola...');
                await connection.query(`ALTER TABLE pedido ADD COLUMN QR_Token VARCHAR(255) NULL AFTER Estado_Pedido`);
                console.log('✅ Columna QR_Token agregada exitosamente.');
            }

        } catch (err) {
            console.error('❌ Error verificando/modificando la tabla:', err);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
    } finally {
        process.exit();
    }
}

addQrColumn();
