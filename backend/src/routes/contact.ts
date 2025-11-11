import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { sendEmail } from '../utils/mailer';

const router = Router();

// Contact form submission
router.post('/', [
  body('name').notEmpty().trim().withMessage('El nombre es requerido'),
  body('email').isEmail().normalizeEmail().withMessage('El email es inválido'),
  body('subject').notEmpty().trim().withMessage('El asunto es requerido'),
  body('message').notEmpty().trim().withMessage('El mensaje es requerido'),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message, devMode } = req.body;
    const systemEmail = process.env.SMTP_USER || 'ruedanegociosbeni@gmail.com';

    // Mapeo de asuntos para el correo
    const subjectLabels: { [key: string]: string } = {
      'queja': 'Queja',
      'sugerencia': 'Sugerencia',
      'soporte': 'Soporte Técnico',
      'otro': 'Otro'
    };
    const subjectLabel = subjectLabels[subject] || subject;

    // 1. Enviar correo de agradecimiento al usuario
    const thankYouSubject = 'Gracias por contactarnos - ParkingZone';
    const thankYouText = `Hola ${name},\n\nGracias por contactarnos. Hemos recibido tu ${subjectLabel.toLowerCase()} y te responderemos pronto.\n\nDetalles de tu mensaje:\nAsunto: ${subjectLabel}\nMensaje: ${message}\n\nSaludos,\nEquipo ParkingZone`;
    const thankYouHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🅿 ParkingZone</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #2563eb; margin-top: 0;">¡Gracias por contactarnos!</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hola <strong>${name}</strong>,</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Gracias por contactarnos. Hemos recibido tu ${subjectLabel.toLowerCase()} y te responderemos pronto.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <p style="margin-top: 0; color: #1f2937; font-weight: 600;">Detalles de tu mensaje:</p>
            <p style="color: #4b5563; margin: 8px 0;"><strong>Asunto:</strong> ${subjectLabel}</p>
            <p style="color: #4b5563; margin: 8px 0;"><strong>Mensaje:</strong></p>
            <p style="color: #4b5563; white-space: pre-wrap; background-color: #ffffff; padding: 12px; border-radius: 4px; margin-top: 8px;">${message}</p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Nuestro equipo revisará tu mensaje y te responderá a la brevedad posible.</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Saludos,<br/><strong style="color: #2563eb;">Equipo ParkingZone</strong></p>
        </div>
      </div>
    `;

    // 2. Enviar notificación al correo del sistema
    const notificationSubject = `Nuevo mensaje de contacto - ${subjectLabel}`;
    const notificationText = `Has recibido un nuevo mensaje de contacto:\n\nNombre: ${name}\nEmail: ${email}\nAsunto: ${subjectLabel}\nMensaje:\n${message}\n\nFecha: ${new Date().toLocaleString('es-BO')}`;
    const notificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🅿 ParkingZone - Notificación</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #dc2626; margin-top: 0;">Nuevo mensaje de contacto</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Has recibido un nuevo mensaje a través del formulario de contacto:</p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #dc2626;">
            <p style="margin-top: 0; color: #1f2937; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Información del contacto</p>
            <p style="color: #4b5563; margin: 10px 0;"><strong style="color: #1f2937;">Nombre:</strong> ${name}</p>
            <p style="color: #4b5563; margin: 10px 0;"><strong style="color: #1f2937;">Email:</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></p>
            <p style="color: #4b5563; margin: 10px 0;"><strong style="color: #1f2937;">Asunto:</strong> <span style="background-color: #fee2e2; padding: 4px 8px; border-radius: 4px; color: #991b1b; font-size: 13px;">${subjectLabel}</span></p>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin-top: 0; color: #1f2937; font-weight: 600;">Mensaje:</p>
            <p style="color: #4b5563; white-space: pre-wrap; background-color: #ffffff; padding: 15px; border-radius: 4px; margin-top: 10px; line-height: 1.6;">${message}</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Fecha: ${new Date().toLocaleString('es-BO', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</p>
        </div>
      </div>
    `;

    // Si está en modo desarrollo, devolver archivos en lugar de enviar correos
    if (devMode) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Crear contenido de los archivos
      const thankYouFileContent = `ParkingZone - Correo de Agradecimiento
========================================

Para: ${email}
Asunto: ${thankYouSubject}
Fecha: ${new Date().toLocaleString('es-BO')}

${thankYouText}

---
Este es un archivo generado en modo desarrollo.
En producción, este correo sería enviado automáticamente a ${email}.
`;

      const notificationFileContent = `ParkingZone - Notificación de Contacto
========================================

Para: ${systemEmail}
Asunto: ${notificationSubject}
Fecha: ${new Date().toLocaleString('es-BO')}

${notificationText}

---
Este es un archivo generado en modo desarrollo.
En producción, este correo sería enviado automáticamente a ${systemEmail}.
`;

      // Devolver ambos archivos como JSON con base64
      return res.json({
        message: 'Mensaje procesado en modo desarrollo. Archivos generados.',
        devMode: true,
        files: {
          thankYou: {
            filename: `agradecimiento_${safeEmail}_${timestamp}.txt`,
            content: Buffer.from(thankYouFileContent, 'utf-8').toString('base64'),
            mimeType: 'text/plain'
          },
          notification: {
            filename: `notificacion_${safeEmail}_${timestamp}.txt`,
            content: Buffer.from(notificationFileContent, 'utf-8').toString('base64'),
            mimeType: 'text/plain'
          }
        }
      });
    }

    // Enviar ambos correos (modo producción)
    const emailPromises = [
      sendEmail(email, thankYouSubject, thankYouText, thankYouHtml),
      sendEmail(systemEmail, notificationSubject, notificationText, notificationHtml)
    ];

    await Promise.all(emailPromises);

    return res.json({ 
      message: 'Mensaje enviado exitosamente. Te contactaremos pronto.' 
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return res.status(500).json({ 
      message: 'Error al enviar el mensaje. Inténtalo de nuevo.' 
    });
  }
});

export default router;

