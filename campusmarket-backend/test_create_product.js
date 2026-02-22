const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testCreateProduct() {
    // 1. Login to get token (assuming user ID 1 is a vendor, or we create one)
    // For simplicity, we'll try to login with the user we just created if we knew the creds.
    // Instead, let's just use a hardcoded token if we can, or login properly.

    try {
        // REGISTER NEW VENDOR
        const email = `vendor${Date.now()}@test.com`;
        const password = 'password123';

        try {
            await axios.post('http://localhost:3000/api/auth/register', {
                Nombre: 'Test',
                Apellido_Paterno: 'Vendor',
                Apellido_Materno: 'User',
                Email: email,
                Contrasena: password,
                Telefono: '1234567890',
                Rol: 'Vendedor'
            });
            console.log(`✅ Registered new vendor: ${email}`);
        } catch (regErr) {
            console.log('⚠️ Registration failed (maybe exists):', regErr.message);
        }

        // LOGIN
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            Email: email,
            Contrasena: password
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful. Token obtained.');

        // CREATE PRODUCT WITHOUT IMAGE
        try {
            await axios.post('http://localhost:3000/api/products', {
                Nombre: 'Test Product No Image',
                Precio: 100,
                ID_Categoria: 1,
                Stock: 10
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.log('✅ Expected error (No Image):', err.response?.status, err.response?.data);
        }

        // CREATE PRODUCT WITH IMAGE
        const form = new FormData();
        form.append('Nombre', 'Test Product With Image');
        form.append('Descripcion', 'Description');
        form.append('Precio', 100);
        form.append('Stock', 10);
        form.append('ID_Categoria', 1);
        // Create a dummy file
        fs.writeFileSync('test_image.jpg', 'dummy content');
        form.append('image', fs.createReadStream('test_image.jpg'));

        const createRes = await axios.post('http://localhost:3000/api/products', form, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...form.getHeaders()
            }
        });
        console.log('✅ Product Created:', createRes.data);

    } catch (err) {
        if (err.response?.status === 401) {
            console.error('❌ Login failed. Please create a user "vendor@test.com" / "123456" manually or update this script.');
        } else {
            console.error('❌ Error:', err.message, err.response?.data);
        }
    }
}

testCreateProduct();
