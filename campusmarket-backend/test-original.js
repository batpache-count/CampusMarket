require('dotenv').config();
const { Client } = require('pg');

const originalString = 'postgresql://postgres:Red_hood595@db.qoyrceuhkxfeqyhkvpwe.supabase.co:5432/postgres';
// IPv6 literal from previous nslookup (2600:1f18:2b2d:c67fb:6972:6a33:3b)
const ipv6String = 'postgresql://postgres:Red_hood595@[2600:1f18:2b2d:c67fb:6972:6a33:3b]:5432/postgres';

async function test(name, connString) {
    console.log(`\nTesting ${name}...`);
    const client = new Client({
        connectionString: connString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });
    try {
        await client.connect();
        console.log(`✅ ${name}: Connected!`);
        await client.end();
    } catch (err) {
        console.error(`❌ ${name}: Failed - ${err.message}`);
    }
}

(async () => {
    await test('Original Hostname', originalString);
    await test('IPv6 Literal', ipv6String);
    process.exit(0);
})();
