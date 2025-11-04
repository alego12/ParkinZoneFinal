import { Router, Response, Request } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { CashCloseout } from '../models/CashCloseout';
import { Payment } from '../models/Payment';
import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';

const router = Router();

// Preview closeout for current cashier: totals for payments not yet assigned to a closeout
router.post('/preview', authenticateToken, requireRole(['cashier']), async (req: AuthRequest, res: Response) => {
  try {
    const cashierId = req.user!.id;
    const { from, to } = req.body as { from?: string; to?: string };

    // Range: optional custom range, default = from last closeout end to now
    let fromAt: Date | undefined;
    let toAt: Date = to ? new Date(to) : new Date();

    if (from) {
      fromAt = new Date(from);
    } else {
      const lastClose = await CashCloseout.findOne({
        where: { closedBy: cashierId },
        order: [['toAt','DESC']],
      });
      if (lastClose) fromAt = new Date(lastClose.toAt);
    }

    const where: any = { recordedBy: cashierId, closeoutId: { [Op.is]: null } };
    if (fromAt) where.createdAt = { [Op.gte]: fromAt };
    if (toAt) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: toAt };

    const payments = await Payment.findAll({ where });

    const totalCash = payments.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0);
    const totalQR = payments.filter(p => p.method === 'qr').reduce((s, p) => s + Number(p.amount), 0);
    const totalCard = payments.filter(p => p.method === 'card').reduce((s, p) => s + Number(p.amount), 0);
    const totalOverall = totalCash + totalQR + totalCard;

    return res.json({
      range: { fromAt: fromAt?.toISOString() || null, toAt: toAt.toISOString() },
      counts: { total: payments.length },
      totals: { totalCash, totalQR, totalCard, totalOverall },
      payments: payments.map(p => ({ id: p.id, amount: p.amount, method: p.method, createdAt: p.createdAt })),
    });
  } catch (error) {
    console.error('Preview closeout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Confirm closeout: creates record and assigns payments to it
router.post('/confirm', authenticateToken, requireRole(['cashier']), [
  body('from').optional().isString(),
  body('to').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  const t: Transaction = await sequelize.transaction();
  try {
    const cashierId = req.user!.id;
    const { from, to, notes } = req.body as { from?: string; to?: string; notes?: string };

    let fromAt: Date | undefined;
    let toAt: Date = to ? new Date(to) : new Date();

    if (from) {
      fromAt = new Date(from);
    } else {
      const lastClose = await CashCloseout.findOne({ where: { closedBy: cashierId }, order: [['toAt','DESC']] });
      if (lastClose) fromAt = new Date(lastClose.toAt);
    }

    const where: any = { recordedBy: cashierId, closeoutId: { [Op.is]: null } };
    if (fromAt) where.createdAt = { [Op.gte]: fromAt };
    if (toAt) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: toAt };

    const payments = await Payment.findAll({ where, transaction: t, lock: t.LOCK.UPDATE });

    const totalCash = payments.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0);
    const totalQR = payments.filter(p => p.method === 'qr').reduce((s, p) => s + Number(p.amount), 0);
    const totalCard = payments.filter(p => p.method === 'card').reduce((s, p) => s + Number(p.amount), 0);
    const totalOverall = totalCash + totalQR + totalCard;

    const closeout = await CashCloseout.create({
      fromAt: fromAt || payments[payments.length - 1]?.createdAt || new Date(),
      toAt,
      totalCash,
      totalQR,
      totalCard,
      totalOverall,
      closedBy: cashierId,
      closedAt: new Date(),
      notes: notes || null,
    }, { transaction: t });

    if (payments.length > 0) {
      const ids = payments.map(p => p.id);
      await Payment.update({ closeoutId: closeout.id }, { where: { id: { [Op.in]: ids } }, transaction: t });
    }

    await t.commit();
    return res.status(201).json({ message: 'Cash closeout created', closeout });
  } catch (error) {
    await t.rollback();
    console.error('Confirm closeout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// List closeouts (admin)
router.get('/', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { from, to, cashierId, page = '1', limit = '20' } = req.query as any;

    const where: any = {};
    if (cashierId) where.closedBy = Number(cashierId);
    if (from || to) {
      where.toAt = {} as any;
      if (from) where.toAt[Op.gte] = new Date(from);
      if (to) where.toAt[Op.lte] = new Date(to);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await CashCloseout.findAndCountAll({
      where,
      order: [['toAt','DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      closeouts: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(count / limitNum),
      }
    });
  } catch (error) {
    console.error('List closeouts error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get closeout details (admin)
router.get('/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any;
    const closeout = await CashCloseout.findByPk(id);
    if (!closeout) return res.status(404).json({ message: 'Cash closeout not found' });

    const payments = await Payment.findAll({ where: { closeoutId: closeout.id }, order: [['createdAt','DESC']] });

    return res.json({ closeout, payments });
  } catch (error) {
    console.error('Get closeout details error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
