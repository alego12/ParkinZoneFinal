import { Router, Response } from 'express';
import { body } from 'express-validator';
import { User } from '../models/User';
import { ParkingSpace } from '../models/ParkingSpace';
import { Reservation } from '../models/Reservation';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { hashPassword } from '../utils/bcrypt';

const router = Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // User statistics
    const totalUsers = await User.count();
    const totalClients = await User.count({ where: { role: 'client' } });
    const totalEmployees = await User.count({ 
      where: { role: { [require('sequelize').Op.in]: ['admin', 'security'] } } 
    });

    // Parking statistics
    const totalSpaces = await ParkingSpace.count({ where: { isActive: true } });
    const availableSpaces = await ParkingSpace.count({ 
      where: { status: 'available', isActive: true } 
    });
    const occupiedSpaces = await ParkingSpace.count({ 
      where: { status: 'occupied', isActive: true } 
    });

    // Revenue statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenue = await Reservation.sum('totalAmount', {
      where: {
        status: 'completed',
        createdAt: { [require('sequelize').Op.gte]: thirtyDaysAgo }
      }
    });

    // Recent reservations
    const recentReservations = await Reservation.findAll({
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
        { model: ParkingSpace, as: 'parkingSpace', attributes: ['spaceNumber'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({
      statistics: {
        users: { total: totalUsers, clients: totalClients, employees: totalEmployees },
        parking: { total: totalSpaces, available: availableSpaces, occupied: occupiedSpaces },
        revenue: revenue || 0,
      },
      recentReservations,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create user (employee)
router.post('/users', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').notEmpty().trim(),
  body('role').isIn(['admin', 'security', 'cashier']),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role,
      isActive: true,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, requireAdmin, [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phone').optional().notEmpty().trim(),
  body('role').optional().isIn(['admin', 'security', 'client']),
  body('isActive').optional().isBoolean(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone || user.phone,
      role: role || user.role,
      isActive: isActive !== undefined ? isActive : user.isActive,
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Don't allow deleting self
    if (parseInt(id) === req.user!.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// (Admin LPR endpoints removed)

// Get all reservations
router.get('/reservations', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: reservations } = await Reservation.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] },
        { model: ParkingSpace, as: 'parkingSpace', attributes: ['spaceNumber', 'zone'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({
      reservations,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
