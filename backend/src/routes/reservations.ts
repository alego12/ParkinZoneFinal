import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Reservation } from '../models/Reservation';
import { ParkingSpace } from '../models/ParkingSpace';
import { Vehicle } from '../models/Vehicle';
import { User } from '../models/User';
import { Schedule } from '../models/Schedule';
import { authenticateToken, requireClient, requireClientOrCashier, requireAdmin, requireRole, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import sequelize from '../config/database';

const router = Router();

// Helper function to check if time is within schedule
const isTimeWithinSchedule = (time: Date, schedule: Schedule): boolean => {
  const dayOfWeek = time.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  if (dayOfWeek !== schedule.dayOfWeek) {
    return false;
  }
  
  const timeStr = time.toTimeString().slice(0, 5); // HH:MM format
  return timeStr >= schedule.startTime && timeStr <= schedule.endTime;
};

// Helper function to calculate overtime charges
const calculateOvertimeCharges = (
  startTime: Date, 
  endTime: Date | null, 
  schedule: Schedule, 
  baseRate: number,
  isIndefinite: boolean
): { totalAmount: number; overtimeHours: number; indefiniteFee: number } => {
  let totalAmount = 0;
  let overtimeHours = 0;
  let indefiniteFee = 0;
  
  console.log('🔍 calculateOvertimeCharges - Parámetros:', {
    startTime: startTime.toISOString(),
    endTime: endTime ? endTime.toISOString() : 'null',
    schedule: {
      id: schedule.id,
      name: schedule.name,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      overtimeRate: schedule.overtimeRate,
      indefiniteRate: schedule.indefiniteRate
    },
    baseRate,
    isIndefinite
  });
  
  if (isIndefinite) {
    // For indefinite reservations, charge base rate + indefinite fee
    const indefiniteRate = schedule.indefiniteRate || 0;
    
    // Ensure values are numbers, not strings
    const baseRateNum = parseFloat(baseRate.toString());
    const indefiniteRateNum = parseFloat(indefiniteRate.toString());
    
    totalAmount = baseRateNum + indefiniteRateNum;
    indefiniteFee = indefiniteRateNum;
    
    console.log('💰 Reserva indefinida - Cargos:', { 
      baseRate, 
      baseRateNum, 
      indefiniteRate, 
      indefiniteRateNum, 
      totalAmount, 
      indefiniteFee 
    });
  } else if (endTime) {
    // Calculate total duration
    const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    console.log('⏰ Duración total calculada:', totalHours, 'horas');
    
    // Check if reservation extends beyond schedule
    const endTimeStr = endTime.toTimeString().slice(0, 5);
    console.log('🕐 Comparando horarios:', { endTimeStr, scheduleEndTime: schedule.endTime });
    
    if (endTimeStr > schedule.endTime) {
      console.log('⚠️ Reserva se extiende más allá del horario');
      // Calculate overtime hours
      const scheduleEndTime = new Date(endTime);
      scheduleEndTime.setHours(parseInt(schedule.endTime.split(':')[0]));
      scheduleEndTime.setMinutes(parseInt(schedule.endTime.split(':')[1]));
      
      overtimeHours = (endTime.getTime() - scheduleEndTime.getTime()) / (1000 * 60 * 60);
      
      // Calculate charges: base rate for scheduled time + overtime rate for extra time
      const scheduledHours = totalHours - overtimeHours;
      const overtimeRate = schedule.overtimeRate || 0;
      totalAmount = (scheduledHours * baseRate) + (overtimeHours * (baseRate + overtimeRate));
      console.log('💰 Cargos con horas extra:', { scheduledHours, overtimeHours, totalAmount });
    } else {
      // All time is within schedule
      totalAmount = totalHours * baseRate;
      console.log('💰 Cargos dentro del horario:', { totalHours, totalAmount });
    }
  }
  
  console.log('✅ calculateOvertimeCharges - Resultado:', { totalAmount, overtimeHours, indefiniteFee });
  return { totalAmount, overtimeHours, indefiniteFee };
};

// Endpoint to fix endTime column
router.post('/fix-endtime', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔧 Modificando columna endTime para permitir NULL...');
    
    // Execute the ALTER TABLE query
    await sequelize.query('ALTER TABLE reservations MODIFY COLUMN endTime DATETIME NULL');
    
    console.log('✅ Columna endTime modificada exitosamente');
    
    // Verify the change
    const [constraints] = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        IS_NULLABLE,
        DATA_TYPE,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'parking_zone_db' 
        AND TABLE_NAME = 'reservations'
        AND COLUMN_NAME = 'endTime'
    `);
    
    const constraint = constraints[0] as any;
    res.json({
      message: 'endTime column fixed successfully',
      constraint: constraint,
      success: constraint?.IS_NULLABLE === 'YES'
    });
    
  } catch (error) {
    console.error('❌ Error fixing endTime column:', error);
    res.status(500).json({
      message: 'Failed to fix endTime column',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Diagnostic endpoint to check database issues
router.get('/diagnostic', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔍 Running database diagnostic...');
    
    // Check table structure
    const [tableStructure] = await sequelize.query(`DESCRIBE reservations`);
    
    // Check constraints
    const [constraints] = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        DATA_TYPE,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'parking_zone_db' 
        AND TABLE_NAME = 'reservations'
      ORDER BY ORDINAL_POSITION
    `);
    
    // Check existing data
    const [existingReservations] = await sequelize.query(`
      SELECT 
        id,
        userId,
        vehicleId,
        parkingSpaceId,
        startTime,
        endTime,
        status,
        totalAmount,
        paymentStatus,
        createdAt
      FROM reservations 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    
    // Check users
    const [users] = await sequelize.query(`
      SELECT 
        id,
        email,
        firstName,
        lastName,
        role,
        isActive
      FROM users 
      WHERE role = 'client'
      ORDER BY id
    `);
    
    // Check vehicles
    const [vehicles] = await sequelize.query(`
      SELECT 
        id,
        userId,
        model,
        plate,
        color,
        type,
        createdAt
      FROM vehicles 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    
    // Check parking spaces
    const [parkingSpaces] = await sequelize.query(`
      SELECT 
        id,
        spaceNumber,
        zone,
        status,
        carRate,
        motorcycleRate,
        isActive
      FROM parking_spaces 
      WHERE isActive = true
      ORDER BY spaceNumber
      LIMIT 10
    `);
    
    // Check schedules
    const [schedules] = await sequelize.query(`
      SELECT 
        id,
        name,
        dayOfWeek,
        startTime,
        endTime,
        isActive,
        overtimeRate,
        indefiniteRate
      FROM schedules 
      WHERE isActive = true
      ORDER BY dayOfWeek
    `);
    
    res.json({
      message: 'Database diagnostic completed',
      data: {
        tableStructure,
        constraints,
        existingReservations,
        users,
        vehicles,
        parkingSpaces,
        schedules
      }
    });
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    res.status(500).json({
      message: 'Diagnostic failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's reservations
router.get('/', authenticateToken, requireClient, async (req: AuthRequest, res: Response) => {
  try {
    const reservations = await Reservation.findAll({
      where: { userId: req.user!.id },
      include: [
        { model: Vehicle, as: 'vehicle' },
        { model: ParkingSpace, as: 'parkingSpace' },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ reservations });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get active reservation
router.get('/active', authenticateToken, requireClient, async (req: AuthRequest, res: Response) => {
  try {
    const activeReservation = await Reservation.findOne({
      where: { 
        userId: req.user!.id,
        status: 'active'
      },
      include: [
        { 
          model: Vehicle,
          as: 'vehicle'
        },
        { 
          model: ParkingSpace,
          as: 'parkingSpace'
        },
        {
          model: User,
          as: 'user'
        }
      ],
    });

    res.json({ reservation: activeReservation });
  } catch (error) {
    console.error('Get active reservation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create reservation
router.post('/', authenticateToken, requireRole(['client', 'cashier', 'admin']), [
  body('vehicleId').isInt({ min: 1 }),
  body('parkingSpaceId').isInt({ min: 1 }),
  body('startTime').isISO8601(),
  body('status').optional().isIn(['active','occupied','completed','cancelled']),
  body('targetUserId').optional().isInt({ min: 1 }),
  body('endTime').optional().custom((value) => {
    if (value === null || value === undefined) return true; // Allow null/undefined for indefinite reservations
    if (typeof value === 'string' && value.trim() === '') return true; // Allow empty string
    // If it's a string, validate it as ISO8601
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  }),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, parkingSpaceId, startTime, endTime, targetUserId, status } = req.body;
    const requesterUserId = req.user!.id;
    const userRole = req.user!.role;

    // Determine reservation owner
    const reservationUserId = (userRole === 'cashier' || userRole === 'admin') && targetUserId ? Number(targetUserId) : requesterUserId;

    console.log('📝 Creando reserva con datos:', {
      vehicleId,
      parkingSpaceId,
      startTime,
      endTime,
      userId: reservationUserId,
      userRole
    });

    // Check if user already has an active reservation (only for clients)
    if (userRole === 'client') {
      const existingReservation = await Reservation.findOne({
        where: { 
          userId: requesterUserId,
          status: 'active'
        },
      });

      if (existingReservation) {
        return res.status(400).json({ 
          message: 'You already have an active reservation' 
        });
      }
    }

    // Verify vehicle belongs to user (only for clients)
    if (userRole === 'client') {
      const vehicle = await Vehicle.findOne({
        where: { id: vehicleId, userId: requesterUserId },
      });

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
    } else if (userRole === 'cashier' || userRole === 'admin') {
      // For cashiers and admins, verify the target user and vehicle ownership
      if (!targetUserId) {
        return res.status(400).json({ message: 'targetUserId is required for cashier/admin reservations' });
      }
      const clientUser = await User.findByPk(targetUserId);
      if (!clientUser || clientUser.role !== 'client' || !clientUser.isActive) {
        return res.status(404).json({ message: 'Client user not found or inactive' });
      }
      const vehicle = await Vehicle.findOne({ where: { id: vehicleId, userId: targetUserId } });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found for the specified client' });
      }
    }

    // Get parking space with schedule
    const parkingSpace = await ParkingSpace.findByPk(parkingSpaceId, {
      include: [{ model: Schedule, as: 'schedule' }]
    });
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    if (parkingSpace.status !== 'available') {
      return res.status(400).json({ 
        message: 'Parking space is not available' 
      });
    }

    // Get vehicle for compatibility check
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if parking space is compatible with vehicle type
    if (parkingSpace.vehicleType !== 'both' && parkingSpace.vehicleType !== vehicle.type) {
      return res.status(400).json({ 
        message: `This parking space is only for ${parkingSpace.vehicleType}s` 
      });
    }

    // Validate start time is today
    const start = new Date(startTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (start < today || start >= tomorrow) {
      return res.status(400).json({ 
        message: 'Reservations can only be made for today' 
      });
    }

    // Get schedule for today's day of week
    const dayOfWeek = start.getDay();
    const schedule = await Schedule.findOne({
      where: { 
        dayOfWeek,
        isActive: true 
      }
    });

    if (!schedule) {
      return res.status(400).json({ 
        message: 'No schedule available for today' 
      });
    }

    // Schedule validation removed - reservations can be made at any time

    // Calculate amount based on vehicle type, duration, and schedule
    let totalAmount = 0;
    let endTimeDate = null;
    let overtimeHours = 0;
    let indefiniteFee = 0;
    const isIndefinite = !endTime;

    if (endTime) {
      endTimeDate = new Date(endTime);
      
      // Validate end time is after start time
      if (endTimeDate <= start) {
        return res.status(400).json({ 
          message: 'End time must be after start time' 
        });
      }
    }

    // Get base rate for vehicle type
    const baseRate = vehicle.type === 'motorcycle' 
      ? (parkingSpace.motorcycleRate || 0)
      : (parkingSpace.carRate || 0);

    // Calculate charges with overtime/indefinite fees
    try {
      console.log('💰 Calculando cargos con datos:', {
        start: start.toISOString(),
        endTime: endTimeDate ? endTimeDate.toISOString() : 'null',
        schedule: {
          id: schedule.id,
          name: schedule.name,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          overtimeRate: schedule.overtimeRate,
          indefiniteRate: schedule.indefiniteRate
        },
        baseRate,
        isIndefinite
      });
      
      const charges = calculateOvertimeCharges(start, endTimeDate, schedule, baseRate, isIndefinite);
      totalAmount = charges.totalAmount;
      overtimeHours = charges.overtimeHours;
      indefiniteFee = charges.indefiniteFee;
      
      console.log('✅ Cargos calculados:', {
        totalAmount,
        overtimeHours,
        indefiniteFee
      });
    } catch (error) {
      console.error('❌ Error calculating charges:', error);
      console.error('Schedule:', schedule);
      console.error('BaseRate:', baseRate);
      console.error('IsIndefinite:', isIndefinite);
      return res.status(500).json({ 
        message: 'Error calculating reservation charges',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Create reservation using transaction
    console.log('📝 Creando reserva con datos:', {
      userId: reservationUserId,
      vehicleId,
      parkingSpaceId,
      startTime: start,
      endTime: endTimeDate,
      isIndefinite,
      totalAmount
    });

    // Determine target reservation status
    // Clients always create 'active' (futuras). Cashiers/Admin can set 'occupied' for entradas físicas.
    const desiredStatus: 'active' | 'occupied' = (userRole === 'cashier' || userRole === 'admin') && status === 'occupied'
      ? 'occupied'
      : 'active';

    const reservationData: any = {
      userId: reservationUserId,
      vehicleId,
      parkingSpaceId,
      startTime: start,
      totalAmount: parseFloat(totalAmount.toString()), // Ensure it's a number
      status: desiredStatus,
      paymentStatus: 'pending',
    };

    // Only add endTime if it's not null/undefined
    if (endTimeDate) {
      reservationData.endTime = endTimeDate;
    }

    console.log('📊 Datos de reserva a crear:', reservationData);

    // Use transaction to ensure atomicity
    const transaction = await sequelize.transaction();
    
    try {
      // Create reservation
      const reservation = await Reservation.create(reservationData, { transaction });
      console.log('✅ Reserva creada exitosamente:', reservation.id);

      // Update parking space status according to reservation status
      const newSpaceStatus = desiredStatus === 'active' ? 'reserved' : 'occupied';
      await parkingSpace.update({ status: newSpaceStatus }, { transaction });
      console.log(`✅ Estado del espacio actualizado a ${newSpaceStatus}`);

      // Commit transaction
      await transaction.commit();
      console.log('✅ Transacción completada exitosamente');

      // Fetch complete reservation with relations
      const completeReservation = await Reservation.findByPk(reservation.id, {
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: ParkingSpace, as: 'parkingSpace' },
        ],
      });

      res.status(201).json({
        message: 'Reservation created successfully',
        reservation: completeReservation,
        charges: {
          baseAmount: totalAmount - indefiniteFee - (overtimeHours * schedule.overtimeRate),
          overtimeHours,
          overtimeRate: schedule.overtimeRate,
          overtimeAmount: overtimeHours * schedule.overtimeRate,
          indefiniteFee,
          totalAmount,
          schedule: {
            name: schedule.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          }
        }
      });

    } catch (transactionError) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('❌ Error en transacción, haciendo rollback:', transactionError);
      console.error('❌ Error details:', transactionError);
      
      return res.status(500).json({ 
        message: 'Error creating reservation in database',
        error: transactionError instanceof Error ? transactionError.message : 'Unknown error',
        details: transactionError
      });
    }
  } catch (error) {
    console.error('Create reservation error:', error);
    console.error('Error details:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
});

// Get available schedules for today
router.get('/schedules/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const schedule = await Schedule.findOne({
      where: { 
        dayOfWeek,
        isActive: true 
      }
    });

    if (!schedule) {
      return res.status(404).json({ 
        message: 'No schedule available for today' 
      });
    }

    res.json({ 
      schedule: {
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        overtimeRate: schedule.overtimeRate,
        indefiniteRate: schedule.indefiniteRate
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel reservation
router.put('/:id/cancel', authenticateToken, requireClient, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const reservation = await Reservation.findOne({
      where: { id, userId },
      include: [{ model: ParkingSpace, as: 'parkingSpace' }],
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ 
        message: 'Only active reservations can be cancelled' 
      });
    }

    // Update reservation status
    await reservation.update({ 
      status: 'cancelled',
      paymentStatus: 'refunded'
    });

    // Free up parking space
    const parkingSpace = await ParkingSpace.findByPk(reservation.parkingSpaceId);
    if (parkingSpace) {
      await parkingSpace.update({ status: 'available' });
    }

    res.json({
      message: 'Reservation cancelled successfully',
      reservation,
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete reservation (when user leaves)
router.put('/:id/complete', authenticateToken, requireClient, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const reservation = await Reservation.findOne({
      where: { id, userId },
      include: [{ model: ParkingSpace, as: 'parkingSpace' }],
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ 
        message: 'Only active reservations can be completed' 
      });
    }

    // Update reservation status
    await reservation.update({ 
      status: 'completed',
      paymentStatus: 'paid'
    });

    // Free up parking space
    const parkingSpace = await ParkingSpace.findByPk(reservation.parkingSpaceId);
    if (parkingSpace) {
      await parkingSpace.update({ status: 'available' });
    }

    res.json({
      message: 'Reservation completed successfully',
      reservation,
    });
  } catch (error) {
    console.error('Complete reservation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
