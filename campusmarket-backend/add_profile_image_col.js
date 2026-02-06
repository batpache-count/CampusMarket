const { pool } = require('./config/database');

const addProfileImageColumn = async () => {
    try {
        const query = `
            ALTER TABLE usuario
            ADD COLUMN Imagen_URL VARCHAR(255) NULL DEFAULT NULL AFTER Rol;
        `;
        await pool.query(query);
        console.log('✅ Columna Imagen_URL agregada exitosamente.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ La columna Imagen_URL ya existe.');
        } else {
            console.error('❌ Error al agregar columna:', error);
        }
    } finally {
        process.exit();
    }
};

addProfileImageColumn();
