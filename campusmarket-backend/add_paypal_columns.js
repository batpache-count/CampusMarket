const { pool } = require('./config/database');

async function addColumns() {
    try {
        const connection = await pool.getConnection();
        console.log('Conectado a la base de datos.');

        // Add Metodo_Pago column
        try {
            await connection.query(`
                ALTER TABLE pedido
                ADD COLUMN Metodo_Pago VARCHAR(50) DEFAULT 'Efectivo',
                ADD COLUMN PayPal_Transaction_ID VARCHAR(255) NULL;
            `);
            console.log('Columnas Metodo_Pago y PayPal_Transaction_ID agregadas exitosamente.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Las columnas ya existen.');
            } else {
                throw err;
            }
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error al modificar la tabla:', error);
        process.exit(1);
    }
}

addColumns();
