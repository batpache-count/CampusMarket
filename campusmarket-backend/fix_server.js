const fs = require('fs');
const path = './server.js';
let content = fs.readFileSync(path, 'utf8');

// Remove existing app.listen block
content = content.replace(/app\.listen\(PORT, '0\.0\.0\.0', \(\) => \{[\s\S]*?\}\);/, '');

// Add new one with heartbeat
content += `
// --- Forzado de persistencia ---
app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Servidor ACTIVO y PERSISTENTE en puerto 3000');
});

setInterval(() => {
    // Mantener loop de eventos ocupado
}, 60000);
`;

fs.writeFileSync(path, content);
console.log('Server.js actualizado con heartbeat.');
