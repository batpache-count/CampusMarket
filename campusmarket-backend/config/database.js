// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL no está definida en el archivo .env');
} else {
    console.log('🔌 Intentando conectar a:', connectionString.replace(/:[^:@]*@/, ':****@'));
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión exitosa a la base de datos (PostgreSQL/Supabase).');
        client.release();
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
        // No salimos del proceso para permitir que nodemon lo reintente o para ver el error completo
    }
};

module.exports = { pool, connectDB };