import { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { roboflowService } from '../services/roboflowService';
import toast from 'react-hot-toast';

interface LPRCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
}

const LPRCameraModal: React.FC<LPRCameraModalProps> = ({
  isOpen,
  onClose,
  onPlateDetected
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detectedPlate, setDetectedPlate] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Iniciar la cámara cuando el modal se abre
  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara');
      toast.error('Error al acceder a la cámara. Intenta subir una imagen.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureAndDetect = async () => {
    if (!videoRef.current) {
      toast.error('La cámara no está lista');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // 1. Capturar imagen desde el video
      const imageBase64 = roboflowService.captureFromVideo(videoRef.current);

      // 2. Mostrar la imagen capturada
      setCapturedImage(`data:image/jpeg;base64,${imageBase64}`);

      // 3. Enviar a Roboflow para detección
      toast.loading('Detectando placa...', { id: 'roboflow-detect' });

      const result = await roboflowService.detectPlate(imageBase64);

      toast.dismiss('roboflow-detect');

      if (!result.plateText) {
        toast.error('No se detectó ninguna placa en la imagen');
        setError('No se detectó ninguna placa. Intenta de nuevo con mejor iluminación.');
        setCapturedImage(null);
        return;
      }

      // 4. Mostrar resultado
      setDetectedPlate(result.plateText.toUpperCase());
      setConfidence(result.confidence);

      toast.success(`Placa detectada: ${result.plateText.toUpperCase()}`);

    } catch (err) {
      console.error('Error detecting plate:', err);
      setError('Error al detectar la placa. Por favor, intenta de nuevo.');
      toast.error('Error al detectar la placa');
      setCapturedImage(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // 1. Convertir archivo a base64
      const imageBase64 = await roboflowService.fileToBase64(file);

      // 2. Mostrar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 3. Enviar a Roboflow
      toast.loading('Detectando placa...', { id: 'roboflow-detect' });

      const result = await roboflowService.detectPlate(imageBase64);

      toast.dismiss('roboflow-detect');

      if (!result.plateText) {
        toast.error('No se detectó ninguna placa en la imagen');
        setError('No se detectó ninguna placa. Intenta con otra imagen.');
        setCapturedImage(null);
        return;
      }

      // 4. Mostrar resultado
      setDetectedPlate(result.plateText.toUpperCase());
      setConfidence(result.confidence);

      toast.success(`Placa detectada: ${result.plateText.toUpperCase()}`);

    } catch (err) {
      console.error('Error detecting plate from file:', err);
      setError('Error al procesar la imagen. Por favor, intenta de nuevo.');
      toast.error('Error al procesar la imagen');
      setCapturedImage(null);
    } finally {
      setProcessing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const confirmPlate = () => {
    if (!detectedPlate.trim()) {
      toast.error('No hay placa detectada');
      return;
    }

    onPlateDetected(detectedPlate.trim().toUpperCase());
    handleClose();
  };

  const retryCapture = () => {
    setCapturedImage(null);
    setDetectedPlate('');
    setConfidence(0);
    setError('');
  };

  const handleClose = () => {
    setDetectedPlate('');
    setConfidence(0);
    setError('');
    setCapturedImage(null);
    setMode('camera');
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Camera className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Reconocimiento Automático de Placas</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={processing}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Mode selector */}
          {!capturedImage && (
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => {
                  setMode('camera');
                  setError('');
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'camera'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                disabled={processing}
              >
                <Camera className="h-5 w-5" />
                Cámara
              </button>
              <button
                onClick={() => {
                  setMode('upload');
                  setError('');
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'upload'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                disabled={processing}
              >
                <Upload className="h-5 w-5" />
                Subir Imagen
              </button>
            </div>
          )}

          {/* Camera mode */}
          {mode === 'camera' && !capturedImage && (
            <>
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Overlay guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-dashed border-white/50 rounded-lg w-3/4 h-1/2 flex items-center justify-center">
                    <p className="text-white font-semibold bg-black/50 px-4 py-2 rounded-lg">
                      Posiciona la placa aquí
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={captureAndDetect}
                disabled={processing || !stream}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Detectando...
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6" />
                    Capturar y Detectar
                  </>
                )}
              </button>
            </>
          )}

          {/* Upload mode */}
          {mode === 'upload' && !capturedImage && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer"
              >
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Click para subir una imagen
                </p>
                <p className="text-sm text-gray-500">
                  Formatos soportados: JPG, PNG, WEBP
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Result display */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full object-contain max-h-96"
                />
              </div>

              {detectedPlate ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Placa detectada exitosamente</p>
                      <p className="text-sm text-green-600">Confianza: {(confidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Placa detectada (puedes editar si es necesario):
                      </label>
                      <input
                        type="text"
                        value={detectedPlate}
                        onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-2xl font-bold text-center uppercase tracking-wider focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                        placeholder="PLACA"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={retryCapture}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                      >
                        Capturar de Nuevo
                      </button>
                      <button
                        onClick={confirmPlate}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5" />
                        Confirmar e Ingresar
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Instructions */}
          {!capturedImage && !error && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Instrucciones:</span>{' '}
                {mode === 'camera'
                  ? 'Posiciona la placa del vehículo dentro del recuadro y presiona "Capturar y Detectar". El sistema detectará automáticamente el número de placa.'
                  : 'Sube una imagen clara de la placa del vehículo. El sistema detectará automáticamente el número de placa.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LPRCameraModal;
