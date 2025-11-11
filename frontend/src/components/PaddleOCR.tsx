import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Rocket, Zap, AlertCircle } from 'lucide-react';

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
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            {isPaddleOCRReady ? (
              <CheckCircle className="h-5 w-5 text-white" />
            ) : (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-600" />
              PaddleOCR
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isPaddleOCRReady ? 'Listo para procesar' : 'Inicializando...'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isPaddleOCRReady 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {isPaddleOCRReady ? 'Listo' : 'Cargando'}
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            Ventajas de PaddleOCR:
          </p>
          <ul className="text-sm text-gray-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Alta precisión</strong> en detección de texto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Optimizado para placas</strong> de vehículos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Detección de ángulos</strong> y rotaciones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Múltiples idiomas</strong> soportados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Procesamiento local</strong> sin credenciales</span>
            </li>
          </ul>
        </div>

        <button
          onClick={processImageWithPaddleOCR}
          disabled={!imageData || isLoading}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            imageData && !isLoading
              ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Procesando con PaddleOCR...</span>
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              <span>Procesar con PaddleOCR</span>
            </>
          )}
        </button>

        {!isPaddleOCRReady && (
          <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Loader2 className="h-6 w-6 mx-auto mb-2 text-yellow-600 animate-spin" />
            <p className="text-sm text-yellow-800 font-medium">Cargando PaddleOCR...</p>
            <p className="text-xs text-yellow-700 mt-1">Esto puede tomar varios segundos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaddleOCR;
