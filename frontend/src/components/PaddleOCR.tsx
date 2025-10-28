import { useEffect, useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

interface PaddleOCRProps {
  imageData: string;
  onPlateDetected: (plate: string, confidence: number) => void;
  onError: (error: string) => void;
}

const PaddleOCR: React.FC<PaddleOCRProps> = ({ imageData, onPlateDetected, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPaddleOCRReady, setIsPaddleOCRReady] = useState(false);
  const [progress, setProgress] = useState('');

  // Inicializar PaddleOCR
  useEffect(() => {
    const initPaddleOCR = async () => {
      try {
        setProgress('🐍 Cargando PaddleOCR...');
        
        // Importar Pyodide dinámicamente
        const { loadPyodide } = await import('pyodide');
        
        setProgress('📦 Inicializando Pyodide...');
        const pyodideInstance = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        setProgress('📚 Instalando PaddleOCR...');
        
        // Instalar PaddleOCR y dependencias
        await pyodideInstance.loadPackage(['paddlepaddle', 'paddleocr', 'opencv-python', 'pillow', 'numpy']);
        
        setProgress('🔧 Configurando PaddleOCR...');
        
        // Código Python para PaddleOCR
        const pythonCode = `
from paddleocr import PaddleOCR
import cv2
import numpy as np
from PIL import Image
import io
import base64
import re

# Inicializar PaddleOCR (solo una vez)
ocr = None

def init_paddleocr():
    global ocr
    if ocr is None:
        ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)  # Sin GPU para web
    return ocr

def detect_plate_paddleocr(image_base64):
    """
    Función para detectar placas usando PaddleOCR
    """
    try:
        # Decodificar imagen base64
        image_data = base64.b64decode(image_base64.split(',')[1])
        image = Image.open(io.BytesIO(image_data))
        
        # Convertir a OpenCV
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Redimensionar para mejor procesamiento
        height, width = opencv_image.shape[:2]
        if width > 800:
            scale = 800 / width
            new_width = 800
            new_height = int(height * scale)
            opencv_image = cv2.resize(opencv_image, (new_width, new_height))
        
        # Inicializar PaddleOCR
        ocr = init_paddleocr()
        
        # Detectar texto con PaddleOCR
        results = ocr.ocr(opencv_image, cls=True)
        
        # Procesar resultados
        plate_candidates = []
        
        if results and results[0]:
            for line in results[0]:
                bbox = line[0]
                text_info = line[1]
                text = text_info[0]
                confidence = text_info[1]
                
                # Limpiar texto
                clean_text = re.sub(r'[^A-Z0-9]', '', text.upper())
                
                # Verificar si es una placa boliviana (4 dígitos + 3 letras)
                bolivian_pattern = r'^[0-9]{4}[A-Z]{3}$'
                if re.match(bolivian_pattern, clean_text):
                    plate_candidates.append({
                        'plate': clean_text,
                        'confidence': confidence,
                        'bbox': bbox
                    })
                
                # También buscar patrones parciales
                elif len(clean_text) >= 6:
                    # Intentar extraer patrón boliviano
                    match = re.search(r'([0-9]{4}[A-Z]{3})', clean_text)
                    if match:
                        plate_candidates.append({
                            'plate': match.group(1),
                            'confidence': confidence * 0.8,  # Reducir confianza por extracción
                            'bbox': bbox
                        })
        
        # Retornar el mejor candidato
        if plate_candidates:
            best_candidate = max(plate_candidates, key=lambda x: x['confidence'])
            return {
                'success': True,
                'plate': best_candidate['plate'],
                'confidence': best_candidate['confidence'],
                'all_candidates': plate_candidates
            }
        else:
            return {
                'success': False,
                'message': 'No se encontraron placas válidas'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error en PaddleOCR: {str(e)}'
        }
`;

        // Ejecutar código Python
        pyodideInstance.runPython(pythonCode);
        
        setIsPaddleOCRReady(true);
        setProgress('✅ PaddleOCR listo');
        
      } catch (error) {
        console.error('Error inicializando PaddleOCR:', error);
        onError('Error inicializando PaddleOCR: ' + error);
        setProgress('❌ Error cargando PaddleOCR');
      }
    };

    initPaddleOCR();
  }, []);

  // Función para procesar imagen con PaddleOCR
  const processImageWithPaddleOCR = async () => {
    if (!imageData) return;

    setIsLoading(true);
    setProgress('🔍 Detectando placa con PaddleOCR...');

    try {
      // Importar Pyodide dinámicamente
      const { loadPyodide } = await import('pyodide');
      
      const pyodideInstance = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      });
      
      // Instalar dependencias
      await pyodideInstance.loadPackage(['paddlepaddle', 'paddleocr', 'opencv-python', 'pillow', 'numpy']);
      
      // Ejecutar detección
      const result = pyodideInstance.runPython(`
detect_plate_paddleocr('${imageData}')
`);

      if (result.success) {
        setProgress('✅ Placa detectada con PaddleOCR');
        onPlateDetected(result.plate, result.confidence);
      } else {
        onError('Error detectando placa: ' + result.message);
      }

    } catch (error) {
      console.error('Error procesando con PaddleOCR:', error);
      onError('Error procesando imagen: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex items-center space-x-2">
          {isPaddleOCRReady ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">PaddleOCR</h3>
        </div>
        <div className="text-sm text-gray-600">
          {isPaddleOCRReady ? 'Listo' : 'Cargando...'}
        </div>
      </div>

      {progress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">{progress}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>Ventajas de PaddleOCR:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>🚀 <strong>Alta precisión</strong> en detección de texto</li>
            <li>🎯 <strong>Optimizado para placas</strong> de vehículos</li>
            <li>📐 <strong>Detección de ángulos</strong> y rotaciones</li>
            <li>🔍 <strong>Múltiples idiomas</strong> soportados</li>
            <li>⚡ <strong>Procesamiento local</strong> sin credenciales</li>
          </ul>
        </div>

        <button
          onClick={processImageWithPaddleOCR}
          disabled={!imageData || isLoading}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
            imageData && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Procesando con PaddleOCR...</span>
            </div>
          ) : (
            '🚀 Procesar con PaddleOCR'
          )}
        </button>

        {!isPaddleOCRReady && (
          <div className="text-sm text-gray-500 text-center">
            <p>⏳ Cargando PaddleOCR...</p>
            <p className="text-xs mt-1">Esto puede tomar varios segundos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaddleOCR;
