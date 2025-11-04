import { Router, Response, Request } from 'express';
import { body } from 'express-validator';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { Payment } from '../models/Payment';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import { handleValidationErrors } from '../middleware/validation';
import { Op } from 'sequelize';

const router = Router();

// Only cashier and admin can record payments
router.post('/', authenticateToken, requireRole(['cashier','admin']), [
  body('reservationId').isInt({ min: 1 }),
  body('amount').isFloat({ gt: 0 }),
  body('method').isIn(['cash','qr','card']),
  body('reference').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { reservationId, amount, method, reference, notes } = req.body as {
      reservationId: number;
      amount: number;
      method: 'cash'|'qr'|'card';
      reference?: string;
      notes?: string;
    };

    const recordedBy = req.user!.id;

    const reservation = await Reservation.findByPk(reservationId, { include: [{ model: User, as: 'user' }] });
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const payment = await Payment.create({
      userId: reservation.userId,
      reservationId: reservation.id,
      amount: parseFloat(amount as any),
      method,
      reference: reference || null,
      notes: notes || null,
      recordedBy,
    });

    return res.status(201).json({ message: 'Payment recorded', payment });
  } catch (error: any) {
    console.error('Create payment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List payments (admin) with filters and pagination
router.get('/', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { from, to, method, recordedBy, closed, page = '1', limit = '20' } = req.query as any;

    const where: any = {};
    if (method) where.method = method;
    if (recordedBy) where.recordedBy = Number(recordedBy);
    if (typeof closed !== 'undefined') {
      const isClosed = String(closed) === 'true' || String(closed) === '1';
      where.closeoutId = isClosed ? { [Op.not]: null } : { [Op.is]: null };
    }
    if (from || to) {
      where.createdAt = {} as any;
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      order: [['createdAt','DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      payments: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      }
    });
  } catch (error) {
    console.error('List payments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List my payments (cashier)
router.get('/mine', authenticateToken, requireRole(['cashier']), async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, method, closed, page = '1', limit = '20' } = req.query as any;

    const where: any = { recordedBy: req.user!.id };
    if (method) where.method = method;
    if (typeof closed !== 'undefined') {
      const isClosed = String(closed) === 'true' || String(closed) === '1';
      where.closeoutId = isClosed ? { [Op.not]: null } : { [Op.is]: null };
    }
    if (from || to) {
      where.createdAt = {} as any;
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      order: [['createdAt','DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      payments: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      }
    });
  } catch (error) {
    console.error('List my payments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
