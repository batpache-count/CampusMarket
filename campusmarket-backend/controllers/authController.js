const User = require('../models/User');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');
const path = require('path');
const { sendVerificationEmail } = require('../services/emailService');

/**
 * Helper para subir a Supabase
 */
const uploadToSupabase = async (file, prefix = 'product') => {
    const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

    const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

    return publicUrl;
};

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
    console.log('📝 [Register] Request Body:', JSON.stringify(req.body, null, 2));
    const { Nombre, Apellido_Paterno, Apellido_Materno, Email, Contrasena, Telefono, verificationCode } = req.body;

    // Validación básica
    if (!Email || !Contrasena || !Nombre || !Apellido_Paterno || !verificationCode) {
        return res.status(400).json({ message: 'Faltan campos obligatorios (Nombre, Apellidos, Email, Contraseña, Código de Verificación).' });
    }

    try {
        console.log(`🔍 [Register] Verificando código para ${Email}: ${verificationCode}`);

        // 1. Verificar el código de verificación (Case insensitive para email)
        const verifyQuery = `
            SELECT *, CURRENT_TIMESTAMP as db_now FROM email_verification 
            WHERE LOWER("Email") = LOWER($1) AND "Codigo" = $2
        `;
        const { rows: verifyRows } = await pool.query(verifyQuery, [Email, verificationCode]);

        if (verifyRows.length === 0) {
            console.log('❌ [Register] Código no encontrado en DB');
            return res.status(400).json({ message: 'Código de verificación inválido o expirado.' });
        }

        const record = verifyRows[0];
        console.log(`📊 [Register] DB Record: Code=${record.Codigo}, Expires=${record.Fecha_Expiracion}, DB Now=${record.db_now}`);

        if (new Date(record.Fecha_Expiracion) < new Date(record.db_now)) {
            console.log('❌ [Register] Código expirado');
            return res.status(400).json({ message: 'Código de verificación inválido o expirado.' });
        }

        // 2. Verificar unicidad del correo (RF-C-001)
        const existingUser = await User.findByEmail(Email);
        if (existingUser) {
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // 3. Crear el usuario (Rol por defecto: Comprador)
        const newUser = await User.create(req.body);

        // 4. Limpiar el código de verificación usado
        await pool.query('DELETE FROM email_verification WHERE "Email" = $1', [Email]);

        // 5. Si el rol es Vendedor, crear automáticamente el perfil de tienda
        if (req.body.Rol === 'Vendedor') {
            await User.becomeSeller(newUser.id, {
                Nombre_Tienda: `${Nombre} ${Apellido_Paterno}'s Store`,
                Descripcion_Tienda: 'Bienvenido a mi tienda en CampusMarket'
            });
        }

        // 6. Respuesta exitosa
        res.status(201).json({
            message: 'Registro exitoso. Por favor, inicia sesión.',
            userId: newUser.id
        });

    } catch (error) {
        console.error('❌ [Register] Error:', error);

        // Manejar error de email duplicado (Postgres Error Code 23505)
        if (error.code === '23505') {
            return res.status(400).json({
                message: 'El correo electrónico ya está registrado.'
            });
        }

        res.status(500).json({
            message: 'Error interno del servidor.',
            error: error.message
        });
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
                paypal_email: vendorProfile ? vendorProfile.PayPal_Email : null,
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
    const { Nombre, Apellido_Paterno, Apellido_Materno, Telefono, DeleteImage, PayPal_Email } = req.body;

    try {
        let updateQuery = `UPDATE usuario SET `;
        const params = [];
        let setClauses = [];
        let paramIndex = 1;

        if (Nombre) { setClauses.push(`"Nombre" = $${paramIndex++}`); params.push(Nombre); }
        if (Apellido_Paterno) { setClauses.push(`"Apellido_Paterno" = $${paramIndex++}`); params.push(Apellido_Paterno); }
        if (Apellido_Materno) { setClauses.push(`"Apellido_Materno" = $${paramIndex++}`); params.push(Apellido_Materno); }
        if (Telefono) { setClauses.push(`"Telefono" = $${paramIndex++}`); params.push(Telefono); }

        // Manejo de Imagen
        if (req.file) {
            const Imagen_URL = await uploadToSupabase(req.file, 'user-profile');
            setClauses.push(`"Imagen_URL" = $${paramIndex++}`);
            params.push(Imagen_URL);
        } else if (DeleteImage === 'true') {
            setClauses.push(`"Imagen_URL" = NULL`);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ message: 'No hay datos para actualizar.' });
        }

        updateQuery += setClauses.join(', ') + ` WHERE "ID_Usuario" = $${paramIndex}`;
        params.push(userId);

        await pool.query(updateQuery, params);

        // Actualizar PayPal_Email si es Vendedor
        if (req.user.rol === 'Vendedor' && PayPal_Email !== undefined) {
            await pool.query('UPDATE vendedor SET "PayPal_Email" = $1 WHERE "ID_Usuario" = $2', [PayPal_Email, userId]);
        }

        // Retornar usuario actualizado
        const updatedUser = await User.findById(userId);
        const vendorProfile = updatedUser.Rol === 'Vendedor' ? await User.findVendorProfileByUserId(userId) : null;

        res.json({
            message: 'Perfil actualizado',
            user: {
                id: updatedUser.ID_Usuario,
                nombre: updatedUser.Nombre,
                apellido_paterno: updatedUser.Apellido_Paterno,
                apellido_materno: updatedUser.Apellido_Materno,
                email: updatedUser.Email,
                telefono: updatedUser.Telefono,
                rol: updatedUser.Rol,
                tiendaId: vendorProfile ? vendorProfile.ID_Vendedor : null,
                paypal_email: vendorProfile ? vendorProfile.PayPal_Email : null,
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
        const { rows } = await pool.query('SELECT "Contrasena" FROM usuario WHERE "ID_Usuario" = $1', [userId]);

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

        await pool.query('UPDATE usuario SET "Contrasena" = $1 WHERE "ID_Usuario" = $2', [hashedNewPassword, userId]);

        res.json({ message: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
/**
 * Genera y envía un código de verificación por correo
 */
exports.sendVerificationCode = async (req, res) => {
    const { Email } = req.body;

    if (!Email) {
        return res.status(400).json({ message: 'Se requiere un correo electrónico.' });
    }

    try {
        console.log(`📡 [SendCode] Generando código para: ${Email}`);

        // 1. Verificar si el usuario ya existe (Case insensitive)
        const queryCheck = 'SELECT 1 FROM usuario WHERE LOWER("Email") = LOWER($1)';
        const { rows: userExists } = await pool.query(queryCheck, [Email]);

        if (userExists.length > 0) {
            return res.status(409).json({ message: 'Este correo ya está registrado.' });
        }

        // 2. Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        // 3. Guardar en la base de datos (Upsert) - Guardamos en minúsculas para consistencia
        const upsertQuery = `
            INSERT INTO email_verification ("Email", "Codigo", "Fecha_Expiracion")
            VALUES (LOWER($1), $2, $3)
            ON CONFLICT ("Email") DO UPDATE 
            SET "Codigo" = $2, "Fecha_Expiracion" = $3
        `;
        await pool.query(upsertQuery, [Email, code, expiresAt]);
        console.log(`💾 [SendCode] Código ${code} guardado para ${Email.toLowerCase()}`);

        // 4. Enviar correo
        const sent = await sendVerificationEmail(Email, code);

        if (sent) {
            res.status(200).json({ message: 'Código enviado con éxito.' });
        } else {
            res.status(500).json({ message: 'Error al enviar el correo, pero el código fue generado.', devMode: true });
        }

    } catch (error) {
        console.error('Error enviando código:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * Verifica un código manualmente (opcional, el registro ya lo hace)
 */
exports.verifyCode = async (req, res) => {
    const { Email, Codigo } = req.body;

    if (!Email || !Codigo) {
        return res.status(400).json({ message: 'Se requiere Email y Código.' });
    }

    try {
        const query = `
            SELECT * FROM email_verification 
            WHERE "Email" = $1 AND "Codigo" = $2 AND "Fecha_Expiracion" > CURRENT_TIMESTAMP
        `;
        const { rows } = await pool.query(query, [Email, Codigo]);

        if (rows.length > 0) {
            res.status(200).json({ message: 'Código válido.', valid: true });
        } else {
            res.status(400).json({ message: 'Código inválido o expirado.', valid: false });
        }
    } catch (error) {
        console.error('Error verificando código:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};
