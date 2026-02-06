const { MercadoPagoConfig, Preference } = require('mercadopago');

// Configura el cliente con tu Access Token
// IMPORTANTE: Mueve esto a tu archivo .env para producción
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-8236398320496123-112616-5b0e90c644833204-1566367329'
});

exports.createPreference = async (req, res) => {
    try {
        console.log('Recibiendo solicitud de preferencia:', req.body);

        // req.body.items debe ser un array de objetos con: title, quantity, unit_price
        const body = {
            items: req.body.items,
            back_urls: {
                success: "https://localhost:4200/cart?status=success",
                failure: "https://localhost:4200/cart?status=failure",
                pending: "https://localhost:4200/cart?status=pending"
            },
            auto_return: "approved",
        };

        console.log('Enviando body a MP:', JSON.stringify(body, null, 2));

        const preference = new Preference(client);
        const result = await preference.create({ body });

        console.log('Preferencia creada exitosamente:', result.id);

        res.json({
            id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });
    } catch (error) {
        console.error('Error creando preferencia de MP:', error);
        res.status(500).json({ error: "Error al crear la preferencia de pago", details: error.message });
    }
};
