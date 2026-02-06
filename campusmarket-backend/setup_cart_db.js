const { pool } = require('./config/database');

async function setupCart() {
    try {
        console.log('Creating carrito table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS carrito (
                ID_Carrito INT AUTO_INCREMENT PRIMARY KEY,
                ID_Usuario INT NOT NULL,
                ID_Producto INT NOT NULL,
                Cantidad INT NOT NULL DEFAULT 1,
                Fecha_Agregado DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario) ON DELETE CASCADE,
                FOREIGN KEY (ID_Producto) REFERENCES producto(ID_Producto) ON DELETE CASCADE,
                UNIQUE KEY unique_item (ID_Usuario, ID_Producto)
            )
        `);

        console.log('Table carrito created successfully.');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        process.exit();
    }
}

setupCart();
