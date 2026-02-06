const { pool } = require('./config/database');

async function debug() {
    try {
        console.log('1. Probando SELECT simple de producto...');
        await pool.query('SELECT ID_Producto FROM producto LIMIT 1');
        console.log('✅ OK');

        console.log('2. Probando JOIN con categoria...');
        await pool.query('SELECT p.ID_Producto, c.Nombre FROM producto p LEFT JOIN categoria c ON p.ID_Categoria = c.ID_Categoria LIMIT 1');
        console.log('✅ OK');

        console.log('3. Probando JOIN con vendedor...');
        await pool.query('SELECT p.ID_Producto, v.Nombre_Tienda FROM producto p LEFT JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor LIMIT 1');
        console.log('✅ OK');

        console.log('4. Probando Subquery de calificacion...');
        await pool.query('SELECT ID_Producto, AVG(Puntuacion) FROM calificacion GROUP BY ID_Producto LIMIT 1');
        console.log('✅ OK');

        console.log('5. Probando Query Completa (sin p.*)...');
        const query = `
            SELECT 
                p.ID_Producto, 
                c.Nombre AS Categoria_Nombre,
                v.Nombre_Tienda,
                COALESCE(stats.Promedio, 0) AS Promedio_Calificacion
            FROM producto p
            LEFT JOIN categoria c ON p.ID_Categoria = c.ID_Categoria
            LEFT JOIN vendedor v ON p.ID_Vendedor = v.ID_Vendedor
            LEFT JOIN (
                SELECT ID_Producto, AVG(Puntuacion) as Promedio, COUNT(*) as Votos
                FROM calificacion
                GROUP BY ID_Producto
            ) stats ON p.ID_Producto = stats.ID_Producto
            ORDER BY p.ID_Producto DESC
        `;
        await pool.query(query);
        console.log('✅ Query Completa OK');

    } catch (error) {
        console.error('❌ FALLÓ:', error.sqlMessage || error);
    } finally {
        process.exit();
    }
}

debug();
