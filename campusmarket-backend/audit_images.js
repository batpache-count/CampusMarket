const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');

async function auditImages() {
    try {
        console.log('📂 Checking uploads directory:', uploadsDir);
        if (!fs.existsSync(uploadsDir)) {
            console.error('❌ Uploads directory does not exist!');
            return;
        }

        const files = fs.readdirSync(uploadsDir);
        console.log(`📂 Found ${files.length} files in uploads.`);

        const res = await pool.query('SELECT "ID_Producto", "Nombre", "Imagen_URL" FROM producto');
        const products = res.rows;

        console.log(`📊 Checking ${products.length} products...`);

        let missingCount = 0;
        let foundCount = 0;

        products.forEach(p => {
            if (!p.Imagen_URL) {
                console.log(`⚠️ Product ${p.ID_Producto} (${p.Nombre}) has NO image URL.`);
                return;
            }

            // Clean URL if it contains path
            const filename = path.basename(p.Imagen_URL);

            if (files.includes(filename)) {
                foundCount++;
            } else {
                missingCount++;
                console.log(`❌ MISSING: Product ${p.ID_Producto} (${p.Nombre}) expects '${filename}'`);
            }
        });

        console.log('--- Summary ---');
        console.log(`✅ Found: ${foundCount}`);
        console.log(`❌ Missing: ${missingCount}`);

    } catch (err) {
        console.error('❌ Error auditing images:', err);
    } finally {
        pool.end();
    }
}

auditImages();
