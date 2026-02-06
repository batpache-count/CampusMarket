const Order = require('../models/Order');
const Product = require('../models/Product'); // Para verificar stock y precio
const User = require('../models/User'); // Para verificar ID_Vendedor
const Notification = require('../models/Notification');

const crypto = require('crypto'); // Para generar tokens QR únicos

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
        }

        // --- Generación de Token QR Único ---
        const qrToken = crypto.randomBytes(16).toString('hex');

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
            QR_Token: qrToken
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
 * Obtiene los detalles de un pedido.
 */
exports.getOrderDetails = async (req, res) => {
    try {
        const detalles = await Order.findDetails(req.params.id);
        res.status(200).json(detalles);
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

    if (!['Pendiente', 'En preparacion', 'Entregado', 'Cancelado'].includes(newStatus)) {
        return res.status(400).json({ message: 'Estado inválido.' });
    }

    try {
        // Verificar que el pedido pertenezca a este vendedor
        const pedido = await Order.findById(idPedido);
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }
        if (pedido.ID_Vendedor !== idVendedor) {
            return res.status(403).json({ message: 'No tienes permiso para modificar este pedido.' });
        }

        await Order.updateStatus(idPedido, newStatus, 'Vendedor');

        res.status(200).json({ message: `Estado actualizado a "${newStatus}".` });

    } catch (error) {
        console.error('Error en updateOrderStatus:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
