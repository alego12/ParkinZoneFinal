import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Vehicle } from '../models/Vehicle';
import { authenticateToken, requireClient, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// Get user's vehicles
router.get('/', authenticateToken, requireClient, async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await Vehicle.findAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({ vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add vehicle
router.post('/', authenticateToken, requireClient, [
  body('model').notEmpty().trim(),
  body('plate')
    .notEmpty()
    .trim()
    .matches(/^\d{4}[A-Z]{3}$/)
    .withMessage('La placa debe tener el formato boliviano: 4 dígitos seguidos de 3 letras (ej: 1825PHD)'),
  body('color').notEmpty().trim(),
  body('type').isIn(['car', 'motorcycle']),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { model, plate, color, type } = req.body;
    const userId = req.user!.id;

    // Check if user already has 3 vehicles
    const vehicleCount = await Vehicle.count({ where: { userId } });
    if (vehicleCount >= 3) {
      return res.status(400).json({ message: 'Maximum 3 vehicles allowed per user' });
    }

    // Check if plate already exists
    const existingVehicle = await Vehicle.findOne({ where: { plate } });
    if (existingVehicle) {
      return res.status(400).json({ message: 'Vehicle with this plate already exists' });
    }

    const vehicle = await Vehicle.create({
      userId,
      model,
      plate,
      color,
      type,
    });

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle,
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update vehicle
router.put('/:id', authenticateToken, requireClient, [
  body('model').optional().notEmpty().trim(),
  body('plate')
    .optional()
    .notEmpty()
    .trim()
    .matches(/^\d{4}[A-Z]{3}$/)
    .withMessage('La placa debe tener el formato boliviano: 4 dígitos seguidos de 3 letras (ej: 1825PHD)'),
  body('color').optional().notEmpty().trim(),
  handleValidationErrors,
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { model, plate, color } = req.body;
    const userId = req.user!.id;

    const vehicle = await Vehicle.findOne({
      where: { id, userId },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if plate already exists (excluding current vehicle)
    if (plate && plate !== vehicle.plate) {
      const existingVehicle = await Vehicle.findOne({ 
        where: { plate, id: { [require('sequelize').Op.ne]: id } } 
      });
      if (existingVehicle) {
        return res.status(400).json({ message: 'Vehicle with this plate already exists' });
      }
    }

    await vehicle.update({
      model: model || vehicle.model,
      plate: plate || vehicle.plate,
      color: color || vehicle.color,
    });

    res.json({
      message: 'Vehicle updated successfully',
      vehicle,
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete vehicle
router.delete('/:id', authenticateToken, requireClient, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const vehicle = await Vehicle.findOne({
      where: { id, userId },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    await vehicle.destroy();

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
