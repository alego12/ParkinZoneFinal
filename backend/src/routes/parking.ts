import { Router, Response } from 'express';
import { ParkingSpace } from '../models/ParkingSpace';
import { Reservation } from '../models/Reservation';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all parking spaces
router.get('/spaces', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const spaces = await ParkingSpace.findAll({
      where: { isActive: true },
      order: [['spaceNumber', 'ASC']],
    });

    res.json({ spaces });
  } catch (error) {
    console.error('Get parking spaces error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get parking space by ID
router.get('/spaces/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const space = await ParkingSpace.findByPk(id);

    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    res.json({ space });
  } catch (error) {
    console.error('Get parking space error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available parking spaces
router.get('/available', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const spaces = await ParkingSpace.findAll({
      where: { 
        status: 'available',
        isActive: true 
      },
      order: [['spaceNumber', 'ASC']],
    });

    res.json({ spaces });
  } catch (error) {
    console.error('Get available spaces error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get parking statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const totalSpaces = await ParkingSpace.count({ where: { isActive: true } });
    const availableSpaces = await ParkingSpace.count({ 
      where: { status: 'available', isActive: true } 
    });
    const occupiedSpaces = await ParkingSpace.count({ 
      where: { status: 'occupied', isActive: true } 
    });
    const maintenanceSpaces = await ParkingSpace.count({ 
      where: { status: 'maintenance', isActive: true } 
    });

    res.json({
      total: totalSpaces,
      available: availableSpaces,
      occupied: occupiedSpaces,
      maintenance: maintenanceSpaces,
      occupancyRate: totalSpaces > 0 ? ((occupiedSpaces / totalSpaces) * 100).toFixed(2) : 0,
    });
  } catch (error) {
    console.error('Get parking stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update parking space status (Admin/Security only)
router.put('/spaces/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user!.role;

    // Only admin and security can update status
    if (!['admin', 'security'].includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const space = await ParkingSpace.findByPk(id);
    if (!space) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    await space.update({ status });

    res.json({
      message: 'Parking space status updated successfully',
      space,
    });
  } catch (error) {
    console.error('Update space status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
