const { pool } = require('./config/database');

async function diagnose() {
    try {
        console.log('--- USUARIOS ---');
        const [users] = await pool.query('SELECT ID_Usuario, Nombre, Email, Rol FROM usuario');
        console.log(users);

        console.log('\n--- VENDEDORES ---');
        const [vendors] = await pool.query('SELECT * FROM vendedor');
        console.log(vendors);

        console.log('\n--- RELACIÓN USUARIO-VENDEDOR ---');
        // Buscar usuarios con rol Vendedor que NO tengan entrada en la tabla vendedor
        const [orphans] = await pool.query(`
            SELECT u.ID_Usuario, u.Nombre, u.Rol 
            FROM usuario u 
            LEFT JOIN vendedor v ON u.ID_Usuario = v.ID_Usuario 
            WHERE u.Rol = 'Vendedor' AND v.ID_Vendedor IS NULL
        `);

        if (orphans.length > 0) {
            console.log('⚠️ ALERTA: Usuarios con rol Vendedor sin perfil de vendedor:', orphans);

            // Opcional: Crear perfil automáticamente
            for (const orphan of orphans) {
                console.log(`🛠️ Creando perfil para usuario ${orphan.Nombre} (ID: ${orphan.ID_Usuario})...`);
                await pool.query('INSERT INTO vendedor (ID_Usuario, Nombre_Tienda, Descripcion_Tienda) VALUES (?, ?, ?)',
                    [orphan.ID_Usuario, orphan.Nombre, 'Tienda generada automáticamente']);
                console.log('✅ Perfil creado.');
            }

        } else {
            console.log('✅ Todos los usuarios vendedores tienen perfil.');
        }

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

diagnose();
