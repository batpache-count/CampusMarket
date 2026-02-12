const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Red_hood595@54.177.55.191:5432/postgres';

const client = new Client({
    connectionString: connectionString,
});

console.log('Intentando conectar a:', connectionString);

client.connect()
    .then(() => {
        console.log('✅ ¡CONECTADO! El problema NO es la red.');
        return client.query('SELECT NOW()');
    })
    .then(res => {
        console.log('Hora en DB:', res.rows[0]);
        return client.end();
    })
    .catch(err => {
        console.error('❌ ERROR GRAVE DE CONEXIÓN:', err);
        console.error('Código:', err.code);
        console.error('Syscall:', err.syscall);
        console.error('Hostname:', err.hostname);
    });
