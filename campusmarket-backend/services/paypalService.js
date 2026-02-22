const axios = require('axios');
require('dotenv').config();

const PAYPAL_API = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'Aa4jACfctPZtBlDlf0KnDdkgmW9gmV6nH1N82rUyd7ggdxVX4r0WbSIvMdqv5oi5OLyvGx_XbH8Z3OYx';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

/**
 * Creates an order with the PayPal API.
 */
async function createOrder(purchaseUnits) {
    const accessToken = await generateAccessToken();
    try {
        const intent = 'AUTHORIZE';
        console.log(`Creando orden PayPal con INTENT: ${intent} (${purchaseUnits.length} purchase_units)`);
        const response = await axios({
            url: `${PAYPAL_API}/v2/checkout/orders`,
            method: 'post',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                intent: intent,
                purchase_units: purchaseUnits
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            require('fs').writeFileSync('c:/CampusMarket/CampusMarket/campusmarket-backend/paypal_service_error.log', JSON.stringify(error.response.data, null, 2));
        }
        console.error("Failed to create PayPal Order:", error.response ? error.response.data : error.message);
        throw new Error("PAYPAL_ORDER_CREATION_FAILED");
    }
}

/**
 * Generates an OAuth2 access token for the PayPal API.
 */
async function generateAccessToken() {
    if (!CLIENT_SECRET) {
        console.error('PAYPAL_CLIENT_SECRET not found in .env');
        throw new Error('MISSING_PAYPAL_CREDENTIALS');
    }

    const auth = Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64");
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v1/oauth2/token`,
            method: 'post',
            data: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Failed to generate Access Token:", error.response ? error.response.data : error.message);
        throw new Error("PAYPAL_AUTH_FAILED");
    }
}

/**
 * Verifies an order with the PayPal API.
 */
async function verifyOrder(orderId) {
    const accessToken = await generateAccessToken();
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v2/checkout/orders/${orderId}`,
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Failed to verify PayPal Order:", error.response ? error.response.data : error.message);
        throw new Error("PAYPAL_ORDER_VERIFICATION_FAILED");
    }
}

/**
 * Verifies an authorization with the PayPal API.
 */
async function getAuthorization(authorizationId) {
    console.log('PayPalService: Consultado autorización:', authorizationId);
    const accessToken = await generateAccessToken();
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v2/payments/authorizations/${authorizationId}`,
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Failed to get PayPal Authorization:", error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Authorizes a PayPal order.
 */
async function authorizeOrder(orderID) {
    console.log(`[PayPalService] Intentando autorizar orden: ${orderID}`);
    const accessToken = await generateAccessToken();
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v2/checkout/orders/${orderID}/authorize`,
            method: 'post',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: {}
        });
        console.log(`[PayPalService] Autorización exitosa para ${orderID}. Status: ${response.status}`);
        return response.data;
    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error("[PayPalService] Error en authorizeOrder:", JSON.stringify(errorDetails, null, 2));
        throw error;
    }
}

/**
 * Gets details of a PayPal order.
 */
async function getOrder(orderID) {
    const accessToken = await generateAccessToken();
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v2/checkout/orders/${orderID}`,
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Failed to get PayPal Order:", error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Verifies a capture with the PayPal API.
 */
async function getCapture(captureId) {
    console.log('PayPalService: Consultado captura:', captureId);
    const accessToken = await generateAccessToken();
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v2/payments/captures/${captureId}`,
            method: 'get',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Failed to get PayPal Capture:", error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Captures an authorized payment.
 */
async function capturePayment(authorizationId, amount) {
    const accessToken = await generateAccessToken();
    try {
        const data = amount ? {
            amount: {
                value: Number(amount).toFixed(2),
                currency_code: 'USD'
            },
            final_capture: false
        } : {};

        console.log(`[PayPalService] Capturando ${amount ? '$' + amount : 'TODO'} de Auth: ${authorizationId}`);

        const response = await axios({
            url: `${PAYPAL_API}/v2/payments/authorizations/${authorizationId}/capture`,
            method: 'post',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: data
        });
        return response.data;
    } catch (error) {
        console.error("Failed to capture PayPal Payment:", error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Sends a payout to a seller.
 */
async function createPayout(receiverEmail, amount, orderId) {
    const accessToken = await generateAccessToken();
    const batchId = `PAYOUT_${orderId}_${Date.now()}`;
    try {
        const response = await axios({
            url: `${PAYPAL_API}/v1/payments/payouts`,
            method: 'post',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                sender_batch_header: {
                    sender_batch_id: batchId,
                    email_subject: "Has recibido un pago de CampusMarket",
                    email_message: `Se ha completado la entrega del pedido #${orderId}. ¡Gracias por vender con nosotros!`
                },
                items: [{
                    recipient_type: "EMAIL",
                    amount: {
                        value: amount.toFixed(2),
                        currency: "USD"
                    },
                    note: `Pago de pedido #${orderId}`,
                    sender_item_id: `ITEM_${orderId}`,
                    receiver: receiverEmail
                }]
            }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to create PayPal Payout:", error.response ? error.response.data : error.message);
        // Do not throw if it's just a duplicate batch (safety)
        if (error.response?.data?.name === 'DUPLICATE_BATCH_ID') {
            return { status: 'DUPLICATE' };
        }
        throw new Error("PAYPAL_PAYOUT_FAILED");
    }
}

module.exports = {
    generateAccessToken,
    createOrder,
    verifyOrder,
    getAuthorization,
    getCapture,
    capturePayment,
    createPayout,
    authorizeOrder,
    getOrder
};
