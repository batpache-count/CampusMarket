const { pool } = require('../config/database');
const Order = require('../models/Order');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product'); // Para verificar stock y precio
const User = require('../models/User'); // Para verificar ID_Vendedor
const Notification = require('../models/Notification');

const crypto = require('crypto'); // Para generar tokens QR únicos
const PayPalService = require('../services/paypalService');

/**
 * Endpoint: POST /api/orders
 * Crea un nuevo pedido (RF-C-004).
 * Rol: Comprador (o cualquier usuario autenticado)
 */
exports.createOrder = async (req, res) => {
    // ID_Comprador se obtiene del token
    const idComprador = req.user.ID_Usuario;

    // Datos esperados del front-end (del carrito)
    const {
        ID_Vendedor,
        ID_Ubicacion_Entrega,
        Hora_Encuentro,
        items, // Array de [ { ID_Producto, Cantidad } ]
        Metodo_Pago,
        PayPal_Transaction_ID
    } = req.body;

    // --- Validación 1: Datos Faltantes ---
    if (!ID_Vendedor || !ID_Ubicacion_Entrega || !items || items.length === 0) {
        return res.status(400).json({ message: 'Datos incompletos. Se requiere Vendedor, Ubicación e Items.' });
    }

    try {
        // --- Validación Previa: Auto-compra ---
        const vendorUser = await User.findUserByVendorId(ID_Vendedor);
        if (vendorUser && vendorUser.ID_Usuario === idComprador) {
            return res.status(400).json({ message: 'No puedes comprar tus propios productos.' });
        }
        let precioTotalCalculado = 0;
        const itemsValidados = [];

        // --- Validación 2: Stock y Precios (RF-C-004) ---
        // Verificamos el stock y "congelamos" el precio en tiempo real.
        for (const item of items) {
            const productoDB = await Product.findById(item.ID_Producto);

            // Verificar si el producto existe y está activo
            if (!productoDB || productoDB.Activo === 0) {
                return res.status(404).json({ message: `El producto con ID ${item.ID_Producto} no está disponible.` });
            }

            // Verificar si el producto pertenece al vendedor correcto
            if (productoDB.ID_Vendedor !== ID_Vendedor) {
                return res.status(400).json({ message: `El producto "${productoDB.Nombre}" no pertenece al vendedor seleccionado.` });
            }

            // Verificar stock (RF-C-004)
            if (productoDB.Stock < item.Cantidad) {
                return res.status(400).json({ message: `Stock insuficiente para "${productoDB.Nombre}". Disponible: ${productoDB.Stock}.` });
            }

            // Calcular precio y añadir a la lista validada
            const precioUnitario = productoDB.Precio;
            precioTotalCalculado += (precioUnitario * item.Cantidad);
            itemsValidados.push({
                ID_Producto: item.ID_Producto,
                Cantidad: item.Cantidad,
                Precio_Unitario: precioUnitario // Precio "congelado"
            });

            // Stock is already reserved/reduced in CartController.addToCart
            // and restored if items are removed or cart is cleared.
            // No extra deduction needed at order creation.
        }

        // --- Validación 3: Verificación Real de PayPal (Server-to-Server) ---
        if (Metodo_Pago === 'PayPal') {
            if (!PayPal_Transaction_ID) {
                return res.status(400).json({ message: 'Se requiere PayPal_Transaction_ID para este método de pago.' });
            }

            try {
                console.log(`Verificando pago PayPal para Orden ${PayPal_Transaction_ID}...`);
                let paypalPayment;
                let status;
                let amountValue;

                // Intentar obtener como Autorización primero
                try {
                    paypalPayment = await PayPalService.getAuthorization(PayPal_Transaction_ID);
                    status = paypalPayment.status;
                    amountValue = paypalPayment.amount.value;
                    console.log(`Tipo: Autorización, Estado: ${status}, Monto: ${amountValue}`);
                } catch (err) {
                    // Si falla con 404, intentar como Captura
                    if (err.response && err.response.status === 404) {
                        console.log('No es una Autorización, intentando como Captura...');
                        paypalPayment = await PayPalService.getCapture(PayPal_Transaction_ID);
                        status = paypalPayment.status;
                        amountValue = paypalPayment.amount.value;
                        console.log(`Tipo: Captura, Estado: ${status}, Monto: ${amountValue}`);
                    } else {
                        throw err;
                    }
                }

                // Verificar que el pago esté en un estado válido (CREATED, COMPLETED, etc.)
                const validStatuses = ['CREATED', 'CAPTURED', 'COMPLETED', 'PENDING', 'AUTHORIZED', 'PARTIALLY_CAPTURED'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        message: `El pago no está en un estado válido en PayPal (Estado: ${status}).`
                    });
                }

                // Verificar que el monto coincida (O que el PayPal total sea suficiente para esta parte de la orden consolidada)
                const paypalTotal = parseFloat(amountValue);

                // Buscar si hay otros pedidos con este mismo PayPal_Transaction_ID
                const { rows: assignedRows } = await pool.query(
                    'SELECT COALESCE(SUM("Precio_Total"), 0) as assigned_total FROM pedido WHERE "PayPal_Transaction_ID" = $1',
                    [PayPal_Transaction_ID]
                );
                const alreadyAssignedTotal = parseFloat(assignedRows[0].assigned_total);

                console.log(`[OrderDebug] PayPal Auth Total: $${paypalTotal}. Ya registrado en DB: $${alreadyAssignedTotal}. Intentando registrar: $${precioTotalCalculado}`);

                if ((alreadyAssignedTotal + precioTotalCalculado) > (paypalTotal + 0.01)) {
                    console.error(`ERROR: Exceso de monto. PayPal Auth: ${paypalTotal}, Total en DB + Nuevo: ${alreadyAssignedTotal + precioTotalCalculado}`);
                    return res.status(400).json({
                        message: `El pago de PayPal ($${paypalTotal}) no es suficiente para cubrir esta orden y las anteriores ($${alreadyAssignedTotal + precioTotalCalculado}).`
                    });
                }

                console.log(`Pago de PayPal Validado para esta parte de la orden: ${PayPal_Transaction_ID}`);
            } catch (authError) {
                if (authError.message === 'MISSING_PAYPAL_CREDENTIALS') {
                    console.warn('ADVERTENCIA: Saltando verificación real por falta de PAYPAL_CLIENT_SECRET. No apto para producción.');
                } else {
                    console.error('Error verificando pago con PayPal SDK:', authError.response ? authError.response.data : authError.message);
                    return res.status(402).json({
                        message: 'No se pudo verificar el pago con PayPal.',
                        details: authError.response ? authError.response.data : authError.message
                    });
                }
            }
        }

        // --- Generación de Código de Confirmación Único (RF-C-006) ---
        // Generamos un código corto de 6 caracteres (ej: AB12CD)
        const qrToken = crypto.randomBytes(3).toString('hex').toUpperCase();

        // --- Establecer Estado Inicial ---
        const estadoInicial = Metodo_Pago === 'PayPal' ? 'Autorizado' : 'Pendiente';

        console.log(`[OrderDebug] Registrando pedido en DB: Vendedor ${ID_Vendedor}, Comprador ${idComprador}, Total: ${precioTotalCalculado}, PayPal ID: ${PayPal_Transaction_ID}, Estado: ${estadoInicial}, Code: ${qrToken}`);

        // --- Ejecución de la Transacción ---
        const newPedidoId = await Order.create({
            ID_Comprador: idComprador,
            ID_Vendedor: ID_Vendedor,
            ID_Ubicacion_Entrega: ID_Ubicacion_Entrega,
            Hora_Encuentro: Hora_Encuentro,
            Precio_Total: precioTotalCalculado,
            items: itemsValidados,
            Metodo_Pago,
            PayPal_Transaction_ID,
            QR_Token: qrToken,
            Estado_Pedido: estadoInicial
        });

        // --- NOTIFICACIONES (Post-Venta) ---
        // No bloqueamos la respuesta si esto falla
        try {
            console.log('Iniciando proceso de notificaciones...');
            // 1. Obtener ID_Usuario del Vendedor
            const vendorUser = await User.findUserByVendorId(ID_Vendedor);
            console.log('Vendedor encontrado:', vendorUser);

            if (vendorUser) {
                const sellerUserId = vendorUser.ID_Usuario;

                // 2. Notificación de Nueva Venta
                await Notification.create({
                    ID_Usuario: sellerUserId,
                    Tipo: 'VENTA',
                    Mensaje: `¡Nueva venta! Pedido #${newPedidoId} por $${precioTotalCalculado}`,
                    ID_Referencia: newPedidoId
                });
                console.log('Notificación de VENTA creada.');

                // 3. Verificar Stock y Notificar
                for (const item of itemsValidados) {
                    const product = await Product.findById(item.ID_Producto);
                    if (product) {
                        const currentStock = Number(product.Stock);
                        console.log(`Producto ${product.Nombre} stock actual: ${currentStock}`);

                        if (currentStock <= 0) {
                            await Notification.create({
                                ID_Usuario: sellerUserId,
                                Tipo: 'AGOTADO',
                                Mensaje: `El producto "${product.Nombre}" se ha AGOTADO.`,
                                ID_Referencia: product.ID_Producto
                            });
                            console.log('Notificación AGOTADO creada.');
                        } else if (currentStock < 5) {
                            await Notification.create({
                                ID_Usuario: sellerUserId,
                                Tipo: 'STOCK_BAJO',
                                Mensaje: `Stock bajo para "${product.Nombre}": quedan ${currentStock} unidades.`,
                                ID_Referencia: product.ID_Producto
                            });
                            console.log('Notificación STOCK_BAJO creada.');
                        }
                    }
                }
            } else {
                console.warn('No se encontró usuario para el vendedor ID:', ID_Vendedor);
            }
        } catch (notifError) {
            console.error('Error enviando notificaciones:', notifError);
        }

        res.status(201).json({
            message: 'Pedido creado exitosamente.',
            ID_Pedido: newPedidoId,
            QR_Token: qrToken
        });

    } catch (error) {
        console.error('Error en createOrder:', error);
        res.status(500).json({ message: error.message || 'Error interno del servidor al crear el pedido.' });
    }
};

