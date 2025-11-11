import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Eye, Zap, AlertCircle } from 'lucide-react';

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
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            {isEasyOCRReady ? (
              <CheckCircle className="h-5 w-5 text-white" />
            ) : (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              EasyOCR
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEasyOCRReady ? 'Listo para procesar' : 'Inicializando...'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isEasyOCRReady 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {isEasyOCRReady ? 'Listo' : 'Cargando'}
        </div>
      </div>

      {progress && (
        <div className={`mb-4 p-3 rounded-lg border-2 ${
          progress.includes('✅') 
            ? 'bg-green-50 border-green-200' 
            : progress.includes('❌')
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-sm font-medium flex items-center gap-2 ${
            progress.includes('✅') 
              ? 'text-green-800' 
              : progress.includes('❌')
              ? 'text-red-800'
              : 'text-blue-800'
          }`}>
            {progress.includes('✅') ? (
              <CheckCircle className="h-4 w-4" />
            ) : progress.includes('❌') ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {progress.replace(/[🐍📦📚🔧✅❌]/g, '').trim()}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            Ventajas de EasyOCR:
          </p>
          <ul className="text-sm text-gray-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span><strong>IA avanzada</strong> para reconocimiento de texto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span><strong>Multiidioma</strong> con soporte para múltiples idiomas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span><strong>Detección de bounding boxes</strong> precisos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span><strong>Alta precisión</strong> en caracteres complejos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span><strong>Procesamiento local</strong> sin servidor</span>
            </li>
          </ul>
        </div>

        <button
          onClick={processImageWithEasyOCR}
          disabled={!imageData || isLoading}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            imageData && !isLoading
              ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 shadow-md hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Procesando con EasyOCR...</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Procesar con EasyOCR</span>
            </>
          )}
        </button>

        {!isEasyOCRReady && (
          <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Loader2 className="h-6 w-6 mx-auto mb-2 text-yellow-600 animate-spin" />
            <p className="text-sm text-yellow-800 font-medium">Cargando EasyOCR...</p>
            <p className="text-xs text-yellow-700 mt-1">Esto puede tomar varios segundos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EasyOCR;
