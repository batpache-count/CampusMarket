const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const migrationSql = `
-- 1. Agregar columnas para seguimiento de actualización y confirmación doble
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS "Fecha_Actualizacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS "Confirmacion_Vendedor" BOOLEAN DEFAULT FALSE;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS "Confirmacion_Comprador" BOOLEAN DEFAULT FALSE;

-- 2. Inicializar Fecha_Actualizacion con la fecha de creación para pedidos existentes
UPDATE pedido SET "Fecha_Actualizacion" = "Fecha_Creacion" WHERE "Fecha_Actualizacion" IS NULL;

-- 3. (Opcional) Asegurar que PayPal_Transaction_ID sea null si está vacío para evitar confusiones
UPDATE pedido SET "PayPal_Transaction_ID" = NULL WHERE "PayPal_Transaction_ID" = '';
`;

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos para la migración.');

        await client.query(migrationSql);
        console.log('✅ Columnas de confirmación y fecha de actualización añadidas.');

        await client.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

runMigration();
