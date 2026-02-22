const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        await client.query('ALTER TABLE vendedor ADD COLUMN IF NOT EXISTS "PayPal_Email" TEXT');
        console.log('Column PayPal_Email added successfully');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
