const { pool } = require('../config/database');

class Notification {
    static async create(data) {
        const { ID_Usuario, Tipo, Mensaje, ID_Referencia } = data;
        const query = `
            INSERT INTO notificacion ("ID_Usuario", "Tipo", "Mensaje", "ID_Referencia")
            VALUES ($1, $2, $3, $4)
        `;
        try {
            await pool.query(query, [ID_Usuario, Tipo, Mensaje, ID_Referencia]);
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    static async getByUserId(userId) {
        const query = `
            SELECT * FROM notificacion 
            WHERE "ID_Usuario" = $1 
            ORDER BY "Fecha" DESC
        `;
        try {
            const { rows } = await pool.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    static async markAsRead(notificationId) {
        const query = `UPDATE notificacion SET "Leido" = TRUE WHERE "ID_Notificacion" = $1`;
        try {
            await pool.query(query, [notificationId]);
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    static async markAllAsRead(userId) {
        const query = `UPDATE notificacion SET "Leido" = TRUE WHERE "ID_Usuario" = $1`;
        try {
            await pool.query(query, [userId]);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
}

module.exports = Notification;
