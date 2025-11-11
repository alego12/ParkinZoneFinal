import React, { useRef, useState } from 'react';
import { Camera, CameraOff, Play, Loader2, Image, FileText } from 'lucide-react';

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
      <div className="flex gap-2 flex-wrap">
        {!isActive ? (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Camera className="h-4 w-4" />
            Iniciar Cámara
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
          >
            <CameraOff className="h-4 w-4" />
            Detener Cámara
          </button>
        )}
        
        {isActive && (
          <button
            onClick={captureImage}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
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
        <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-2xl rounded-lg"
          />
        </div>
      )}

      {/* Imagen capturada */}
      {capturedImage && (
        <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Image className="h-5 w-5 text-blue-600" />
            Imagen Capturada
          </h3>
          <img
            src={capturedImage}
            alt="Imagen capturada"
            className="w-full max-w-md rounded-lg border-2 border-gray-300 shadow-md"
          />
        </div>
      )}

      {/* Texto extraído */}
      {extractedText && (
        <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Texto Extraído
          </h3>
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300">
            <p className="text-lg font-mono text-gray-900 font-semibold tracking-wider">{extractedText}</p>
          </div>
        </div>
      )}

      {/* Canvas oculto para capturar */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SimpleCameraComponent;
