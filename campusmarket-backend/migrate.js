require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

console.log('🔌 Connecting to:', connectionString.replace(/:[^:@]*@/, ':****@'));

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        await client.connect();
        console.log('✅ Connected to database.');

        const schemaPath = path.join(__dirname, 'supabase_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📜 Running migration...');
        await client.query(schemaSql);

        console.log('✅ Migration completed successfully!');
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
})();
