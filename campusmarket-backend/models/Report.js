const { pool } = require('../config/database');

class Report {
    static async create(reportData) {
        const { ID_Pedido, ID_Emisor, ID_Receptor, Motivo, Detalles } = reportData;
        const query = `
            INSERT INTO reporte ("ID_Pedido", "ID_Emisor", "ID_Receptor", "Motivo", "Detalles")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING "ID_Reporte"
        `;
        try {
            const { rows } = await pool.query(query, [ID_Pedido, ID_Emisor, ID_Receptor, Motivo, Detalles]);
            return rows[0].ID_Reporte;
        } catch (error) {
            console.error('Error en Report.create:', error);
            throw error;
        }
    }

    static async findByOrderId(orderId) {
        const query = `SELECT * FROM reporte WHERE "ID_Pedido" = $1`;
        try {
            const { rows } = await pool.query(query, [orderId]);
            return rows;
        } catch (error) {
            console.error('Error en Report.findByOrderId:', error);
            throw error;
        }
    }
}

module.exports = Report;
