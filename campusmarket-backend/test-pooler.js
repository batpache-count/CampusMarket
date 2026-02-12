require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const projectRef = 'qoyrceuhkxfeqyhkvpwe';
const password = process.env.DATABASE_URL.match(/:([^:@]+)@/)?.[1] || 'Red_hood595';

const configs = [
    {
        name: 'Pooler Session (5432) - User: postgres.ref',
        connectionString: `postgres://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
    },
    {
        name: 'Pooler Transaction (6543) - User: postgres.ref',
        connectionString: `postgres://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
    },
    {
        name: 'Direct IPv4 (if available) - User: postgres',
        connectionString: `postgres://postgres:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=project%3D${projectRef}&sslmode=require`
    }
];

async function test(config) {
    console.log(`\nTesting ${config.name}...`);
    const client = new Client({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });
    try {
        await client.connect();
        console.log(`✅ Connected!`);
        const res = await client.query('SELECT version()');
        console.log('Version:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error(`❌ Failed: ${err.message} (Code: ${err.code})`);
    }
}

(async () => {
    for (const config of configs) {
        await test(config);
    }
    process.exit(0);
})();
