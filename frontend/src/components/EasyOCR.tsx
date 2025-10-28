import { useEffect, useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

interface EasyOCRProps {
  imageData: string;
  onPlateDetected: (plate: string, confidence: number) => void;
  onError: (error: string) => void;
}

const EasyOCR: React.FC<EasyOCRProps> = ({ imageData, onPlateDetected, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEasyOCRReady, setIsEasyOCRReady] = useState(false);
  const [progress, setProgress] = useState('');

  // Inicializar EasyOCR
  useEffect(() => {
    const initEasyOCR = async () => {
      try {
        setProgress('🐍 Cargando EasyOCR...');
        
        // Importar Pyodide dinámicamente
        const { loadPyodide } = await import('pyodide');
        
        setProgress('📦 Inicializando Pyodide...');
        const pyodideInstance = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        setProgress('📚 Instalando EasyOCR...');
        
        // Instalar EasyOCR y dependencias
        await pyodideInstance.loadPackage(['easyocr', 'opencv-python', 'pillow', 'numpy']);
        
        setProgress('🔧 Configurando EasyOCR...');
        
        // Código Python para EasyOCR específico de placas
        const pythonCode = `
import easyocr
import cv2
import numpy as np
from PIL import Image
import io
import base64
import re

# Inicializar EasyOCR (solo una vez)
reader = None

def init_easyocr():
    global reader
    if reader is None:
        reader = easyocr.Reader(['en'], gpu=False)  # Sin GPU para web
    return reader

def detect_plate_easyocr(image_base64):
    """
    Función para detectar placas usando EasyOCR
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
        
        # Inicializar EasyOCR
        reader = init_easyocr()
        
        # Detectar texto con EasyOCR
        results = reader.readtext(opencv_image)
        
        # Procesar resultados
        plate_candidates = []
        
        for (bbox, text, confidence) in results:
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
            'message': f'Error en EasyOCR: {str(e)}'
        }
`;

        // Ejecutar código Python
        pyodideInstance.runPython(pythonCode);
        
        setIsEasyOCRReady(true);
        setProgress('✅ EasyOCR listo');
        
      } catch (error) {
        console.error('Error inicializando EasyOCR:', error);
        onError('Error inicializando EasyOCR: ' + error);
        setProgress('❌ Error cargando EasyOCR');
      }
    };

    initEasyOCR();
  }, []);

  // Función para procesar imagen con EasyOCR
  const processImageWithEasyOCR = async () => {
    if (!imageData) return;

    setIsLoading(true);
    setProgress('🔍 Detectando placa con EasyOCR...');

    try {
      // Importar Pyodide dinámicamente
      const { loadPyodide } = await import('pyodide');
      
      const pyodideInstance = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      });
      
      // Instalar dependencias
      await pyodideInstance.loadPackage(['easyocr', 'opencv-python', 'pillow', 'numpy']);
      
      // Ejecutar detección
      const result = pyodideInstance.runPython(`
detect_plate_easyocr('${imageData}')
`);

      if (result.success) {
        setProgress('✅ Placa detectada con EasyOCR');
        onPlateDetected(result.plate, result.confidence);
      } else {
        onError('Error detectando placa: ' + result.message);
      }

    } catch (error) {
      console.error('Error procesando con EasyOCR:', error);
      onError('Error procesando imagen: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex items-center space-x-2">
          {isEasyOCRReady ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">EasyOCR</h3>
        </div>
        <div className="text-sm text-gray-600">
          {isEasyOCRReady ? 'Listo' : 'Cargando...'}
        </div>
      </div>

      {progress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">{progress}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>Ventajas de EasyOCR:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>🎯 <strong>IA avanzada</strong> para reconocimiento de texto</li>
            <li>🌍 <strong>Multiidioma</strong> con soporte para múltiples idiomas</li>
            <li>📐 <strong>Detección de bounding boxes</strong> precisos</li>
            <li>🔍 <strong>Alta precisión</strong> en caracteres complejos</li>
            <li>⚡ <strong>Procesamiento local</strong> sin servidor</li>
          </ul>
        </div>

        <button
          onClick={processImageWithEasyOCR}
          disabled={!imageData || isLoading}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
            imageData && !isLoading
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Procesando con EasyOCR...</span>
            </div>
          ) : (
            '🔍 Procesar con EasyOCR'
          )}
        </button>

        {!isEasyOCRReady && (
          <div className="text-sm text-gray-500 text-center">
            <p>⏳ Cargando EasyOCR...</p>
            <p className="text-xs mt-1">Esto puede tomar varios segundos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EasyOCR;
