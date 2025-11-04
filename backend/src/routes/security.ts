import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';
import { Vehicle } from '../models/Vehicle';
import { User } from '../models/User';
import { ParkingSpace } from '../models/ParkingSpace';
import { Reservation } from '../models/Reservation';
import { Schedule } from '../models/Schedule';
import { Payment } from '../models/Payment';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { hashPassword } from '../utils/bcrypt';
import sequelize from '../config/database';
import { sendEmail } from '../utils/mailer';

const router = Router();

// Middleware to ensure only security, cashier and admin can access
router.use(authenticateToken, requireRole(['security', 'cashier', 'admin']));

// Get all vehicles for security (LPR system needs to search all vehicles)
router.get('/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await Vehicle.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ vehicles });
  } catch (error) {
    console.error('Get vehicles for security error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Prepare checkout: compute amount without changing state
router.post('/parking/spaces/:id/prepare-checkout', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const space = await ParkingSpace.findByPk(id, { include: [{ model: Schedule, as: 'schedule' }] });
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    const reservation = await Reservation.findOne({
      where: { parkingSpaceId: id, status: { [Op.in]: ['active', 'occupied'] } },
      include: [
        { model: User, as: 'user', attributes: ['firstName','lastName','email'] },
        { model: Vehicle, as: 'vehicle', attributes: ['model','plate','color','type'] },
      ],
      order: [['startTime','DESC']]
    });
    if (!reservation) return res.status(404).json({ message: 'Active/occupied reservation not found' });

    // Compute approximate amount: base rate x hours (ceil at least 1)
    const now = new Date();
    const startTime = new Date(reservation.startTime);
    const durationHours = Math.max(1, Math.ceil((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)));
    const baseRate = reservation.vehicleId ? (space.carRate || 0) : (space.carRate || 0);
    const amount = Number((durationHours * baseRate).toFixed(2));

    return res.json({
      message: 'Checkout prepared',
      reservation,
      suggestedAmount: amount,
      durationHours,
      baseRate,
    });
  } catch (error) {
    console.error('Prepare checkout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Atomic checkout: complete reservation, free space, create payment (transactional)
// Only cashier and admin can perform checkout
router.post('/parking/spaces/:id/checkout', authenticateToken, requireRole(['cashier','admin']), [
  body('method').isIn(['cash','qr','card']),
  body('amount').isFloat({ gt: 0 }),
  body('reference').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { method, amount, reference, notes } = req.body as { method: 'cash'|'qr'|'card'; amount: number; reference?: string; notes?: string };

    const space = await ParkingSpace.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!space) { await t.rollback(); return res.status(404).json({ message: 'Parking space not found' }); }

    const reservation = await Reservation.findOne({
      where: { parkingSpaceId: id, status: { [Op.in]: ['active', 'occupied'] } },
      order: [['startTime','DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!reservation) { await t.rollback(); return res.status(404).json({ message: 'Active/occupied reservation not found' }); }

    const endTime = new Date();
    const updatedReservation = await reservation.update({ status: 'completed', endTime, totalAmount: parseFloat(amount as any), paymentStatus: 'paid' }, { transaction: t });

    await space.update({ status: 'available' }, { transaction: t });

    const payment = await Payment.create({
      userId: updatedReservation.userId,
      reservationId: updatedReservation.id,
      amount: parseFloat(amount as any),
      method,
      reference: reference || null,
      notes: notes || 'Pago desde checkout',
      recordedBy: req.user!.id,
    }, { transaction: t });

    await t.commit();
    return res.json({ message: 'Checkout completed', reservation: updatedReservation, payment, space: { id: space.id, status: 'available' } });
  } catch (error) {
    try { await t.rollback(); } catch {}
    console.error('Checkout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
// Create client + vehicle + reservation atomically
router.post('/clients/with-vehicle-reservation', [
  body('user.firstName').notEmpty().trim().withMessage('Nombre es requerido'),
  body('user.lastName').notEmpty().trim().withMessage('Apellido es requerido'),
  body('user.email').isEmail().normalizeEmail().withMessage('Email válido es requerido'),
  body('user.phone').notEmpty().trim().withMessage('Teléfono es requerido'),
  body('vehicle.plate').notEmpty().trim().withMessage('Placa es requerida'),
  body('vehicle.model').notEmpty().trim().withMessage('Modelo es requerido'),
  body('vehicle.color').notEmpty().trim().withMessage('Color es requerido'),
  body('vehicle.type').optional().isIn(['car','motorcycle']).withMessage('Tipo inválido'),
  body('reservation.parkingSpaceId').isInt().withMessage('parkingSpaceId es requerido'),
  body('reservation.startTime').notEmpty().withMessage('startTime es requerido'),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const securityUserId = req.user?.id;
    const { user: userData, vehicle: vehicleData, reservation: reservationData } = req.body;

    // Pre-checks
    const existingUser = await User.findOne({ where: { email: userData.email }, transaction: t, lock: t.LOCK.UPDATE });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ message: 'Usuario con este email ya existe' });
    }
    const existingVehicle = await Vehicle.findOne({ where: { plate: vehicleData.plate }, transaction: t, lock: t.LOCK.UPDATE });
    if (existingVehicle) {
      await t.rollback();
      return res.status(400).json({ message: 'Vehículo con esta placa ya existe' });
    }

    // Create user (role client)
    const plainPassword = userData.password || 'temp123';
    const hashedPassword = await hashPassword(plainPassword);
    const user = await User.create({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      password: hashedPassword,
      role: 'client',
      isActive: true,
    }, { transaction: t });

    // Validate parking space
    const space = await ParkingSpace.findByPk(reservationData.parkingSpaceId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!space) {
      await t.rollback();
      return res.status(404).json({ message: 'Parking space not found' });
    }
    if (space.status !== 'available') {
      await t.rollback();
      return res.status(400).json({ message: 'Parking space is not available' });
    }

    // Create vehicle for the user
    const vehicle = await Vehicle.create({
      plate: vehicleData.plate,
      model: vehicleData.model,
      color: vehicleData.color,
      type: vehicleData.type || 'car',
      userId: user.id,
    }, { transaction: t });

    // Create reservation (cashier flow from map => active)
    const startTime = new Date(reservationData.startTime);
    const endTime = reservationData.endTime ? new Date(reservationData.endTime) : null;
    const reservation = await Reservation.create({
      userId: user.id,
      vehicleId: vehicle.id,
      parkingSpaceId: space.id,
      startTime,
      endTime,
      status: 'active',
      totalAmount: 0,
      paymentStatus: 'pending'
    }, { transaction: t });

    // Update space to reserved
    await space.update({ status: 'reserved' }, { transaction: t });

    await t.commit();

    // Send credentials email (non-blocking of DB state)
    try {
      const subject = 'Tus credenciales de acceso - ParkingZone';
      const text = `Hola ${user.firstName},\n\nSe ha creado tu cuenta en ParkingZone.\n\nEmail: ${user.email}\nContraseña: ${plainPassword}\n\nPuedes iniciar sesión y gestionar tus reservas.\n\nSaludos,\nEquipo ParkingZone`;
      const html = `<p>Hola <strong>${user.firstName}</strong>,</p>
        <p>Se ha creado tu cuenta en <strong>ParkingZone</strong>.</p>
        <p><strong>Email:</strong> ${user.email}<br/>
        <strong>Contraseña:</strong> ${plainPassword}</p>
        <p>Puedes iniciar sesión y gestionar tus reservas.</p>
        <p>Saludos,<br/>Equipo ParkingZone</p>`;
      await sendEmail(user.email, subject, text, html);
    } catch (mailErr) {
      console.error('Send credentials email error:', mailErr);
    }

    return res.status(201).json({
      message: 'Cliente, vehículo y reserva creados exitosamente',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
      vehicle,
      reservation,
    });
  } catch (error) {
    try { await t.rollback(); } catch {}
    console.error('Transactional create error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get vehicles by user (for cashier to pick a client's vehicle)
router.get('/users/:id/vehicles', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user || user.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }

    const vehicles = await Vehicle.findAll({ where: { userId: id } });
    res.json({ vehicles });
  } catch (error) {
    console.error('Get user vehicles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all reservations for security
router.get('/reservations', async (req: AuthRequest, res: Response) => {
  try {
    const reservations = await Reservation.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'model', 'plate', 'color', 'type']
        },
        {
          model: ParkingSpace,
          as: 'parkingSpace',
          attributes: ['id', 'spaceNumber', 'zone']
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ reservations });
  } catch (error) {
    console.error('Get reservations for security error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search clients (for cashier/security/admin)
router.get('/clients', async (req: AuthRequest, res: Response) => {
  try {
    const { query = '' } = req.query as { query?: string };

    const like = `%${String(query).trim()}%`;

    const clients = await User.findAll({
      where: {
        role: 'client',
        isActive: true,
        [Op.or]: [
          { email: { [Op.like]: like } },
          { firstName: { [Op.like]: like } },
          { lastName: { [Op.like]: like } },
          { phone: { [Op.like]: like } },
        ],
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
      limit: 25,
      order: [['createdAt', 'DESC']],
    });

    res.json({ users: clients });
  } catch (error) {
    console.error('Search clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// (All LPR-related endpoints removed)

// Get parking space details with schedule
router.get('/parking/spaces/:id/details', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const space = await ParkingSpace.findByPk(id, {
      include: [
        {
          model: Schedule,
          as: 'schedule',
          attributes: ['name', 'description', 'startTime', 'endTime', 'overtimeRate', 'indefiniteRate']
        }
      ]
    });

    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    // Get current reservation if any
    const currentReservation = await Reservation.findOne({
      where: {
        parkingSpaceId: id,
        status: { [Op.in]: ['active', 'occupied'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'phone']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['model', 'plate', 'color', 'type']
        }
      ],
      order: [['startTime', 'DESC']]
    });

    // If no current reservation but space is occupied, LPR lookups are disabled
    const occupiedVehicleInfo = null;

    // Get today's schedule for this space
    const today = new Date().getDay();
    const todaySchedule = await Schedule.findOne({
      where: {
        dayOfWeek: today,
        isActive: true
      }
    });

    // Get recent reservations for this space (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentReservations = await Reservation.findAll({
      where: {
        parkingSpaceId: id,
        createdAt: { [Op.gte]: sevenDaysAgo }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['model', 'plate']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      space,
      currentReservation,
      occupiedVehicleInfo,
      todaySchedule,
      recentReservations
    });
  } catch (error) {
    console.error('Get parking space details error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/parking/spaces/:id/status', [
  body('status').isIn(['available', 'occupied', 'maintenance', 'reserved']),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    // Security is allowed to set to maintenance, available, reserved, or occupied (for LPR/manual entry)
    if (req.user?.role === 'security' && !['maintenance', 'available', 'reserved', 'occupied'].includes(status)) {
      return res.status(403).json({ message: 'Security role can only set spaces to maintenance, available, reserved or occupied' });
    }

    // If attempting to set to maintenance, ensure there is no active/occupied reservation and space not marked occupied
    if (status === 'maintenance') {
      // Block if space is currently occupied
      if (space.status === 'occupied') {
        return res.status(400).json({
          message: 'No se puede marcar en mantenimiento mientras está Ocupado. Libere el espacio primero.'
        });
      }

      // Block if there is an active/occupied reservation tied to this space
      const activeReservation = await Reservation.findOne({
        where: {
          parkingSpaceId: space.id,
          status: { [Op.in]: ['active', 'occupied'] },
        },
      });
      if (activeReservation) {
        return res.status(400).json({
          message: 'Existe una reserva activa/ocupada en este espacio. Finalícela antes de marcar mantenimiento.'
        });
      }
    }

    const updatedSpace = await space.update({ status });

    res.json({
      message: 'Parking space status updated successfully',
      space: updatedSpace
    });
  } catch (error) {
    console.error('Update parking space status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Manually liberate parking space (security, cashier, admin)
router.post('/parking/spaces/:id/liberate', [
  body('reason').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason = 'Manual liberation by security', notes } = req.body;
    const actorUserId = req.user?.id;

    if (!actorUserId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    if (!['occupied','reserved'].includes(space.status)) {
      return res.status(400).json({ message: 'Space is neither occupied nor reserved' });
    }

    // Find active/reserved reservation for this space
    const activeReservation = await Reservation.findOne({
      where: {
        parkingSpaceId: id,
        status: { [Op.in]: ['active', 'occupied'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['model', 'plate', 'color']
        },
        {
          model: ParkingSpace,
          as: 'parkingSpace',
          attributes: ['carRate', 'motorcycleRate']
        }
      ]
    });

    let completedReservation = null;

    // If there's an active reservation
    if (activeReservation) {
      const endTime = new Date();
      if (space.status === 'occupied') {
        const startTime = new Date(activeReservation.startTime);
        const durationHours = Math.max(1, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)));
        const baseRate = space.carRate || 0;
        const finalAmount = baseRate * durationHours;
        completedReservation = await activeReservation.update({
          status: 'completed',
          endTime,
          totalAmount: finalAmount
        });
      } else {
        // reserved -> cancel without charge
        completedReservation = await activeReservation.update({
          status: 'cancelled',
          endTime,
        });
      }
    }

    // Update parking space status to available
    const updatedSpace = await space.update({ 
      status: 'available'
    });

    // Log the security action
    console.log(`Liberation: Space ${space.spaceNumber} liberated by user ${actorUserId}. Reason: ${reason}`);

    res.json({
      message: 'Parking space liberated successfully',
      space: updatedSpace,
      reservation: completedReservation,
      action: {
        performedBy: actorUserId,
        reason,
        notes,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Liberate parking space error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Security: create reservation (indefinite) and assign space
router.post('/reservations', async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, parkingSpaceId, startTime, endTime = null, status } = req.body;
    const securityUserId = req.user?.id;

    if (!vehicleId || !parkingSpaceId || !startTime) {
      return res.status(400).json({ message: 'vehicleId, parkingSpaceId and startTime are required' });
    }

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const space = await ParkingSpace.findByPk(parkingSpaceId);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    if (space.status !== 'available') {
      return res.status(400).json({ message: 'Parking space is not available' });
    }

    // Determine status (security/camera flow => default occupied)
    const desiredStatus: 'occupied' | 'active' = status === 'active' ? 'active' : 'occupied';

    // Create reservation
    const reservation = await Reservation.create({
      userId: vehicle.userId || securityUserId || 0,
      vehicleId,
      parkingSpaceId,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      status: desiredStatus,
      totalAmount: 0,
      paymentStatus: 'pending'
    });

    // Update space according to reservation status
    const newSpaceStatus = desiredStatus === 'active' ? 'reserved' : 'occupied';
    await space.update({ status: newSpaceStatus });

    res.status(201).json({ message: 'Reservation created', reservation });
  } catch (error) {
    console.error('Security create reservation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create user for LPR system (security can create new clients)
router.post('/users', [
  body('firstName').notEmpty().trim().withMessage('Nombre es requerido'),
  body('lastName').notEmpty().trim().withMessage('Apellido es requerido'),
  body('email').isEmail().normalizeEmail().withMessage('Email válido es requerido'),
  body('phone').notEmpty().trim().withMessage('Teléfono es requerido'),
  body('password').optional().isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔍 Security create user - Request body:', req.body);
    const { firstName, lastName, email, phone, password = 'temp123' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuario con este email ya existe' });
    }

    // Create new user
    const plainPassword = password;
    const hashedPassword = await hashPassword(plainPassword);
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role: 'client',
      isActive: true,
    });

    // Send credentials email (non-critical)
    try {
      const subject = 'Tus credenciales de acceso - ParkingZone';
      const text = `Hola ${firstName},\n\nSe ha creado tu cuenta en ParkingZone.\n\nEmail: ${email}\nContraseña: ${plainPassword}\n\nPuedes iniciar sesión y gestionar tus reservas.\n\nSaludos,\nEquipo ParkingZone`;
      const html = `<p>Hola <strong>${firstName}</strong>,</p>
        <p>Se ha creado tu cuenta en <strong>ParkingZone</strong>.</p>
        <p><strong>Email:</strong> ${email}<br/>
        <strong>Contraseña:</strong> ${plainPassword}</p>
        <p>Puedes iniciar sesión y gestionar tus reservas.</p>
        <p>Saludos,<br/>Equipo ParkingZone</p>`;
      await sendEmail(email, subject, text, html);
    } catch (mailErr) {
      console.error('Send credentials email error:', mailErr);
    }

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Security create user error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Create vehicle for LPR system (security can create vehicles without users)
router.post('/vehicles', [
  body('plate').notEmpty().trim().withMessage('Placa es requerida'),
  body('model').notEmpty().trim().withMessage('Modelo es requerido'),
  body('color').notEmpty().trim().withMessage('Color es requerido'),
  body('userId').optional().isInt().withMessage('ID de usuario debe ser un número válido'),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { plate, model, color, userId } = req.body;

    // Check if vehicle with this plate already exists
    const existingVehicle = await Vehicle.findOne({ where: { plate } });
    if (existingVehicle) {
      return res.status(400).json({ message: 'Vehículo con esta placa ya existe' });
    }

    // Verify user exists only if userId is provided
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
    }

    // Create new vehicle
    const vehicle = await Vehicle.create({
      plate,
      model,
      color,
      type: 'car', // Default to car
      userId,
    });

    res.status(201).json({
      message: 'Vehículo creado exitosamente',
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
        color: vehicle.color,
        type: vehicle.type,
        userId: vehicle.userId,
        createdAt: vehicle.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Security create vehicle error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;

