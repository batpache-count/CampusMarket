const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function verifySellerCRUD() {
    const email = `testvendor_${Date.now()}@example.com`;
    const password = 'Password123!';
    
    console.log('🚀 Iniciando verificación de CRUD de Productos...');

    try {
        // 1. REGISTRO DE VENDEDOR
        console.log(`\n1️⃣ Registrando nuevo vendedor: ${email}`);
        try {
            await axios.post('http://localhost:3000/api/auth/register', {
                Nombre: 'Test',
                Apellido_Paterno: 'Vendor',
                Apellido_Materno: 'CRUD',
                Email: email,
                Contrasena: password,
                Telefono: '5555555555',
                Rol: 'Vendedor'
            });
            console.log('✅ Vendedor registrado exitosamente.');
        } catch (error) {
            console.error('❌ Error en registro:', error.response?.data || error.message);
            throw error;
        }

        // 2. LOGIN
        console.log('\n2️⃣ Iniciando sesión...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            Email: email,
            Contrasena: password
        });
        const token = loginRes.data.token;
        console.log('✅ Token obtenido.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 3. VERIFICAR LISTADO VACÍO
        console.log('\n3️⃣ Verificando listado inicial (debe estar vacío)...');
        const listRes1 = await axios.get('http://localhost:3000/api/seller/my-products', config);
        if (Array.isArray(listRes1.data) && listRes1.data.length === 0) {
            console.log('✅ Listado inicial correcto (0 productos).');
        } else {
            console.error('❌ Error: El listado inicial no es un array vacío.', listRes1.data);
        }

        // 4. CREAR PRODUCTO
        console.log('\n4️⃣ Creando producto de prueba...');
        
        // Crear imagen dummy
        if (!fs.existsSync('test_image.jpg')) {
            fs.writeFileSync('test_image.jpg', 'dummy image content');
        }

        const form = new FormData();
        form.append('name', 'Producto Test CRUD');
        form.append('description', 'Descripción generada por script de prueba');
        form.append('price', 150);
        form.append('stock', 50);
        form.append('category', 1); // Asumiendo que existe categoría 1
        form.append('image', fs.createReadStream('test_image.jpg'));

        try {
            const createRes = await axios.post('http://localhost:3000/api/products', form, {
                headers: {
                    ...config.headers,
                    ...form.getHeaders()
                }
            });
            console.log('✅ Producto creado:', createRes.data);
            
            // 5. VERIFICAR LISTADO CON PRODUCTO
            console.log('\n5️⃣ Verificando listado actualizado...');
            const listRes2 = await axios.get('http://localhost:3000/api/seller/my-products', config);
            const products = listRes2.data;
            
            if (Array.isArray(products) && products.length > 0) {
                const createdProduct = products.find(p => p.Nombre === 'Producto Test CRUD');
                if (createdProduct) {
                    console.log('✅ Producto encontrado en el listado:', createdProduct.Nombre);
                    console.log(`   ID: ${createdProduct.ID_Producto}, Precio: ${createdProduct.Precio}`);
                } else {
                    console.error('❌ Producto creado no encontrado en el listado.');
                }
            } else {
                console.error('❌ El listado sigue vacío después de crear producto.');
            }

        } catch (error) {
            console.error('❌ Error al crear producto:', error.response?.data || error.message);
        }

        // Limpieza (opcional)
        // fs.unlinkSync('test_image.jpg');

    } catch (error) {
        console.error('\n❌ Verificación fallida:', error.message);
    }
}

verifySellerCRUD();
