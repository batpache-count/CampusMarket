require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

async function reset() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('🔌 Conectado a la base de datos para limpieza...');

        // 1. Limpiar todas las tablas (Orden de dependencias invertido)
        const tables = [
            'historial_pedido', 'calificacion_producto', 'calificacion', 'carrito', 'favoritos',
            'notificacion', 'encuentro', 'detalle_pedido', 'pedido', 'ubicacion_entrega',
            'producto', 'categoria', 'vendedor', 'usuario', 'reporte'
        ];

        for (const table of tables) {
            try {
                await client.query(`TRUNCATE TABLE public.${table} RESTART IDENTITY CASCADE`);
                console.log(`  - Tabla ${table} limpiada.`);
            } catch (e) {
                console.log(`  - No se pudo limpiar ${table} (ignorando).`);
            }
        }

        // 2. Re-insertar Categorias
        await client.query(`
            INSERT INTO public.categoria ("Nombre", "Descripcion") VALUES 
            ('Comida', 'Alimentos preparados y snacks'),
            ('Postres', 'Dulces, pasteles y galletas'),
            ('Bebidas', 'Jugos, refrescos y agua'),
            ('Papelería', 'Útiles escolares y material de oficina'),
            ('Ropa', 'Prendas de vestir y accesorios'),
            ('Tecnología', 'Gadgets, cables y accesorios electrónicos'),
            ('Otros', 'Artículos variados')
        `);
        console.log('✅ Categorías insertadas.');

        // 3. Insertar Usuarios Base
        const hashedPass = await bcrypt.hash('123456', 10);

        const userRes = await client.query(`
            INSERT INTO public.usuario ("Nombre", "Apellido_Paterno", "Apellido_Materno", "Email", "Contrasena", "Rol")
            VALUES 
            ('Jorge', 'Alberto', 'Test', 'jorge@gmail.com', $1, 'Comprador'),
            ('Daniela', 'Vendedora', 'Test', 'daniela@gmail.com', $1, 'Vendedor')
            RETURNING "ID_Usuario", "Email"
        `, [hashedPass]);

        const sellerUser = userRes.rows.find(u => u.Email === 'daniela@gmail.com');
        console.log('✅ Usuarios base creados (jorge@gmail.com / daniela@gmail.com)');

        // 4. Crear Perfil de Vendedor
        const vendorRes = await client.query(`
            INSERT INTO public.vendedor ("ID_Usuario", "Nombre_Tienda", "Descripcion_Tienda", "PayPal_Email")
            VALUES ($1, $2, $3, $4)
            RETURNING "ID_Vendedor"
        `, [sellerUser.ID_Usuario, 'La Tienda de Daniela', 'Productos frescos del campus', 'sb-facilitator@pixelperfect.com']);
        const vendorId = vendorRes.rows[0].ID_Vendedor;
        console.log('✅ Perfil de vendedor creado.');

        // 5. Insertar Productos
        await client.query(`
            INSERT INTO public.producto ("ID_Vendedor", "ID_Categoria", "Nombre", "Descripcion", "Precio", "Stock", "Imagen_URL")
            VALUES 
            ($1, 1, 'Tacos de Pastor', '3 deliciosos tacos con piña', 45.00, 20, 'no-image.jpg'),
            ($1, 3, 'Coca Cola 600ml', 'Fría y refrescante', 18.00, 50, 'no-image.jpg'),
            ($1, 2, 'Brownie Triple Chocolate', 'Hecho en casa', 25.00, 15, 'no-image.jpg')
        `, [vendorId]);
        console.log('✅ Productos insertados.');

        // 6. Insertar Ubicaciones
        await client.query(`
            INSERT INTO public.ubicacion_entrega ("ID_Vendedor", "Nombre_Ubicacion", "Descripcion")
            VALUES 
            ($1, 'Biblioteca Central', 'Puerta principal'),
            ($1, 'Estacionamiento 1', 'Cerca de la banqueta')
        `, [vendorId]);
        console.log('✅ Ubicaciones insertadas.');

        console.log('\n🌟 ¡Base de datos reiniciada con éxito! 🌟');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fatal al reiniciar la base de datos:', err);
        process.exit(1);
    }
}

reset();
