const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.getByUserId(req.user.ID_Usuario);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener notificaciones.' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await Notification.markAsRead(req.params.id);
        res.status(200).json({ message: 'Notificación marcada como leída.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar notificación.' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.markAllAsRead(req.user.ID_Usuario);
        res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar notificaciones.' });
    }
};