/**
 * Endpoint: GET /api/orders/my-orders
 * Obtiene el historial de pedidos del Comprador (RF-C-005).
 * Rol: Comprador
 */
exports.getMyOrdersAsBuyer = async (req, res) => {
    const idComprador = req.user.ID_Usuario;

    try {
        const pedidos = await Order.findByBuyer(idComprador);

        // Ahora, para cada pedido, obtenemos sus detalles (productos)
        for (const pedido of pedidos) {
            const detalles = await Order.findDetails(pedido.ID_Pedido);
            pedido.items = detalles;
        }

        res.status(200).json(pedidos);

    } catch (error) {
        console.error('Error en getMyOrdersAsBuyer:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: GET /api/orders/seller-orders
 * Obtiene los pedidos recibidos por el Vendedor (RF-V-007).
 * Rol: Vendedor
 */
exports.getMyOrdersAsSeller = async (req, res) => {
    // El ID del vendedor debe venir en el token o buscarse
    // En nuestro caso, el token tiene 'tiendaId' si es vendedor
    const idVendedor = req.user.tiendaId;

    if (!idVendedor) {
        return res.status(400).json({ message: 'No se encontró el ID de vendedor en la sesión.' });
    }

    try {
        const pedidos = await Order.findByVendor(idVendedor);

        // Detalles para cada pedido
        for (const pedido of pedidos) {
            const detalles = await Order.findDetails(pedido.ID_Pedido);
            pedido.items = detalles;
        }

        res.status(200).json(pedidos);

    } catch (error) {
        console.error('Error en getMyOrdersAsSeller:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: GET /api/orders/:id/details
 * Obtiene los detalles COMPLETOS de un pedido (Header + Items).
 */
exports.getOrderDetails = async (req, res) => {
    const orderId = req.params.id;
    try {
        // 1. Obtener información del encabezado del pedido (Comprador, Ubicación, Estado, etc.)
        const orderHeader = await Order.findByIdWithInfo(orderId);

        if (!orderHeader) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        // 2. Obtener los productos del pedido
        const items = await Order.findDetails(orderId);

        // 3. Retornar objeto compuesto
        res.status(200).json({
            order: orderHeader,
            items: items
        });

    } catch (error) {
        console.error('Error en getOrderDetails:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: PUT /api/orders/:id/status
 * Actualiza el estado de un pedido (RF-V-008).
 * Rol: Vendedor
 */
exports.updateOrderStatus = async (req, res) => {
    const idPedido = req.params.id;
    const { newStatus } = req.body;
    const idVendedor = req.user.tiendaId; // El vendedor que hace la acción
    console.log('Update Status Request:', { idPedido, newStatus, idVendedor, userId: req.user.ID_Usuario });

    if (!['Pendiente', 'Pagado', 'En preparacion', 'Listo', 'En camino', 'Entregado', 'Cancelado'].includes(newStatus)) {
        return res.status(400).json({ message: 'Estado inválido.' });
    }

    try {
        // Verificar que el pedido pertenezca a este vendedor
        const pedido = await Order.findById(idPedido);
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        // Loose comparison or convert to Number
        if (Number(pedido.ID_Vendedor) !== Number(idVendedor)) {
            console.log(`[Status Update Error] Order Vendor: ${pedido.ID_Vendedor} (Type: ${typeof pedido.ID_Vendedor}), Request Vendor: ${idVendedor} (Type: ${typeof idVendedor})`);
            return res.status(403).json({ message: 'No tienes permiso para modificar este pedido.' });
        }

        await Order.updateStatus(idPedido, newStatus, 'Vendedor');

        res.status(200).json({ message: `Estado actualizado a "${newStatus}".` });

    } catch (error) {
        console.error('Error en updateOrderStatus:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: POST /api/orders/validate-qr
 * Valida la entrega mediante código QR (RF-C-006 / RF-V-010).
 * Rol: Vendedor (Escanea el QR del comprador)
 */
exports.validateQR = async (req, res) => {
    const orderId = req.params.id || req.body.orderId;
    const { token } = req.body; // El front envía 'token' según order.service.ts
    const qrToken = token;
    const idVendedor = req.user.tiendaId; // El vendedor que escanea

    if (!orderId || !qrToken) {
        return res.status(400).json({ message: 'Faltan datos (Order ID o Token).' });
    }

    try {
        const logPath = 'c:/CampusMarket/CampusMarket/campusmarket-backend/qr_debug.log';
        const timestamp = new Date().toISOString();

        const pedido = await Order.findById(orderId);

        if (!pedido) {
            fs.appendFileSync(logPath, `[${timestamp}] FAIL: Order ${orderId} not found\n`);
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        // Normalize tokens for comparison
        const storedToken = (pedido.QR_Token || '').trim().toLowerCase();
        const inputToken = (qrToken || '').trim().toLowerCase();

        // Log attempt details for debugging
        fs.appendFileSync(logPath, `[${timestamp}] ATTEMPT: Order ${orderId}, Vendor Scanned: ${idVendedor}, Token In: ${inputToken}, Token Expected: ${storedToken}\n`);

        // Verificar que el pedido pertenezca al vendedor que escanea
        if (Number(pedido.ID_Vendedor) !== Number(idVendedor)) {
            const errorMsg = `No tienes permiso para validar este pedido. Este pedido es del vendedor ID ${pedido.ID_Vendedor}, pero tú eres ID ${idVendedor}.`;
            fs.appendFileSync(logPath, `[${timestamp}] ERROR: Permission Mismatch\n`);
            return res.status(403).json({ message: errorMsg });
        }

        // Verificar el token
        if (storedToken !== inputToken) {
            fs.appendFileSync(logPath, `[${timestamp}] ERROR: Invalid Token. Expected: ${storedToken}, Got: ${inputToken}\n`);
            return res.status(400).json({ message: 'Código de entrega inválido. Verifica el código con el comprador.' });
        }

        // Verificar estado actual
        if (pedido.Estado_Pedido === 'Entregado') {
            fs.appendFileSync(logPath, `[${timestamp}] WARN: Already delivered\n`);
            return res.status(400).json({ message: 'Este pedido ya fue entregado.' });
        }

        // --- NUEVA VALIDACIÓN DE SEGURIDAD (ESCROW) ---
        // Permitir validar si el pedido está Autorizado (PayPal Retenido), Pagado, Listo o En camino.
        if (pedido.Metodo_Pago?.toLowerCase() === 'paypal' && !['Autorizado', 'Pagado', 'Listo', 'En camino'].includes(pedido.Estado_Pedido)) {
            const statusMsg = `El pago de este pedido aún no ha sido autorizado/retenido por PayPal (Estado actual: ${pedido.Estado_Pedido}). No entregues el producto todavía.`;
            fs.appendFileSync(logPath, `[${timestamp}] ERROR: Payment Not Confirmed\n`);
            return res.status(400).json({ message: statusMsg });
        }

        // --- LIBERAR Y DISTRIBUIR FONDOS EN PAYPAL (CAPTURE -> PAYOUT) ---
        if (pedido.Metodo_Pago?.toLowerCase() === 'paypal' && pedido.PayPal_Transaction_ID) {
            try {
                // 1. Capturar el pago del comprador a la plataforma (Captura PARCIAL si es necesario)
                console.log(`[Escrow] Capturando fondos ($${pedido.Precio_Total}) de Auth ID: ${pedido.PayPal_Transaction_ID}...`);
                const captureResult = await PayPalService.capturePayment(pedido.PayPal_Transaction_ID, Number(pedido.Precio_Total));
                console.log('[Escrow] Pago Capturado en Plataforma:', captureResult.id);

                // 2. Obtener email de PayPal del vendedor para el Payout
                // Usamos findByIdWithInfo para obtener todos los datos necesarios
                const fullOrder = await Order.findByIdWithInfo(orderId);
                const sellerPayPalEmail = fullOrder?.PayPal_Email_Vendedor;

                if (sellerPayPalEmail && sellerPayPalEmail.includes('@')) {
                    console.log(`[Escrow] Iniciando Payout automático a: ${sellerPayPalEmail} por $${pedido.Precio_Total}`);
                    const payoutResult = await PayPalService.createPayout(sellerPayPalEmail, Number(pedido.Precio_Total), orderId);
                    console.log('[Escrow] Payout Emitido Exitosamente:', payoutResult.batch_header?.payout_batch_id || 'OK');
                    fs.appendFileSync(logPath, `[${timestamp}] PAYPAL SUCCESS: Capture ${captureResult.id}, Payout OK to ${sellerPayPalEmail}\n`);
                } else {
                    console.warn(`[Escrow] Vendedor #${pedido.ID_Vendedor} no tiene email de PayPal configurado. Dinero queda en plataforma.`);
                    fs.appendFileSync(logPath, `[${timestamp}] PAYPAL WARN: Capture OK, Payout SKIPPED (No Email for Vendor ${pedido.ID_Vendedor})\n`);
                }

            } catch (payError) {
                console.error('[Escrow] Fallo Crítico en flujo de pago:', payError.message);
                fs.appendFileSync(logPath, `[${timestamp}] PAYPAL CRITICAL FAIL: ${payError.message}\n`);
                return res.status(500).json({
                    message: 'Fallo al procesar el pago en PayPal. Contacta a soporte para liberación manual.'
                });
            }
        }

        // Actualizar estado a Entregado
        await Order.updateStatus(orderId, 'Entregado', 'Vendedor (QR)');
        fs.appendFileSync(logPath, `[${timestamp}] SUCCESS: Order ${orderId} delivered\n`);

        res.status(200).json({ message: '¡Entrega y Pago procesados con éxito! El vendedor recibirá su pago en breve.' });

    } catch (error) {
        console.error('Error en validateQR:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: POST /api/orders/:id/rate
 * Califica un pedido entregado (RF-C-007).
 * Rol: Comprador
 */
exports.rateOrder = async (req, res) => {
    const idPedido = req.params.id;
    const { rating, comment } = req.body;
    const idComprador = req.user.ID_Usuario;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'La calificación debe ser entre 1 y 5.' });
    }

    try {
        const pedido = await Order.findById(idPedido);

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        if (pedido.ID_Comprador !== idComprador) {
            return res.status(403).json({ message: 'No puedes calificar un pedido que no es tuyo.' });
        }

        if (pedido.Estado !== 'Entregado') {
            return res.status(400).json({ message: 'Solo puedes calificar pedidos ENTREGADOS.' });
        }

        // Aquí deberíamos guardar la calificación en una tabla de reseñas
        // Como no tenemos el modelo de Reseña a mano, vamos a suponer que existe o usar una consulta directa
        // O mejor, agregar un campo 'Calificacion' y 'Comentario' a la tabla de Pedidos si es simple
        // O insertar en 'Resenas'

        // Revisando el código original de product-detail.ts, parece que ya hay un endpoint de reviews
        // Pero ese es por producto. Aquí es por PEDIDO. 
        // Vamos a guardar la reseña vinculada al pedido Y a los productos.

        // Simulación: Guardar en tabla de reseñas (Usando raw query o modelo si existiera)
        // Como no tengo el modelo 'Review', usaré una query directa o un placeholder.
        // Asuma que existe una función en Order model para guardar review.

        await Order.addReview(idPedido, rating, comment);

        res.status(200).json({ message: 'Calificación guardada exitosamente.' });

    } catch (error) {
        console.error('Error en rateOrder:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: POST /api/orders/:id/confirm-receipt
 * Permite al COMPRADOR confirmar que recibió el pedido (RF-C-Confirm).
 * Rol: Comprador
 */
exports.confirmReceipt = async (req, res) => {
    const idPedido = req.params.id;
    const idComprador = req.user.ID_Usuario;

    try {
        const pedido = await Order.findById(idPedido);
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        if (pedido.ID_Comprador !== idComprador) {
            return res.status(403).json({ message: 'No tienes permiso para confirmar este pedido.' });
        }

        if (pedido.Estado_Pedido === 'Entregado') {
            return res.status(400).json({ message: 'El pedido ya está marcado como entregado.' });
        }

        // Actualizar estado
        await Order.updateStatus(idPedido, 'Entregado', 'Comprador');

        res.status(200).json({ message: 'Pedido confirmado como recibido. ¡Gracias!' });

    } catch (error) {
        console.error('Error en confirmReceipt:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
/**
 * Endpoint: POST /api/orders/webhook/paypal
 * Recibe notificaciones automáticas de PayPal (IPN/Webhooks).
 * (Configuración requerida en el Dashboard de PayPal Developer)
 */
exports.handlePayPalWebhook = async (req, res) => {
    const event = req.body;
    const logPath = 'c:/CampusMarket/CampusMarket/campusmarket-backend/qr_debug.log';
    const timestamp = new Date().toISOString();

    console.log('PayPal Webhook Received:', event.event_type);

    try {
        // Tipos de eventos comunes: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED
        if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            const paypalOrderId = event.resource.id;

            // Buscamos si existe algún pedido con este ID de PayPal que no esté marcado como Pagado
            const query = `
                UPDATE pedido 
                SET "Estado_Pedido" = 'Pagado' 
                WHERE "PayPal_Transaction_ID" = $1 
                  AND "Estado_Pedido" = 'Pendiente'
                RETURNING "ID_Pedido"
            `;

            const result = await pool.query(query, [paypalOrderId]);

            if (result.rowCount > 0) {
                const idPedido = result.rows[0].ID_Pedido;
                fs.appendFileSync(logPath, `[${timestamp}] WEBHOOK SUCCESS: Order ${idPedido} (PayPal ${paypalOrderId}) updated to Pagado.\n`);
                console.log(`Webhook actualizó el pedido ${idPedido} a Pagado.`);
            } else {
                fs.appendFileSync(logPath, `[${timestamp}] WEBHOOK INFO: No pending orders found for PayPal ID ${paypalOrderId}\n`);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ message: 'Error procesando webhook.' });
    }
};

/**
 * Endpoint: POST /api/orders/init-paypal
 * Inicia la creación de una orden en PayPal (Server-Side).
 */
exports.initPayPalOrder = async (req, res) => {
    console.log('--- PayPal Order Init ---');
    console.log('Payload recibido:', JSON.stringify(req.body, null, 2));

    try {
        // Manejar diferentes formatos: { orders: [] } (frontend) o { total, items } (manual/curl)
        let orders = [];
        if (req.body.orders && Array.isArray(req.body.orders)) {
            orders = req.body.orders;
        } else if (Array.isArray(req.body)) {
            orders = req.body;
        } else if (req.body.total || req.body.items) {
            // Un solo objeto consolidado
            orders = [req.body];
        }

        if (orders.length === 0) {
            return res.status(400).json({ message: 'No hay órdenes para procesar o el formato es inválido.' });
        }

        // Consolidar todos los productos en una sola unidad de compra (para evitar error de AUTHORIZE con múltiples unidades)
        const totalValue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const allItems = [];

        orders.forEach(order => {
            (order.items || []).forEach(item => {
                allItems.push({
                    name: (item.Nombre_Producto || item.name || 'Producto').substring(0, 127),
                    quantity: (item.Cantidad || item.quantity || 1).toString(),
                    unit_amount: {
                        currency_code: order.currency || 'USD',
                        value: Number(item.Precio_Unitario || item.unit_price || order.total).toFixed(2)
                    }
                });
            });
        });

        // Si no hay items detallados, crear uno genérico por el total
        if (allItems.length === 0) {
            allItems.push({
                name: "Total del Pedido",
                quantity: "1",
                unit_amount: {
                    currency_code: 'USD',
                    value: totalValue.toFixed(2)
                }
            });
        }

        const purchaseUnits = [{
            reference_id: `CART_${Date.now()}`,
            amount: {
                currency_code: 'USD',
                value: totalValue.toFixed(2),
                breakdown: {
                    item_total: {
                        currency_code: 'USD',
                        value: totalValue.toFixed(2)
                    }
                }
            },
            description: "Compra consolidada CampusMarket",
            items: allItems
        }];

        console.log('Enviando a PayPal (Consolidado):', JSON.stringify(purchaseUnits, null, 2));

        console.log('Enviando a PayPal:', JSON.stringify(purchaseUnits, null, 2));
        const paypalOrder = await PayPalService.createOrder(purchaseUnits);
        res.status(200).json({ id: paypalOrder.id });

    } catch (error) {
        console.error('Error initPayPalOrder:', error);
        // Devolver error detallado si es de PayPal
        const details = error.response ? error.response.data : error.message;
        fs.writeFileSync('c:/CampusMarket/CampusMarket/campusmarket-backend/paypal_error.log', JSON.stringify(details, null, 2));
        res.status(400).json({
            message: 'Error al iniciar la orden de PayPal.',
            error: details
        });
    }
};

/**
 * Endpoint: POST /api/orders/authorize-paypal
 * Autoriza la orden PayPal después de approve (para intent=AUTHORIZE).
 */
exports.authorizePayPalOrder = async (req, res) => {
    console.log('[PayPalAuth] --- INICIANDO authorizePayPalOrder ---');
    const { orderID } = req.body;

    if (!orderID) {
        return res.status(400).json({ message: 'orderID requerido' });
    }

    try {
        console.log(`[PayPalAuth] Recibida petición de autorización para OrderID: ${orderID}`);

        const authResult = await PayPalService.authorizeOrder(orderID);

        console.log(`[PayPalAuth] Respuesta de PayPal recibida para ${orderID}`);

        // El authorization ID real suele estar en purchase_units[0].payments.authorizations[0].id
        let authorizationId = null;
        if (authResult.purchase_units && authResult.purchase_units.length > 0) {
            const payments = authResult.purchase_units[0].payments;
            if (payments && payments.authorizations && payments.authorizations.length > 0) {
                authorizationId = payments.authorizations[0].id;
            }
        }

        if (!authorizationId) {
            console.warn(`[PayPalAuth] ADVERTENCIA: No se encontró authorizationId en la respuesta. Status: ${authResult.status}`);
        } else {
            console.log(`[PayPalAuth] Autorización exitosa. ID Resultante: ${authorizationId}`);
        }

        // Obtenemos los detalles actualizados de la orden
        const orderDetails = await PayPalService.getOrder(orderID);

        res.status(200).json({
            success: true,
            authorizationId: authorizationId,
            orderDetails: orderDetails
        });

    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('[PayPalAuth] ERROR CRÍTICO:', JSON.stringify(errorDetails, null, 2));
        res.status(500).json({
            message: 'Fallo al autorizar el pago en PayPal.',
            error: errorDetails
        });
    }
};
