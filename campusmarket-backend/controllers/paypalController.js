const { pool } = require('../config/database');

exports.handleWebhook = async (req, res) => {
    const event = req.body;

    console.log('--- PayPal Webhook Received ---');
    console.log('Event Type:', event.event_type);

    try {
        if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
            const resource = event.resource;
            const transactionId = resource.id;

            // We could update the order status here if we have a way to link 
            // the PayPal Order ID to our ID_Pedido before it's created.
            // However, usually the order is created on 'onClientAuthorization' from frontend.
            // This webhook serves as a secondary validation or for late-updates.

            console.log(`Payment Approved: ${transactionId}`);
        }

        res.status(200).send('Webhook Received');
    } catch (error) {
        console.error('Error in PayPal Webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
