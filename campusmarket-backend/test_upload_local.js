const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function runTest() {
    try {
        console.log('1. Autenticando...');
        // Login con un usuario que sepamos que existe (o crear uno al vuelo si fuera necesario, pero usaremos hardcoded por brevedad si es posible, o el del dev)
        // Asumimos usuario 'admin@admin.com' / '123456' o similar, pero mejor usamos uno que el usuario haya usado. 
        // Vemos que hay archivos 'debug_user8.js', usaremos credenciales típicas o pedimos al usuario. 
        // Mejor: Usamos un usuario que acabamos de ver en los logs o uno genérico.
        // Voy a intentar registrar uno nuevo para asegurar que existe.

        const email = 'test_upload_' + Date.now() + '@test.com';
        const password = 'password123';

        let token;

        try {
            const regRes = await axios.post('http://localhost:3000/api/auth/register', {
                Nombre: 'Test',
                Apellido_Paterno: 'User',
                Email: email,
                Contrasena: password,
                Telefono: '5555555555',
                Rol: 'Cliente' // Asegurar Rol 
            });
            token = regRes.data.user ? regRes.data.user.token : regRes.data.token; // Ajustar según respuesta
            if (!token) {
                // Si register no devuelve token directo, hacemos login
                const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
                    Email: email,
                    Contrasena: password
                });
                token = loginRes.data.token;
            }
        } catch (e) {
            console.error('Error creando usuario test:', e.response ? e.response.data : e.message);
            return;
        }

        console.log('2. Usuario creado/logueado. Token obtenido.');

        console.log('3. Preparando Upload...');
        // Crear imagen dummy
        const dummyPath = path.join(__dirname, 'dummy_image.txt');
        fs.writeFileSync(dummyPath, 'Esto es una imagen falsa para probar upload');

        const form = new FormData();
        form.append('image', fs.createReadStream(dummyPath), { filename: 'test_image.jpg', contentType: 'image/jpeg' });
        // Agregar campos requeridos por el controller
        form.append('Nombre', 'Test Updated');
        form.append('Apellido_Paterno', 'User Updated');
        form.append('Email', email);

        console.log('4. Enviando Petición PUT /profile...');

        const config = {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        };

        const res = await axios.put('http://localhost:3000/api/auth/profile', form, config);

        console.log('✅ ÉXITO. Respuesta del Servidor:');
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.log('❌ FALLO. Detalles del Error:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Headers:', error.response.headers);
            console.log('Data (Body):', error.response.data);
        } else {
            console.log(error.message);
        }
    }
}

runTest();
