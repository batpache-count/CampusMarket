const User = require('../models/User');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT para el usuario.
 * El token incluye el ID del usuario y su ROL.
 */
const generateToken = (user, vendorProfile) => {
    const payload = {
        id: user.ID_Usuario,
        rol: user.Rol,
        email: user.Email,
    };

    // Si es vendedor, añadimos su ID de Vendedor al token
    if (vendorProfile) {
        payload.tiendaId = vendorProfile.ID_Vendedor;
        payload.nombreTienda = vendorProfile.Nombre_Tienda;
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1d' // El token expira en 1 día
    });
};


/**
 * Maneja el registro de un nuevo usuario (RF-C-001)
 * Endpoint: POST /api/auth/register
 */
exports.register = async (req, res) => {
    const { Nombre, Apellido_Paterno, Apellido_Materno, Email, Contrasena, Telefono } = req.body;

    // Validación básica
    if (!Email || !Contrasena || !Nombre || !Apellido_Paterno) {
        return res.status(400).json({ message: 'Faltan campos obligatorios (Nombre, Apellidos, Email, Contraseña).' });
    }

    // Validación de dominio institucional (RF-S-001)
    /* if (!Email.endsWith('@utm.edu.mx')) {
        return res.status(400).json({ message: 'El registro está restringido a correos institucionales (@utm.edu.mx).' });
    } */

    try {
        // 1. Verificar unicidad del correo (RF-C-001)
        const existingUser = await User.findByEmail(Email);
        if (existingUser) {
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // 2. Crear el usuario (Rol por defecto: Comprador)
        const newUser = await User.create(req.body);

        // 3. Si el rol es Vendedor, crear automáticamente el perfil de tienda
        if (req.body.Rol === 'Vendedor') {
            await User.becomeSeller(newUser.id, {
                Nombre_Tienda: `${Nombre} ${Apellido_Paterno}'s Store`,
                Descripcion_Tienda: 'Bienvenido a mi tienda en CampusMarket'
            });
        }

        // 3. Respuesta exitosa
        res.status(201).json({
            message: 'Registro exitoso. Por favor, inicia sesión.',
            userId: newUser.id
        });

    } catch (error) {
        console.error('Error en /register:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


/**
 * Maneja el inicio de sesión de un usuario.
 * Endpoint: POST /api/auth/login
 */
exports.login = async (req, res) => {
    const { Email, Contrasena } = req.body;

    if (!Email || !Contrasena) {
        return res.status(400).json({ message: 'Se requiere Email y Contraseña.' });
    }

    try {
        // 1. Buscar usuario por email
        const user = await User.findByEmail(Email);
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' }); // Usuario no encontrado
        }

        // 2. Comparar la contraseña ingresada con la hasheada en la DB
        const isMatch = await bcrypt.compare(Contrasena, user.Contrasena);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' }); // Contraseña incorrecta
        }

        // 3. Si el usuario es Vendedor, buscar su perfil de tienda
        let vendorProfile = null;
        if (user.Rol === 'Vendedor') {
            vendorProfile = await User.findVendorProfileByUserId(user.ID_Usuario);

            // FIX: Si es Vendedor pero no tiene perfil (usuario roto), crearlo ahora.
            if (!vendorProfile) {
                vendorProfile = await User.becomeSeller(user.ID_Usuario, {
                    Nombre_Tienda: `${user.Nombre} ${user.Apellido_Paterno}'s Store`,
                    Descripcion_Tienda: 'Bienvenido a mi tienda en CampusMarket'
                });
            }
        }

        // 4. Generar Token JWT
        const token = generateToken(user, vendorProfile);

        // 5. Respuesta Exitosa
        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token,
            user: {
                id: user.ID_Usuario,
                nombre: user.Nombre,
                apellido_paterno: user.Apellido_Paterno,
                apellido_materno: user.Apellido_Materno,
                email: user.Email,
                telefono: user.Telefono,
                rol: user.Rol,
                tiendaId: vendorProfile ? vendorProfile.ID_Vendedor : null,
                imagen_url: user.Imagen_URL
            }
        });

    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Actualizar perfil de usuario
 * Endpoint: PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
    const userId = req.user.ID_Usuario;
    const { Nombre, Apellido_Paterno, Apellido_Materno, Telefono, DeleteImage } = req.body;

    try {
        let updateQuery = `
            UPDATE usuario 
            SET Nombre = ?, Apellido_Paterno = ?, Apellido_Materno = ?, Telefono = ?
        `;
        const params = [Nombre, Apellido_Paterno, Apellido_Materno, Telefono];

        // Manejo de Imagen
        if (req.file) {
            updateQuery += `, Imagen_URL = ?`;
            params.push(req.file.filename);
        } else if (DeleteImage === 'true') {
            updateQuery += `, Imagen_URL = NULL`;
        }

        updateQuery += ` WHERE ID_Usuario = ?`;
        params.push(userId);

        await pool.query(updateQuery, params);

        // Retornar usuario actualizado
        const updatedUser = await User.findById(userId);
        res.json({
            message: 'Perfil actualizado',
            user: {
                id: updatedUser.ID_Usuario,
                nombre: updatedUser.Nombre,
                apellido_paterno: updatedUser.Apellido_Paterno,
                apellido_materno: updatedUser.Apellido_Materno, // Se añadió al modelo si no estaba
                email: updatedUser.Email,
                telefono: updatedUser.Telefono,
                rol: updatedUser.Rol,
                imagen_url: updatedUser.Imagen_URL
            }
        });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            message: 'Error al actualizar perfil: ' + error.message,
            stack: error.stack
        });
    }
};
/**
 * Cambiar contraseña
 * Endpoint: POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    const userId = req.user.ID_Usuario;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Se requiere la contraseña actual y la nueva.' });
    }

    try {
        const [rows] = await pool.query('SELECT Contrasena FROM usuario WHERE ID_Usuario = ?', [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.Contrasena);
        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE usuario SET Contrasena = ? WHERE ID_Usuario = ?', [hashedNewPassword, userId]);

        res.json({ message: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
