const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function verifyImages() {
    try {
        const { rows } = await pool.query('SELECT \"ID_Producto\", \"Nombre\", \"Imagen_URL\" FROM producto');
        console.log(`Checking ${rows.length} products...`);
        let missingCount = 0;
        rows.forEach(r => {
            if (!r.Imagen_URL) {
                console.log(`[ID ${r.ID_Producto}] No image URL defined for: ${r.Nombre}`);
                missingCount++;
                return;
            }
            const filePath = path.join(__dirname, 'uploads', r.Imagen_URL);
            if (!fs.existsSync(filePath)) {
                console.log(`[ID ${r.ID_Producto}] MISSING FILE: ${r.Imagen_URL} (${r.Nombre})`);
                missingCount++;
            }
        });
        console.log(`Verification complete. Missing: ${missingCount}`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

verifyImages();
