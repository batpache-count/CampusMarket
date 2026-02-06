const { pool } = require('./config/database');

async function createNotificationTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS notificacion (
            ID_Notificacion INT AUTO_INCREMENT PRIMARY KEY,
            ID_Usuario INT NOT NULL,
            Tipo ENUM('VENTA', 'AGOTADO', 'STOCK_BAJO') NOT NULL,
            Mensaje TEXT NOT NULL,
            ID_Referencia INT,
            Leido BOOLEAN DEFAULT FALSE,
            Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario) ON DELETE CASCADE
        );
    `;

    try {
        await pool.query(query);
        console.log('Tabla "notificacion" creada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error al crear la tabla:', error);
        process.exit(1);
    }
}

createNotificationTable();
