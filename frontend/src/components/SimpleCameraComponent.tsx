import React, { useRef, useState } from 'react';
import { Camera, CameraOff, Play } from 'lucide-react';

interface SimpleCameraComponentProps {
  onTextExtracted: (text: string) => void;
  onError: (error: string) => void;
}

const SimpleCameraComponent: React.FC<SimpleCameraComponentProps> = ({
  onTextExtracted,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      onError('Error al acceder a la cámara');
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

  // Capturar imagen
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Capturar imagen sin espejo
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Extraer texto automáticamente
    extractText(imageData);
  };

  // Extraer texto usando Tesseract.js básico
  const extractText = async (imageData: string) => {
    setIsLoading(true);
    try {
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng');
      
      // Configuración básica
      await worker.setParameters({
        psm: PSM.SINGLE_BLOCK, // Single uniform block
      });
      
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();
      
      const cleanText = text.trim();
      setExtractedText(cleanText);
      onTextExtracted(cleanText);
      
      console.log('📝 Texto extraído:', cleanText);
    } catch (error) {
      console.error('Error extrayendo texto:', error);
      onError('Error al extraer texto de la imagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controles de cámara */}
      <div className="flex gap-2">
        {!isActive ? (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Camera className="h-4 w-4" />
            Iniciar Cámara
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <CameraOff className="h-4 w-4" />
            Detener Cámara
          </button>
        )}
        
        {isActive && (
          <button
            onClick={captureImage}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Procesando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Capturar y Extraer Texto
              </>
            )}
          </button>
        )}
      </div>

      {/* Video */}
      {isActive && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-2xl rounded-lg border-2 border-gray-300"
          />
        </div>
      )}

      {/* Imagen capturada */}
      {capturedImage && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Imagen Capturada:</h3>
          <img
            src={capturedImage}
            alt="Imagen capturada"
            className="w-full max-w-md rounded-lg border-2 border-gray-300"
          />
        </div>
      )}

      {/* Texto extraído */}
      {extractedText && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Texto Extraído:</h3>
          <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
            <p className="text-lg font-mono">{extractedText}</p>
          </div>
        </div>
      )}

      {/* Canvas oculto para capturar */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SimpleCameraComponent;
