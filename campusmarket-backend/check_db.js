const { pool } = require('./config/database');

async function check() {
    try {
        const { rows } = await pool.query('SELECT "ID_Pedido", "Estado_Pedido", "Metodo_Pago", "PayPal_Transaction_ID", "QR_Token" FROM pedido WHERE "Metodo_Pago" ILIKE \'%paypal%\' ORDER BY "ID_Pedido" DESC LIMIT 5;');
        console.log('--- Últimos 5 Pedidos PayPal ---');
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
