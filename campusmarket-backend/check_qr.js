const { pool } = require('./config/database');
pool.query('SELECT "ID_Pedido", "ID_Vendedor", "Metodo_Pago", "QR_Token", "Estado_Pedido" FROM pedido ORDER BY "ID_Pedido" DESC LIMIT 10')
    .then(r => {
        console.table(r.rows);
        process.exit();
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
