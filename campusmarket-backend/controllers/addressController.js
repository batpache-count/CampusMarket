const { pool } = require('../config/database');

/**
 * Obtener direcciones del usuario (RF-C-00x)
 */
exports.getAddresses = async (req, res) => {
    const userId = req.user.ID_Usuario;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM direccion_usuario WHERE ID_Usuario = ?',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo direcciones:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Agregar dirección
 */
exports.addAddress = async (req, res) => {
    const userId = req.user.ID_Usuario;
    const { Titulo, Calle, Referencias } = req.body;

    if (!Titulo || !Calle) {
        return res.status(400).json({ message: 'Título y Calle son obligatorios.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO direccion_usuario (ID_Usuario, Titulo, Calle, Referencias) VALUES (?, ?, ?, ?)',
            [userId, Titulo, Calle, Referencias]
        );
        res.status(201).json({ id: result.insertId, message: 'Dirección guardada.' });
    } catch (error) {
        console.error('Error agregando dirección:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Eliminar dirección
 */
exports.deleteAddress = async (req, res) => {
    const userId = req.user.ID_Usuario;
    const { id } = req.params;

    try {
        await pool.query(
            'DELETE FROM direccion_usuario WHERE ID_Direccion = ? AND ID_Usuario = ?',
            [id, userId]
        );
        res.json({ message: 'Dirección eliminada.' });
    } catch (error) {
        console.error('Error eliminando dirección:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
