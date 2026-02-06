const Ubicacion = require('../models/Ubicacion');
const User = require('../models/User'); // Necesitamos el modelo User para encontrar el ID_Vendedor

/**
 * Endpoint: POST /api/locations
 * Crea un nuevo punto de entrega (RF-V-006).
 * Solo para Vendedores.
 */
exports.createUbicacion = async (req, res) => {
    // req.user.tiendaId viene del token JWT (ver authController.js - Paso 16)
    const idVendedor = req.user.tiendaId; 

    const { Nombre_Ubicacion, Descripcion } = req.body;

    if (!Nombre_Ubicacion) {
        return res.status(400).json({ message: 'El nombre de la ubicación es obligatorio.' });
    }

    try {
        const nuevaUbicacion = await Ubicacion.create(idVendedor, req.body);
        res.status(201).json({
            message: 'Punto de entrega creado exitosamente.',
            ubicacionId: nuevaUbicacion.id
        });
    } catch (error) {
        console.error('Error en createUbicacion:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: GET /api/locations
 * Obtiene todas las ubicaciones del vendedor logueado (RF-V-006).
 * Solo para Vendedores.
 */
exports.getMyUbicaciones = async (req, res) => {
    const idVendedor = req.user.tiendaId;

    try {
        const ubicaciones = await Ubicacion.findByVendor(idVendedor);
        res.status(200).json(ubicaciones);
    } catch (error) {
        console.error('Error en getMyUbicaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: PUT /api/locations/:id
 * Actualiza una ubicación (RF-V-006).
 * Solo para Vendedores y solo si es propietario.
 */
exports.updateUbicacion = async (req, res) => {
    const { id } = req.params; // ID_Ubicacion
    const idVendedor = req.user.tiendaId;

    try {
        // 1. Verificar propiedad
        const ubicacion = await Ubicacion.findById(id);
        if (!ubicacion) {
            return res.status(404).json({ message: 'Ubicación no encontrada.' });
        }
        if (ubicacion.ID_Vendedor !== idVendedor) {
            return res.status(403).json({ message: 'No tienes permiso para modificar esta ubicación.' });
        }

        // 2. Actualizar
        const success = await Ubicacion.update(id, req.body);

        if (success) {
            res.status(200).json({ message: 'Ubicación actualizada exitosamente.' });
        } else {
            res.status(404).json({ message: 'No se pudo actualizar la ubicación.' });
        }
    } catch (error) {
        console.error('Error en updateUbicacion:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: DELETE /api/locations/:id
 * Elimina una ubicación (RF-V-006).
 * Solo para Vendedores y solo si es propietario Y no tiene pedidos activos.
 */
exports.deleteUbicacion = async (req, res) => {
    const { id } = req.params; // ID_Ubicacion
    const idVendedor = req.user.tiendaId;

    try {
        // 1. Verificar propiedad
        const ubicacion = await Ubicacion.findById(id);
        if (!ubicacion) {
            return res.status(404).json({ message: 'Ubicación no encontrada.' });
        }
        if (ubicacion.ID_Vendedor !== idVendedor) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta ubicación.' });
        }

        // 2. Verificar que no tenga pedidos activos (RF-V-006)
        const hasActiveOrders = await Ubicacion.hasActiveOrders(id);
        if (hasActiveOrders) {
            return res.status(400).json({ 
                message: 'No se puede eliminar. Esta ubicación está siendo usada por pedidos activos (Pendiente, En preparación, etc.).' 
            });
        }

        // 3. Eliminar
        const success = await Ubicacion.delete(id);
        if (success) {
            res.status(200).json({ message: 'Ubicación eliminada exitosamente.' });
        } else {
            res.status(404).json({ message: 'No se pudo eliminar la ubicación.' });
        }

    } catch (error) {
        console.error('Error en deleteUbicacion:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Endpoint: GET /api/locations/vendor/:idVendedor
 * Obtiene las ubicaciones ACTIVAS de un vendedor específico.
 * Esta ruta es para el Comprador (cuando va a hacer un pedido).
 */
exports.getVendorActiveUbicaciones = async (req, res) => {
    const { idVendedor } = req.params;

    try {
        const ubicaciones = await Ubicacion.findByVendor(idVendedor);
        
        // Filtramos solo las activas para el comprador
        const activas = ubicaciones.filter(u => u.Activa === 1); 

        res.status(200).json(activas);
    } catch (error) {
        console.error('Error en getVendorActiveUbicaciones:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
