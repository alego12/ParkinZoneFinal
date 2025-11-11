import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, X, Upload, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface LPRCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
  onError: (error: string) => void;
}

const LPRCameraModal: React.FC<LPRCameraModalProps> = ({
  isOpen,
  onClose,
  onPlateDetected,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);

  // Limpiar al cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setDetectedPlate(null);
    }
  }, [isOpen]);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Preferir cámara trasera en móviles
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      onError('Error al acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
    }
  };

  // Capturar imagen desde video
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Procesar imagen automáticamente
    processImageForLPR(imageData);
  };

  // Manejar carga de archivo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      processImageForLPR(imageData);
    };
    reader.onerror = () => {
      onError('Error al leer el archivo de imagen');
    };
    reader.readAsDataURL(file);
  };

  // Procesar imagen con servicio de reconocimiento de placas
  const processImageForLPR = async (imageData: string) => {
    setIsProcessing(true);
    setDetectedPlate(null);

    try {
      // Convertir base64 a Blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('image', blob, 'plate-image.jpg');

      // Llamar al servicio de reconocimiento de placas
      const result = await api.lpr.recognizePlate(formData);
      
      const plate = result.data?.plate || result.data?.plateNumber;
      
      if (plate) {
        const cleanPlate = plate.trim().toUpperCase();
        setDetectedPlate(cleanPlate);
        // Auto-cerrar después de un breve delay y pasar la placa
        setTimeout(() => {
          onPlateDetected(cleanPlate);
          onClose();
        }, 1000);
      } else {
        onError('No se pudo detectar una placa en la imagen. Intenta con otra foto.');
      }
    } catch (error: any) {
      console.error('Error procesando imagen para LPR:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al procesar la imagen. Verifica la conexión con el servicio.';
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirmar placa detectada manualmente
  const handleConfirmPlate = () => {
    if (detectedPlate) {
      onPlateDetected(detectedPlate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Reconocimiento de Placa por Cámara
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Controles de cámara */}
          <div className="flex flex-wrap gap-3">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={isProcessing}
              >
                <Camera className="h-4 w-4" />
                Iniciar Cámara
              </button>
            ) : (
              <>
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={isProcessing}
                >
                  <CameraOff className="h-4 w-4" />
                  Detener Cámara
                </button>
                <button
                  onClick={captureImage}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  Capturar Foto
                </button>
              </>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Subir Imagen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
          </div>

          {/* Video */}
          {isActive && !capturedImage && (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-96 object-contain"
              />
            </div>
          )}

          {/* Imagen capturada */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Imagen capturada"
                  className="w-full max-h-96 object-contain mx-auto"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Procesando imagen...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Placa detectada */}
              {detectedPlate && !isProcessing && (
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Placa detectada:</p>
                  <p className="text-2xl font-bold font-mono text-green-700 mb-3">
                    {detectedPlate}
                  </p>
                  <button
                    onClick={handleConfirmPlate}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Confirmar y Procesar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Instrucciones */}
          {!capturedImage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Instrucciones:</strong> Inicia la cámara o sube una imagen de la placa del vehículo. 
                El sistema procesará la imagen automáticamente para detectar el número de placa.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Canvas oculto para capturar */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default LPRCameraModal;

