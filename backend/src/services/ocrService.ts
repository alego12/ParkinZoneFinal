import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface OCRResult {
  text: string;
  confidence: number;
  boxes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

class OCRService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
  }

  /**
   * Extrae texto de una imagen usando PaddleOCR
   */
  async extractText(imageData: string): Promise<OCRResult> {
    try {
      // Generar nombre único para el archivo temporal
      const fileName = `ocr_${uuidv4()}.jpg`;
      const filePath = path.join(this.tempDir, fileName);

      // Convertir base64 a archivo
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      await writeFile(filePath, base64Data, 'base64');

      // Ejecutar PaddleOCR
      const result = await this.runPaddleOCR(filePath);

      // Limpiar archivo temporal
      await unlink(filePath);

      return result;
    } catch (error) {
      console.error('Error en OCR Service:', error);
      throw new Error('Error al procesar imagen con OCR');
    }
  }

  /**
   * Ejecuta PaddleOCR en Python
   */
  private async runPaddleOCR(imagePath: string): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import json
from paddleocr import PaddleOCR
import cv2
import numpy as np

def main():
    try:
        # Inicializar PaddleOCR optimizado para caracteres grandes
        ocr = PaddleOCR(
            use_angle_cls=True, 
            lang='en', 
            show_log=False,
            det_db_thresh=0.3,  # Umbral más bajo para detectar caracteres grandes
            det_db_box_thresh=0.5,  # Umbral para bounding boxes
            det_db_unclip_ratio=1.6,  # Ratio para expandir detecciones
            rec_batch_num=6,  # Procesar en lotes
            use_space_char=True  # Incluir espacios
        )
        
        # Leer imagen
        image_path = "${imagePath}"
        result = ocr.ocr(image_path, cls=True)
        
        # Procesar resultados
        extracted_text = ""
        confidence_scores = []
        boxes = []
        
        if result and result[0]:
            for line in result[0]:
                if line:
                    text = line[1][0]
                    confidence = line[1][1]
                    bbox = line[0]
                    
                    extracted_text += text + " "
                    confidence_scores.append(confidence)
                    
                    # Convertir bbox a formato estándar
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    boxes.append({
                        "x": min(x_coords),
                        "y": min(y_coords),
                        "width": max(x_coords) - min(x_coords),
                        "height": max(y_coords) - min(y_coords)
                    })
        
        # Calcular confianza promedio
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        
        # Limpiar texto
        cleaned_text = extracted_text.strip().replace('\\n', ' ').replace('\\r', ' ')
        
        # Buscar patrones de placas (enfoque en caracteres grandes)
        import re
        
        # Filtrar solo texto que parece ser de caracteres grandes
        # Eliminar texto muy pequeño o que no sea alfanumérico
        large_text = ""
        for line in result[0] if result and result[0] else []:
            if line:
                text = line[1][0]
                bbox = line[0]
                
                # Calcular el área del bounding box
                x_coords = [point[0] for point in bbox]
                y_coords = [point[1] for point in bbox]
                width = max(x_coords) - min(x_coords)
                height = max(y_coords) - min(y_coords)
                area = width * height
                
                # Solo incluir texto con área significativa (caracteres grandes)
                # Filtrar por área mínima y altura mínima para caracteres grandes
                if (area > 800 and height > 20 and width > 15 and 
                    len(text.strip()) > 0 and 
                    not any(word in text.upper() for word in ['BOLIVIA', 'L', 'R', 'E', 'A', 'O', 'U'])):
                    large_text += text + " "
        
        # Limpiar el texto de caracteres grandes
        cleaned_large_text = large_text.strip().replace('\\n', ' ').replace('\\r', ' ')
        
        # Patrones específicos para placas bolivianas (caracteres grandes)
        plate_patterns = [
            r'\\b\\d{4}[A-Z]{3}\\b',  # 4 dígitos + 3 letras (como 1852PHD)
            r'\\b\\d{3}[A-Z]{3}\\b',  # 3 dígitos + 3 letras
            r'\\b[A-Z]{3}\\d{4}\\b',  # 3 letras + 4 dígitos
            r'\\b[A-Z]{3}\\d{3}\\b',  # 3 letras + 3 dígitos
        ]
        
        plate_match = None
        for pattern in plate_patterns:
            match = re.search(pattern, cleaned_large_text)
            if match:
                plate_match = match.group(0)
                break
        
        # Si no encuentra patrón, usar el texto limpio de caracteres grandes
        final_text = plate_match if plate_match else cleaned_large_text
        
        # Preparar resultado
        result_data = {
            "text": final_text,
            "confidence": avg_confidence,
            "boxes": boxes,
            "debug_info": {
                "original_text": cleaned_text,
                "large_text": cleaned_large_text,
                "filtered_by_area": True
            }
        }
        
        print(json.dumps(result_data))
        
    except Exception as e:
        error_result = {
            "text": "",
            "confidence": 0,
            "boxes": [],
            "error": str(e)
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()
`;

      // Ejecutar script de Python
      const pythonProcess = spawn('python3', ['-c', pythonScript]);
      
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve(result);
            }
          } catch (parseError) {
            reject(new Error('Error al parsear resultado de OCR'));
          }
        } else {
          reject(new Error(`PaddleOCR falló con código ${code}: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Verifica si PaddleOCR está disponible
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Solo verificar que Python y las librerías estén disponibles
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const pythonProcess = spawn('python', ['-c', 'from paddleocr import PaddleOCR; print("OK")']);
        
        pythonProcess.on('close', (code: number) => {
          resolve(code === 0);
        });
        
        pythonProcess.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      console.log('PaddleOCR no está disponible:', error);
      return false;
    }
  }
}

export default new OCRService();
