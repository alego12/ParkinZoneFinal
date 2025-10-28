import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { User } from '../models';

const router = Router();

// Generar PDF con credenciales del usuario
router.get('/user-credentials/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Buscar usuario
    const user = await User.findByPk(userId, {
      include: ['vehicles']
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Usar la contraseña existente o generar una nueva
    const userPassword = user.password || generateTempPassword();
    
    // Actualizar contraseña si no existe
    if (!user.password) {
      await user.update({ password: userPassword });
    }

    // Crear respuesta simple con credenciales (sin PDF por ahora)
    const credentials = {
      nombre: `${user.firstName} ${user.lastName}`,
      email: user.email,
      password: userPassword,
      instrucciones: [
        '1. Descarga la app móvil de Parking Zone Univalle',
        '2. Usa estas credenciales para hacer login',
        '3. Cambia tu contraseña en el primer inicio',
        '4. ¡Disfruta del servicio!'
      ]
    };

    // Configurar headers para descarga de archivo de texto
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="credenciales-${user.firstName}-${user.lastName}.txt"`);
    
    // Crear contenido del archivo
    const content = `
CREDENCIALES DE ACCESO - PARKING ZONE UNIVALLE
==============================================

INFORMACIÓN DEL USUARIO:
Nombre: ${credentials.nombre}
Email: ${credentials.email}

CREDENCIALES DE LOGIN:
Usuario: ${credentials.email}
Contraseña: ${credentials.password}

INSTRUCCIONES:
${credentials.instrucciones.join('\n')}

Generado: ${new Date().toLocaleDateString('es-BO')}
    `.trim();

    res.send(content);

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ success: false, error: 'Error generando PDF de credenciales' });
  }
});

// Función para generar contraseña temporal
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default router;
