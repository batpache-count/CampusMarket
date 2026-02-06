const { pool } = require('./config/database');

async function checkStatus() {
    try {
        console.log('Conectando a la BD...');
        // List Tables
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('\n--- TABLAS EN LA BASE DE DATOS ---');
        console.log(tableNames.join(', '));

        // Check specific recent additions
        const recentTables = ['notificacion', 'valoracion_producto', 'valoracion_vendedor'];
        const foundTables = tableNames.filter(t => recentTables.includes(t));
        console.log(`\nTablas recientes encontradas: ${foundTables.length}/${recentTables.length} (${foundTables.join(', ')})`);

        // Check Usuario columns for Profile Pic & PayPal
        console.log('\n--- COLUMNAS EN TABLA USUARIO ---');
        const [userCols] = await pool.query('SHOW COLUMNS FROM usuario');
        const userColNames = userCols.map(c => c.Field);
        console.log('Columnas:', userColNames.join(', '));

        const hasProfilePic = userColNames.some(c => c.toLowerCase().includes('foto') || c.toLowerCase().includes('perfil') || c.toLowerCase().includes('image'));
        const hasPaypal = userColNames.some(c => c.toLowerCase().includes('paypal'));

        console.log(`\n¿Tiene foto de perfil? ${hasProfilePic ? 'SÍ' : 'NO'}`);
        console.log(`¿Tiene PayPal? ${hasPaypal ? 'SÍ' : 'NO'}`);

    } catch (error) {
        console.error('Error verificando BD:', error.message);
    } finally {
        process.exit();
    }
}

checkStatus();
