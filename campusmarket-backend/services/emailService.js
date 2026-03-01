const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, code) => {
    // Para Gmail: Host: 'smtp.gmail.com', Port: 465 (secure) o 587 (TLS)
    // Se recomienda usar Variables de Entorno (.env)

    // Configuración de transportista (Placeholder)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para otros
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"CampusMarket" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Código de Verificación - CampusMarket',
        text: `Tu código de verificación es: ${code}. Expira en 10 minutos.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4ea94b; text-align: center;">CampusMarket</h2>
                <p>Hola,</p>
                <p>Tu código de verificación para completar el registro es:</p>
                <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px;">
                    ${code}
                </div>
                <p style="margin-top: 20px;">Este código expirará en 10 minutos.</p>
                <p>Si no solicitaste este código, por favor ignora este correo.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">© 2024 CampusMarket. Todos los derechos reservados.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Correo enviado: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
        // Si no hay credenciales, al menos registramos el código en consola para pruebas
        console.log('⚠️ [DEV MODE] Código de verificación para', email, 'es:', code);
        return false;
    }
};

module.exports = { sendVerificationEmail };
