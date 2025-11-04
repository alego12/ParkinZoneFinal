import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { body } from 'express-validator';
import { QueryTypes } from 'sequelize';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import sequelize from '../config/database';
import { sendEmail } from '../utils/mailer';

const router = Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').optional({ nullable: true }).isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').notEmpty().trim(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { email, password = null, firstName, lastName, phone, role = 'client' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password only if provided
    const hashedPassword = password ? await hashPassword(password) : null;

    // Create user (password can be null for security-created users)
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role,
      isActive: true,
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is disabled' });
    }

    // Verify password
      // If user has no password set (created by security), disallow password login
      if (!user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phone').optional().notEmpty().trim(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = req.user!;

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone || user.phone,
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

// Forgot Password - send 6-digit code via email (expires in 15 minutes)
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    const user = await User.findOne({ where: { email } });
    // For privacy, always respond ok even if user not found
    if (!user) {
      return res.json({ message: 'If the email exists, a code has been sent' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in password_resets (expiresAt computed by DB to avoid timezone issues)
    await sequelize.query(
      'INSERT INTO password_resets (userId, code, expiresAt, createdAt, updatedAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW(), NOW())',
      { replacements: [user.id, code], type: QueryTypes.INSERT }
    );

    // Send email with attachment (.txt)
    const subject = 'Código de recuperación de contraseña';
    const text = `Tu código de recuperación es: ${code}. Expira en 15 minutos.`;
    const html = `<p>Tu código de recuperación es: <strong>${code}</strong>.</p><p>Expira en 15 minutos.</p>`;
    const requestedAt = new Date();
    const expiresAt = new Date(requestedAt.getTime() + 15*60*1000);
    const infoTxt = [
      'ParkingZone - Recuperación de contraseña',
      `Email: ${user.email}`,
      `Código: ${code}`,
      `Solicitado: ${requestedAt.toISOString()}`,
      `Expira: ${expiresAt.toISOString()}`,
      `IP origen: ${req.ip || 'desconocida'}`,
      ''
    ].join('\n');
    // Try to send email (best-effort, can be disabled via env)
    const sendEmails = (process.env.SEND_RESET_EMAIL || '').toLowerCase() !== 'false';
    const hasSmtp = Boolean(process.env.SMTP_USER) && Boolean(process.env.SMTP_PASS);
    if (sendEmails && hasSmtp) {
      try {
        await sendEmail(
          user.email,
          subject,
          text,
          html,
          [
            {
              filename: 'reset_info.txt',
              content: infoTxt,
              contentType: 'text/plain; charset=utf-8',
            },
          ]
        );
      } catch (e) {
        console.error('Send reset code email error (continuing with local file export):', e);
      }
    } else {
      console.log('Email sending disabled or SMTP not configured. Skipping send for forgot-password.');
    }

    // Always export a local TXT file for dev/testing (no SMTP)
    let infoFilePath: string | null = null;
    try {
      const outDir = path.join(process.cwd(), 'reset_exports');
      fs.mkdirSync(outDir, { recursive: true });
      const safeEmail = String(user.email).replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `reset_${safeEmail}_${requestedAt.getTime()}.txt`;
      infoFilePath = path.join(outDir, fileName);
      fs.writeFileSync(infoFilePath, infoTxt, 'utf8');
    } catch (e) {
      console.error('Failed to write local reset TXT:', e);
    }

    // Console log for local testing visibility
    console.log(`[ForgotPassword] Email: ${user.email} | Code: ${code} | File: ${infoFilePath || 'N/A'}`);

    // Return debug info when enabled or in non-production
    const payload: any = { message: 'If the email exists, a code has been sent' };
    if (process.env.SHOW_RESET_CODE === 'true' || process.env.NODE_ENV !== 'production') {
      payload.debug = { code, infoFilePath };
    }
    return res.json(payload);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Dev helper: serve the latest reset TXT for a given email
router.get('/forgot-password/latest-export', async (req: Request, res: Response) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }
    const outDir = path.join(process.cwd(), 'reset_exports');
    if (!fs.existsSync(outDir)) {
      return res.status(404).json({ message: 'No exports directory' });
    }
    const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, '_');
    const files = fs
      .readdirSync(outDir)
      .filter(f => f.startsWith(`reset_${safeEmail}_`) && f.endsWith('.txt'))
      .map(f => ({ f, t: Number(f.split('_').pop()?.replace('.txt','')) || 0 }))
      .sort((a, b) => b.t - a.t);
    if (files.length === 0) {
      return res.status(404).json({ message: 'No export found for this email' });
    }
    const filePath = path.join(outDir, files[0].f);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${files[0].f}`);
    return res.send(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('latest-export error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset Password - verify code and set new password
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 }),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body as { email: string; code: string; newPassword: string };
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid code or email' });
    }

    // Fetch latest matching code not used and not expired
    const [rows]: any = await sequelize.query(
      `SELECT * FROM password_resets 
       WHERE userId = ? AND code = ? AND usedAt IS NULL AND expiresAt > NOW()
       ORDER BY createdAt DESC LIMIT 1`,
      { replacements: [user.id, code] }
    );
    const reset = rows?.[0];
    if (!reset) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Update user password
    const hashed = await hashPassword(newPassword);
    await user.update({ password: hashed });

    // Mark code as used
    await sequelize.query(
      'UPDATE password_resets SET usedAt = NOW(), updatedAt = NOW() WHERE id = ? LIMIT 1',
      { replacements: [reset.id] }
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
