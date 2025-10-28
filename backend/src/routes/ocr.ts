import express from 'express';
import ocrService from '../services/ocrService';

const router = express.Router();

/**
 * POST /api/ocr/extract
 * Extrae texto de una imagen usando PaddleOCR
 */
router.post('/extract', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere imageData'
      });
    }

    // Extraer texto usando PaddleOCR
    const result = await ocrService.extractText(imageData);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error en OCR endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/ocr/status
 * Verifica el estado de PaddleOCR
 */
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await ocrService.checkAvailability();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        service: 'PaddleOCR'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error al verificar estado'
    });
  }
});

export default router;
