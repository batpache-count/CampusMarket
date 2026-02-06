const { pool } = require('./config/database');

async function createTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS calificacion_producto (
                ID_Calificacion INT AUTO_INCREMENT PRIMARY KEY,
                ID_Producto INT NOT NULL,
                ID_Usuario INT NOT NULL,
                Puntuacion INT NOT NULL CHECK (Puntuacion BETWEEN 1 AND 5),
                Comentario TEXT,
                Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ID_Producto) REFERENCES producto(ID_Producto) ON DELETE CASCADE,
                FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario) ON DELETE CASCADE,
                UNIQUE KEY unique_product_rating (ID_Producto, ID_Usuario)
            );
        `;
        await pool.query(query);
        console.log('✅ Tabla calificacion_producto creada exitosamente.');
    } catch (error) {
        console.error('Error al crear tabla:', error);
    } finally {
        process.exit();
    }
}

createTable();
