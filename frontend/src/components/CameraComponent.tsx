import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle, Bug, Upload, X } from 'lucide-react';
import CameraDebug from './CameraDebug';
import toast from 'react-hot-toast';

interface CameraComponentProps {
  onTextDetected: (text: string, imageData: string) => void;
  onError: (error: string) => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onTextDetected, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showProcessedImage, setShowProcessedImage] = useState(false);
  const [useFullImage, setUseFullImage] = useState(false);
  const [useSmartCrop] = useState(false); // Desactivado temporalmente
  const [showSideBySide, setShowSideBySide] = useState(false); // Nueva opción para mostrar lado a lado

  const startCamera = async () => {
    try {
      setError(null);
      setIsStarting(true);
      console.log('🎥 Iniciando cámara...');
      
      // Verificar si getUserMedia está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia no está soportado en este navegador');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Usar cámara trasera en móviles
        }
      });

      console.log('✅ Stream obtenido:', stream);
      
      // Guardar el stream
      streamRef.current = stream;
      
      // Configurar el video INMEDIATAMENTE después de obtener el stream
      const configureVideoElement = () => {
        if (videoRef.current && streamRef.current) {
          console.log('📹 Configurando elemento video directamente...');
          
          // Asignar el stream al elemento video
          videoRef.current.srcObject = streamRef.current;
          
          // Configurar eventos
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ Video metadata cargado');
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                console.log('✅ Video reproduciéndose exitosamente');
                setIsActive(true);
                setIsStarting(false);
              }).catch((playError) => {
                console.error('❌ Error al reproducir video:', playError);
                setError('Error al reproducir el video de la cámara');
                setIsStarting(false);
              });
            }
          };
          
          videoRef.current.onerror = (videoError) => {
            console.error('❌ Error en elemento video:', videoError);
            setError('Error en el elemento de video');
            setIsStarting(false);
          };
          
          // Si el video ya tiene metadatos cargados, reproducir inmediatamente
          if (videoRef.current.readyState >= 1) {
            videoRef.current.play().then(() => {
              console.log('✅ Video reproduciéndose (metadatos ya cargados)');
              setIsActive(true);
              setIsStarting(false);
            }).catch((playError) => {
              console.error('❌ Error al reproducir video (metadatos cargados):', playError);
              setError('Error al reproducir el video de la cámara');
              setIsStarting(false);
            });
          }
        } else {
          console.error('❌ No se puede configurar: videoRef o streamRef es null');
          console.log('🔍 Debug info:', {
            videoRef: videoRef.current,
            streamRef: streamRef.current,
            isActive,
            isStarting
          });
          setError('Error: elemento de video no disponible');
          setIsStarting(false);
        }
      };

      // Configurar inmediatamente
      configureVideoElement();
      
      // También intentar después de un pequeño delay por si acaso
      setTimeout(configureVideoElement, 100);
      
    } catch (err: any) {
      console.error('❌ Error al iniciar cámara:', err);
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en el dispositivo.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'La cámara no es compatible con este navegador.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      }
      
      setError(errorMessage);
      onError(errorMessage);
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    console.log('🛑 Deteniendo cámara...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('🛑 Deteniendo track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    console.log('✅ Cámara detenida');
  };

  const captureImage = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Aplicar espejo horizontal para corregir la imagen capturada
    context.save();
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.restore();

    // Convertir a base64 con mayor calidad para mejor OCR
    return canvas.toDataURL('image/jpeg', 0.95);
  };



  // Función para detectar bordes de caracteres y recortar inteligentemente
  const detectCharacterBounds = (imageData: string): Promise<{x: number, y: number, width: number, height: number} | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData_filtered = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData_filtered.data;

        // Convertir a escala de grises y detectar bordes
        let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
        let hasText = false;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Detectar si es texto (más estricto para placas)
            const gray = (r + g + b) / 3;
            const isText = gray < 150; // Más estricto para detectar solo texto oscuro
            
            if (isText) {
              hasText = true;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }

        if (!hasText) {
          console.log('❌ No se detectaron caracteres');
          resolve(null);
          return;
        }

        // Agregar padding mínimo alrededor de los caracteres (solo 5px)
        const padding = 5;
        const bounds = {
          x: Math.max(0, minX - padding),
          y: Math.max(0, minY - padding),
          width: Math.min(canvas.width - (minX - padding), maxX - minX + (padding * 2)),
          height: Math.min(canvas.height - (minY - padding), maxY - minY + (padding * 2))
        };

        console.log('🎯 Bordes de caracteres detectados:', {
          originalBounds: { minX, maxX, minY, maxY },
          paddedBounds: bounds,
          characterSize: `${maxX - minX}x${maxY - minY}`,
          reduction: `${Math.round((1 - bounds.width/canvas.width) * 100)}% menos ancho`
        });

        resolve(bounds);
      };
      img.src = imageData;
    });
  };

  // Función para preprocesar imagen y mejorar OCR
  const preprocessImage = (imageData: string, region?: {x: number, y: number, width: number, height: number}): Promise<string> => {
    return new Promise(async (resolve) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(imageData);
          return;
        }

        // Si tenemos región específica, recortar
        if (region) {
          canvas.width = region.width;
          canvas.height = region.height;
          ctx.drawImage(img, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        }

        // Detectar bordes de caracteres para recorte inteligente (solo si está habilitado)
        if (useSmartCrop) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            const tempImageData = tempCanvas.toDataURL('image/jpeg', 0.95);
            
            const characterBounds = await detectCharacterBounds(tempImageData);
            
            if (characterBounds) {
              // Recortar solo los caracteres detectados
              const finalCanvas = document.createElement('canvas');
              const finalCtx = finalCanvas.getContext('2d');
              
              if (finalCtx) {
                finalCanvas.width = characterBounds.width;
                finalCanvas.height = characterBounds.height;
                finalCtx.drawImage(
                  canvas, 
                  characterBounds.x, characterBounds.y, characterBounds.width, characterBounds.height,
                  0, 0, characterBounds.width, characterBounds.height
                );
                
                // Usar el canvas recortado
                canvas.width = characterBounds.width;
                canvas.height = characterBounds.height;
                ctx.drawImage(finalCanvas, 0, 0);
                
                console.log('✂️ Imagen recortada a caracteres:', {
                  originalSize: `${tempCanvas.width}x${tempCanvas.height}`,
                  croppedSize: `${characterBounds.width}x${characterBounds.height}`,
                  reduction: `${Math.round((1 - characterBounds.width/tempCanvas.width) * 100)}% menos área`
                });
              }
            }
          }
        }

        // Aplicar filtros para mejorar OCR
        const imageData_filtered = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData_filtered.data;

        // Preprocesamiento optimizado para caracteres grandes de placas
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convertir a escala de grises
          const gray = (r * 0.299 + g * 0.587 + b * 0.114);
          
          // Detectar texto azul característico de placas bolivianas
          const isBlueText = b > r && b > g && b > 100 && r < 150 && g < 150;
          
          // Detectar fondo blanco/plateado de placas
          const isWhiteBackground = r > 200 && g > 200 && b > 200;
          
          // Detectar caracteres grandes con alto contraste
          const contrast = Math.max(r, g, b) - Math.min(r, g, b);
          const isHighContrast = contrast > 100;
          
          if (isBlueText && isHighContrast) {
            // Convertir texto azul a negro puro para mejor OCR
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
          } else if (isWhiteBackground) {
            // Convertir fondo blanco a blanco puro
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
          } else {
            // Para otros colores, usar binarización con umbral alto para caracteres grandes
            const threshold = 150; // Umbral alto para enfocarse en caracteres grandes
            const binaryValue = gray < threshold ? 0 : 255;
            
            data[i] = binaryValue;     // R
            data[i + 1] = binaryValue; // G
            data[i + 2] = binaryValue; // B
          }
          // data[i + 3] mantiene alpha
        }

        ctx.putImageData(imageData_filtered, 0, 0);

        // Convertir a base64 con alta calidad
        const processedImage = canvas.toDataURL('image/jpeg', 0.95);
        console.log('🔧 Imagen preprocesada (recorte inteligente):', {
          originalSize: imageData.length,
          processedSize: processedImage.length,
          dimensions: `${canvas.width}x${canvas.height}`
        });
        
        // Guardar imagen preprocesada para mostrar en la UI
        setProcessedImage(processedImage);
        
        resolve(processedImage);
      };
      img.src = imageData;
    });
  };

  const pauseAndCapture = () => {
    if (!isActive || isDetecting) return;

    console.log('⏸️ Pausando imagen para captura...');
    
    // Capturar imagen inmediatamente
    const imageData = captureImage();
    if (!imageData) {
      console.error('❌ No se pudo capturar la imagen');
      onError('No se pudo capturar la imagen');
      return;
    }

    // Pausar el video
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // Guardar imagen capturada y cambiar estado
    setCapturedImage(imageData);
    setIsPaused(true);
    
    console.log('✅ Imagen pausada y capturada');
  };

  const resumeVideo = () => {
    console.log('▶️ Reanudando video...');
    
    if (videoRef.current) {
      videoRef.current.play();
    }
    
    setCapturedImage(null);
    setIsPaused(false);
    
    console.log('✅ Video reanudado');
  };

  const detectText = async () => {
    if (isDetecting) return;

    setIsDetecting(true);
    
    try {
      let imageData = capturedImage;

      // Si no hay imagen capturada, intentar capturar desde cámara
      if (!imageData && isActive) {
      if (!isPaused) {
        pauseAndCapture();
        await new Promise(resolve => setTimeout(resolve, 100));
        }
        imageData = capturedImage || captureImage();
      }

      // Si hay imagen subida, usarla
      if (uploadedImage) {
        imageData = uploadedImage;
      }

      if (!imageData) {
        throw new Error('No se pudo obtener la imagen para procesar');
      }

      console.log('🔧 Preprocesando imagen...');
      const processedImageData = await preprocessImage(imageData);

      console.log('🔍 Iniciando OCR con imagen preprocesada...');

      // Guardar imagen procesada para mostrar
      setProcessedImage(processedImageData);

      // Realizar OCR simple
      const extractedText = await extractTextSimple(processedImageData);
      
      console.log('📝 Texto extraído:', extractedText);
      
      // Enviar resultado al componente padre
      onTextDetected(extractedText, imageData);
      
      // Si estaba usando cámara, reanudar video
      if (isActive && !uploadedImage) {
        resumeVideo();
      }
      
    } catch (err) {
      console.error('Error al extraer texto:', err);
      onError('Error al procesar la imagen');
      
      // Si estaba usando cámara, reanudar video
      if (isActive && !uploadedImage) {
      resumeVideo();
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Función para procesar archivo de imagen
  const processImageFile = (file: File) => {
    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      onError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Verificar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('La imagen es demasiado grande. Máximo 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setCapturedImage(result);
      setShowUpload(false);
      toast.success('Imagen cargada exitosamente');
    };
    reader.onerror = () => {
      onError('Error al cargar la imagen');
    };
    reader.readAsDataURL(file);
  };

  // Función para manejar subida de archivos
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  // Funciones para drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Función para filtrar solo caracteres grandes (placas) - NO USADA
  // const filterLargeCharacters = (text: string): string => {
  //   // Eliminar texto pequeño común en placas
  //   const smallText = ['BOLIVIA', 'L', 'R', 'E', 'A', 'O', 'U', 'I'];
  //   
  //   // Dividir en palabras y filtrar
  //   const words = text.split(/\s+/);
  //   const filteredWords = words.filter(word => {
  //     const cleanWord = word.replace(/[^A-Z0-9]/g, '');
  //     
  //     // Eliminar palabras muy pequeñas o texto común
  //     if (cleanWord.length < 3 || smallText.some(small => cleanWord.includes(small))) {
  //       return false;
  //     }
  //     
  //     // Mantener solo patrones de placas
  //     return /^\d{3,4}[A-Z]{3}$|^[A-Z]{3}\d{3,4}$/.test(cleanWord);
  //   });
  //   
  //   return filteredWords.join(' ').trim();
  // };

  // Función para extraer texto usando solo Tesseract.js (más confiable)
  const extractTextSimple = async (imageData: string): Promise<string> => {
    try {
      console.log('🔍 Extrayendo texto con Tesseract.js...');
      
      // Usar directamente Tesseract.js que ya funciona bien
      return await extractTextTesseractFallback(imageData);
      
    } catch (error: any) {
      console.error('❌ Error con Tesseract.js:', error);
      return 'No se detectó texto';
    }
  };

  // Función de fallback usando Tesseract.js
  const extractTextTesseractFallback = async (imageData: string): Promise<string> => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      
      await worker.setParameters({
        tessedit_pageseg_mode: 8, // Single word
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      } as any);
      
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();
      
      console.log('🔍 Fallback Tesseract:', text);
      
      // Limpiar texto
      const cleanText = text
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9]/g, '')
        .toUpperCase();
      
      // Buscar patrones de placas
      const platePatterns = [
        /(\d{3}[A-Z]{3})/, // 3 dígitos + 3 letras
        /(\d{4}[A-Z]{3})/, // 4 dígitos + 3 letras
      /([A-Z]{3}\d{3})/, // 3 letras + 3 dígitos
    ];
    
      for (const pattern of platePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
      return cleanText.length >= 4 ? cleanText : 'No se detectó texto';
      
    } catch (error) {
      console.error('Error en fallback Tesseract:', error);
      return 'Error al extraer texto';
    }
  };



  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cámara LPR</h3>
        <div className="flex space-x-2">
          {!isActive ? (
            <>
            <button
              onClick={startCamera}
              disabled={isStarting}
              className={`btn-primary flex items-center space-x-2 ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera className="h-4 w-4" />
              <span>{isStarting ? 'Iniciando...' : 'Iniciar Cámara'}</span>
            </button>
              <button
                onClick={() => setShowUpload(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Subir Imagen</span>
              </button>
            </>
          ) : (
            <button
              onClick={stopCamera}
              className="btn-secondary flex items-center space-x-2"
            >
              <CameraOff className="h-4 w-4" />
              <span>Detener Cámara</span>
            </button>
          )}
          <button
            onClick={() => setShowDebug(true)}
            className="btn-secondary flex items-center space-x-2"
            title="Debug de Cámara"
          >
            <Bug className="h-4 w-4" />
            <span>Debug</span>
          </button>
          {processedImage && (
            <button
              onClick={() => setShowProcessedImage(!showProcessedImage)}
              className="btn-secondary flex items-center space-x-2"
              title="Ver Imagen Procesada"
            >
              <span>🔍</span>
              <span>Ver Procesada</span>
            </button>
          )}
          
          {/* Indicador de stream */}
          {streamRef.current && (
            <div className="flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Stream: ✓
            </div>
          )}
          {isPaused && (
            <button
              onClick={() => setUseFullImage(!useFullImage)}
              className={`btn-secondary flex items-center space-x-2 ${
                useFullImage ? 'bg-blue-600 text-white' : ''
              }`}
              title={useFullImage ? "Usar región de interés" : "Usar imagen completa"}
            >
              <span>{useFullImage ? '🎯' : '🖼️'}</span>
              <span>{useFullImage ? 'Región ROI' : 'Imagen Completa'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Layout mejorado: Video a la izquierda, detección a la derecha */}
      <div className={`${showSideBySide ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'block'}`}>
        {/* Columna izquierda: Video principal */}
        <div className="relative">
          <h4 className="text-sm font-medium text-gray-700 mb-2">📹 Video en Vivo</h4>
          
          {/* Elemento video siempre presente pero oculto cuando no está activo */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-80 rounded-lg object-cover ${
              isActive && !isPaused ? 'bg-gray-900' : 'hidden'
            }`}
            style={{ transform: 'scaleX(-1)' }} // Espejo para mejor UX
          />
          
          {/* Imagen pausada */}
          {isPaused && capturedImage && (
            <div className="w-full h-80 rounded-lg overflow-hidden relative border-2 border-orange-500">
              <img
                src={capturedImage}
                alt="Imagen capturada"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} // Espejo para consistencia
              />
              <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                ⏸️ Imagen Pausada
              </div>
              <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                Tamaño Real
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Detección y procesamiento */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">🔍 Detección y Procesamiento</h4>
          
          {/* Imagen procesada - Siempre visible cuando existe */}
          {processedImage && (
            <div className="w-full h-80 rounded-lg overflow-hidden relative border-2 border-blue-500">
              <img
                src={processedImage}
                alt="Imagen procesada para OCR"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} // Espejo para consistencia
              />
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                🔍 Imagen Procesada
              </div>
              <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                OCR Input
              </div>
              <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                Preprocesamiento: Azul→Negro, Blanco→Blanco
              </div>
            </div>
          )}
          
          {/* Placeholder cuando no hay imagen procesada */}
          {!processedImage && (
            <div className="w-full h-80 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-sm font-medium">Imagen Preprocesada</p>
                <p className="text-xs mt-1">Se mostrará aquí después de detectar una placa</p>
              </div>
            </div>
          )}

          {/* Información de detección */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">📊 Estado de Detección</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cámara:</span>
                <span className={`font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {isActive ? '✅ Activa' : '❌ Inactiva'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stream:</span>
                <span className={`font-medium ${streamRef.current ? 'text-green-600' : 'text-red-600'}`}>
                  {streamRef.current ? '✅ Conectado' : '❌ Desconectado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className={`font-medium ${isPaused ? 'text-orange-600' : 'text-blue-600'}`}>
                  {isPaused ? '⏸️ Pausado' : '▶️ En Vivo'}
                </span>
              </div>
              {processedImage && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Imagen Procesada:</span>
                  <span className="font-medium text-green-600">✅ Lista</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Información del preprocesamiento */}
          {processedImage && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">🔧 Preprocesamiento Aplicado</h5>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Filtro de color:</span>
                  <span className="font-medium">Azul → Negro</span>
        </div>
                <div className="flex justify-between">
                  <span>Fondo:</span>
                  <span className="font-medium">Blanco → Blanco puro</span>
                </div>
                <div className="flex justify-between">
                  <span>Contraste:</span>
                  <span className="font-medium">Mejorado</span>
                </div>
                <div className="flex justify-between">
                  <span>Binarización:</span>
                  <span className="font-medium">Activada</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimizado para:</span>
                  <span className="font-medium">Placas bolivianas</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles de visualización */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setShowSideBySide(!showSideBySide)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showSideBySide 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showSideBySide ? '📱 Vista Simple' : '🖥️ Vista Lado a Lado'}
        </button>
        
        {processedImage && (
          <button
            onClick={() => setShowProcessedImage(!showProcessedImage)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showProcessedImage 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showProcessedImage ? '👁️ Ocultar Procesada' : '🔍 Ver Procesada'}
          </button>
        )}
      </div>

      {/* Botones de control principales */}
      {isActive ? (
          <div className="relative">
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              ● Cámara Activa
            </div>
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
              Stream: {streamRef.current ? '✅' : '❌'}
            </div>
            <div className="absolute inset-0 flex items-center justify-center space-x-4">
              {!isPaused ? (
                <button
                  onClick={pauseAndCapture}
                  disabled={isDetecting}
                  className={`px-6 py-3 rounded-full font-medium transition-colors shadow-lg ${
                    isDetecting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  ⏸️ Pausar y Capturar
                </button>
              ) : (
                <>
                  <button
                    onClick={detectText}
                    disabled={isDetecting}
                    className={`px-6 py-3 rounded-full font-medium transition-colors shadow-lg ${
                      isDetecting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isDetecting ? 'Extrayendo...' : '🔍 Extraer Texto'}
                  </button>
                  <button
                    onClick={resumeVideo}
                    disabled={isDetecting}
                    className="px-6 py-3 rounded-full font-medium transition-colors shadow-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    ▶️ Reanudar
                  </button>
                </>
              )}
            </div>
          </div>
          
        ) : isStarting ? (
          <div className="w-full h-64 bg-blue-50 rounded-lg flex items-center justify-center border-2 border-blue-200">
            <div className="text-center text-blue-600">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-medium mb-2">Iniciando Cámara...</p>
              <p className="text-sm">Esperando permisos y configuración</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Cámara No Activa</p>
              <p className="text-sm">Haz clic en "Iniciar Cámara" para comenzar</p>
            </div>
          </div>
        )}

        {/* Canvas oculto para capturar imágenes */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Botón para procesar imagen subida */}
        {uploadedImage && (
          <div className="mt-4 text-center">
            <button
              onClick={detectText}
              disabled={isDetecting}
              className={`px-6 py-3 rounded-full font-medium transition-colors shadow-lg ${
                isDetecting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isDetecting ? 'Procesando...' : '🤖 Procesar Imagen con IA'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Imagen subida lista para procesar
            </p>
          </div>
        )}

      {/* Instrucciones mejoradas */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">📋 Instrucciones de Uso</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span><strong>Cámara Activa</strong> - Video en tiempo real</span>
            </div>
            <div className="flex items-center">
              <span className="text-orange-600 mr-2">⏸️</span>
              <span><strong>Paso 1:</strong> Haz clic en "Pausar y Capturar" para fijar la imagen</span>
            </div>
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">🔍</span>
              <span><strong>Paso 2:</strong> Haz clic en "Extraer Texto" para analizar solo caracteres grandes</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">▶️</span>
              <span><strong>Paso 3:</strong> Haz clic en "Reanudar" para volver al video</span>
            </div>
            <div className="flex items-center">
              <span className="text-purple-600 mr-2">✂️</span>
              <span><strong>Recorte Inteligente:</strong> Detecta automáticamente los caracteres</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">💡</span>
              <span><strong>Tip:</strong> Funciona mejor con imagen fija y buena iluminación</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Debug */}
      {showDebug && (
        <CameraDebug onClose={() => setShowDebug(false)} />
      )}

      {/* Modal de Subida de Archivos */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">📁 Subir Imagen</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona una imagen de placa para procesar. Formatos soportados: JPG, PNG, GIF (máximo 10MB)
              </p>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Seleccionar Imagen
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  O arrastra y suelta una imagen aquí
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraComponent;
