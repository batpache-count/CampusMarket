const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('--- Running Migration 003: Favorites & Notifications ---');

    // 1. Create favoritos table
    await conn.query(`
        CREATE TABLE IF NOT EXISTS favoritos (
            ID_Favorito INT AUTO_INCREMENT PRIMARY KEY,
            ID_Usuario INT NOT NULL,
            ID_Producto INT NOT NULL,
            Fecha_Agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario) ON DELETE CASCADE,
            FOREIGN KEY (ID_Producto) REFERENCES producto(ID_Producto) ON DELETE CASCADE,
            UNIQUE KEY unique_fav (ID_Usuario, ID_Producto)
        )
    `);
    console.log('✅ Table favoritos created/verified.');

    // 2. Ensure notificacion table exists (it should, but just in case)
    await conn.query(`
        CREATE TABLE IF NOT EXISTS notificacion (
            ID_Notificacion INT AUTO_INCREMENT PRIMARY KEY,
            ID_Usuario INT NOT NULL,
            Tipo VARCHAR(50) NOT NULL,
            Mensaje TEXT NOT NULL,
            Leido BOOLEAN DEFAULT FALSE,
            ID_Referencia INT,
            Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario) ON DELETE CASCADE
        )
    `);
    console.log('✅ Table notificacion created/verified.');

    // 3. Ensure calificacion_producto has Comentario column
    const [cols] = await conn.query('DESCRIBE calificacion_producto');
    if (!cols.some(c => c.Field === 'Comentario')) {
        await conn.query('ALTER TABLE calificacion_producto ADD COLUMN Comentario TEXT');
        console.log('✅ Column Comentario added to calificacion_producto.');
    } else {
        console.log('ℹ️ Column Comentario already exists in calificacion_producto.');
    }

    await conn.end();
    console.log('--- Migration 003 Finished ---');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
