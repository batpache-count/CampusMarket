const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

const migrationSql = `
CREATE TABLE IF NOT EXISTS public.reporte (
  "ID_Reporte" SERIAL PRIMARY KEY,
  "ID_Pedido" INTEGER NOT NULL REFERENCES public.pedido("ID_Pedido") ON DELETE CASCADE,
  "ID_Emisor" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario"),
  "ID_Receptor" INTEGER NOT NULL REFERENCES public.usuario("ID_Usuario"),
  "Motivo" TEXT NOT NULL,
  "Detalles" TEXT,
  "Estado" TEXT DEFAULT 'Pendiente' CHECK ("Estado" IN ('Pendiente', 'En Revision', 'Resuelto', 'Rechazado')),
  "Fecha_Creacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_reporte_pedido ON public.reporte("ID_Pedido");
`;

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos para la migración de reportes.');

        await client.query(migrationSql);
        console.log('✅ Tabla "reporte" creada exitosamente.');

        await client.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración de reportes:', error);
        process.exit(1);
    }
}

runMigration();
