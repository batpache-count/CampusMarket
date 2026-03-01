const { pool } = require('./config/database');

const addBannerColumn = async () => {
    try {
        console.log('--- Iniciando migración: Agregar Banner_URL a vendedor ---');
        // Verificamos si la columna ya existe para evitar errores
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vendedor' AND column_name = 'Banner_URL'
        `;
        const { rowCount } = await pool.query(checkQuery);

        if (rowCount === 0) {
            const alterQuery = `
                ALTER TABLE vendedor
                ADD COLUMN "Banner_URL" TEXT DEFAULT NULL;
            `;
            await pool.query(alterQuery);
            console.log('✅ Columna Banner_URL agregada exitosamente a la tabla vendedor.');
        } else {
            console.log('⚠️ La columna Banner_URL ya existe en la tabla vendedor.');
        }
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        process.exit();
    }
};

addBannerColumn();
