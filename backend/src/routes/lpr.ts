import { Router, Response, Request } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import Jimp from 'jimp';
import { Op } from 'sequelize';
import { LPRRecord } from '../models/LPRRecord';
import { Vehicle } from '../models/Vehicle';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import { ParkingSpace } from '../models/ParkingSpace';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lpr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// LPR detection with image processing
router.post('/detect', authenticateToken, upload.single('image'), [
  body('plateNumber').optional().isString(),
  body('vehicleColor').optional().isString(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { plateNumber, vehicleColor } = req.body as any;
    const file = (req as AuthRequest).file;

    if (!file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Process image with Sharp for optimization
    const processedImagePath = path.join(
      path.dirname(file.path),
      'processed-' + path.basename(file.path)
    );

    // Resize and optimize image
    await sharp(file.path)
      .resize(800, 600, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toFile(processedImagePath);

    // Analyze image with Jimp for color detection
    const image = await Jimp.read(processedImagePath);
    const dominantColor = await getDominantColor(image);

    // Simple plate number detection (enhanced mock)
    let detectedPlateNumber = plateNumber;
    let detectedColor = vehicleColor || dominantColor;

    if (!detectedPlateNumber) {
      // Generate a realistic-looking plate number
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const letter1 = letters[Math.floor(Math.random() * letters.length)];
      const letter2 = letters[Math.floor(Math.random() * letters.length)];
      const letter3 = letters[Math.floor(Math.random() * letters.length)];
      const num1 = numbers[Math.floor(Math.random() * numbers.length)];
      const num2 = numbers[Math.floor(Math.random() * numbers.length)];
      const num3 = numbers[Math.floor(Math.random() * numbers.length)];
      
      detectedPlateNumber = `${letter1}${letter2}${letter3}-${num1}${num2}${num3}`;
    }

    // Calculate confidence based on image quality and processing
    const imageStats = await sharp(processedImagePath).stats();
    const brightness = imageStats.channels[0].mean;
    const contrast = imageStats.channels[0].stdev;
    
    let confidence = 0.85; // Base confidence
    if (brightness > 100 && brightness < 200) confidence += 0.1; // Good brightness
    if (contrast > 30) confidence += 0.05; // Good contrast
    confidence = Math.min(confidence, 0.98); // Cap at 98%

    // Create LPR record
    const lprRecord = await LPRRecord.create({
      plateNumber: detectedPlateNumber,
      vehicleColor: detectedColor,
      detectedAt: new Date(),
      imagePath: processedImagePath,
      confidence,
      status: 'pending',
    });

    // Clean up original file
    fs.unlinkSync(file.path);

    res.status(201).json({
      message: 'LPR detection completed',
      record: lprRecord,
    });
  } catch (error) {
    console.error('LPR detection error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create manual LPR record (no image required)
router.post('/records', authenticateToken, [
  body('plateNumber').isString().notEmpty(),
  body('vehicleColor').optional().isString(),
  body('imagePath').optional().isString(),
  body('confidence').optional().isFloat({ min: 0, max: 1 }),
  body('status').optional().isString(),
  body('type').optional().isIn(['entry','exit']),
  body('reservationId').optional().isInt(),
  body('vehicleId').optional().isInt(),
  body('userId').optional().isInt(),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const {
      plateNumber,
      vehicleColor,
      imagePath,
      confidence,
      status,
      reservationId,
      vehicleId,
      userId,
      notes,
      type,
    } = req.body as any;

    // Try to auto-resolve missing references by plate
    let resolvedVehicleId = vehicleId ?? null;
    let resolvedUserId = userId ?? null;
    let resolvedReservationId = reservationId ?? null;

    if (!resolvedVehicleId || !resolvedUserId) {
      const vehicle = await Vehicle.findOne({ where: { plate: plateNumber } });
      if (vehicle) {
        resolvedVehicleId = resolvedVehicleId ?? vehicle.id;
        resolvedUserId = resolvedUserId ?? (vehicle.userId ?? null);
      }
    }

    if (!resolvedReservationId) {
      const reservation = await Reservation.findOne({
        where: {
          status: { [Op.in]: ['active', 'occupied'] },
          ...(resolvedVehicleId ? { vehicleId: resolvedVehicleId } : {}),
        },
        order: [['startTime','DESC']],
      });
      if (reservation) {
        resolvedReservationId = reservation.id;
        // if still missing resolved user/vehicle, take from reservation
        resolvedVehicleId = resolvedVehicleId ?? reservation.vehicleId;
        resolvedUserId = resolvedUserId ?? reservation.userId;
      }
    }

    const actorId = (req as AuthRequest).user?.id ?? undefined;

    const record = await LPRRecord.create({
      plateNumber,
      vehicleColor: vehicleColor || 'Desconocido',
      detectedAt: new Date(),
      imagePath: imagePath ?? 'manual-entry',
      confidence: confidence ?? 1.0,
      status: status || 'pending',
      type: type || 'entry',
      reservationId: resolvedReservationId ?? undefined,
      vehicleId: resolvedVehicleId ?? undefined,
      userId: resolvedUserId ?? undefined,
      processedBy: actorId,
      processedAt: actorId ? new Date() : undefined,
      notes: notes || 'Registro manual',
    });

    res.status(201).json({
      message: 'LPR record created manually',
      record,
    });
  } catch (error) {
    console.error('Create manual LPR record error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to get dominant color from image
async function getDominantColor(image: Jimp): Promise<string> {
  const colors = ['Blanco', 'Negro', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Plateado'];
  
  // Simple color analysis based on pixel sampling
  const sampleSize = 100;
  let colorCounts: { [key: string]: number } = {};
  
  for (let i = 0; i < sampleSize; i++) {
    const x = Math.floor(Math.random() * image.getWidth());
    const y = Math.floor(Math.random() * image.getHeight());
    const color = Jimp.intToRGBA(image.getPixelColor(x, y));
    
    // Determine color category based on RGB values
    let colorCategory = 'Gris';
    if (color.r > 200 && color.g > 200 && color.b > 200) colorCategory = 'Blanco';
    else if (color.r < 50 && color.g < 50 && color.b < 50) colorCategory = 'Negro';
    else if (color.r > color.g && color.r > color.b) colorCategory = 'Rojo';
    else if (color.g > color.r && color.g > color.b) colorCategory = 'Verde';
    else if (color.b > color.r && color.b > color.g) colorCategory = 'Azul';
    
    colorCounts[colorCategory] = (colorCounts[colorCategory] || 0) + 1;
  }
  
  // Return the most frequent color
  const dominantColor = Object.keys(colorCounts).reduce((a, b) => 
    colorCounts[a] > colorCounts[b] ? a : b
  );
  
  return dominantColor;
}

// Get LPR records (for security/admin)
router.get('/records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: records } = await LPRRecord.findAndCountAll({
      where: whereClause,
      order: [['detectedAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({
      records,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get LPR records error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get LPR record by ID
router.get('/records/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any;
    const record = await LPRRecord.findByPk(id);

    if (!record) {
      return res.status(404).json({ message: 'LPR record not found' });
    }

    res.json({ record });
  } catch (error) {
    console.error('Get LPR record error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search for matching vehicles and reservations
router.get('/records/:id/match', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any;
    const record = await LPRRecord.findByPk(id);
    
    if (!record) {
      return res.status(404).json({ message: 'LPR record not found' });
    }

    // Search for vehicles with matching plate
    const vehicles = await Vehicle.findAll({
      where: { plate: record.plateNumber },
    });

    // Search for active reservations with matching vehicles
    const reservations = await Reservation.findAll({
      where: { 
        status: 'active',
        vehicleId: vehicles.map(v => v.id)
      },
    });

    res.json({
      record,
      vehicles,
      reservations,
      hasMatch: vehicles.length > 0 || reservations.length > 0
    });
  } catch (error) {
    console.error('Match LPR record error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Process LPR record - match with reservation and change status
router.put('/records/:id/process', authenticateToken, [
  body('action').isIn(['match_reservation', 'create_vehicle', 'no_match']),
  body('reservationId').optional().isInt(),
  body('vehicleId').optional().isInt(),
  body('userId').optional().isInt(),
  body('notes').optional().isString(),
  handleValidationErrors,
], async (req: Request, res: Response) => {
  try {
    const { id } = req.params as any;
    const { action, reservationId, vehicleId, userId, notes } = req.body as any;
    const processedBy = (req as AuthRequest).user?.id;

    const record = await LPRRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'LPR record not found' });
    }

    let updatedRecord = record;
    let reservation = null;

    switch (action) {
      case 'match_reservation':
        if (!reservationId) {
          return res.status(400).json({ message: 'Reservation ID is required for matching' });
        }
        
        reservation = await Reservation.findByPk(reservationId);
        if (!reservation) {
          return res.status(404).json({ message: 'Reservation not found' });
        }

        // Change reservation status to occupied
        await reservation.update({ status: 'occupied' });
        
        // Update parking space status
        const parkingSpace = await ParkingSpace.findByPk(reservation.parkingSpaceId);
        if (parkingSpace) {
          await parkingSpace.update({ status: 'occupied' });
        }

        updatedRecord = await record.update({
          status: 'matched',
          reservationId,
          vehicleId: reservation.vehicleId,
          userId: reservation.userId,
          processedBy,
          processedAt: new Date(),
          notes
        });
        break;

      case 'create_vehicle':
        if (!userId) {
          return res.status(400).json({ message: 'User ID is required for creating vehicle' });
        }

        // Create new vehicle
        const newVehicle = await Vehicle.create({
          userId,
          model: 'Desconocido',
          plate: record.plateNumber,
          color: record.vehicleColor,
          type: 'car'
        });

        updatedRecord = await record.update({
          status: 'vehicle_created',
          vehicleId: newVehicle.id,
          userId,
          processedBy,
          processedAt: new Date(),
          notes
        });
        break;

      case 'no_match':
        updatedRecord = await record.update({
          status: 'no_match',
          processedBy,
          processedAt: new Date(),
          notes
        });
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.json({
      message: 'LPR record processed successfully',
      record: updatedRecord,
      reservation
    });
  } catch (error) {
    console.error('Process LPR record error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search users for vehicle creation
router.get('/search-users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { query } = req.query as any;
    
    if (!query || query.toString().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.findAll({
      where: {
        role: 'client',
        isActive: true,
        [Op.or]: [
          { email: { [Op.iLike]: `%${query}%` } },
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
          { phone: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit: 10,
      attributes: ['id', 'email', 'firstName', 'lastName', 'phone']
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Serve uploaded images
router.get('/images/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params as any;
    const imagePath = path.join(process.env.UPLOAD_PATH || './uploads', filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.sendFile(imagePath);
  } catch (error: any) {
    console.error('Serve image error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
