import { useState, useEffect } from 'react';
import { Bug, CheckCircle, XCircle, AlertTriangle, RefreshCw, X, Server, Shield, Camera, Loader2 } from 'lucide-react';

interface CameraDebugProps {
  onClose: () => void;
}

const CameraDebug: React.FC<CameraDebugProps> = ({ onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isChecking, setIsChecking] = useState(false);

  const checkCameraSupport = async () => {
    setIsChecking(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine, 
    };

    // Verificar soporte de getUserMedia
    info.getUserMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // Verificar permisos de cámara
    if (navigator.permissions) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        info.cameraPermission = cameraPermission.state;
      } catch (e) {
        info.cameraPermission = 'No soportado';
      }
    } else {
      info.cameraPermission = 'API no disponible';
    }

    // Listar dispositivos de medios
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      info.mediaDevices = devices.filter(device => device.kind === 'videoinput').map(device => ({
        deviceId: device.deviceId,
        label: device.label || 'Cámara sin nombre',
        kind: device.kind
      }));
    } catch (e) {
      info.mediaDevices = 'Error al enumerar dispositivos';
    }

    // Verificar capacidades del navegador
    info.webRTCSupported = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
    info.mediaDevicesSupported = !!navigator.mediaDevices;
    info.getUserMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    setDebugInfo(info);
    setIsChecking(false);
  };

  useEffect(() => {
    checkCameraSupport();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-700' : 'text-red-700';
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bug className="h-6 w-6 text-blue-600" />
                Debug de Cámara
              </h2>
              <p className="text-sm text-gray-600 mt-1">Información técnica del sistema de cámara</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Información del Navegador */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Server className="h-5 w-5 text-gray-600" />
                Información del Navegador
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">User Agent</p>
                  <p className="font-mono text-xs break-all">{debugInfo.userAgent}</p>
                </div>
                <div>
                  <p className="text-gray-600">Plataforma</p>
                  <p className="font-medium">{debugInfo.platform}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cookies Habilitadas</p>
                  <p className="font-medium">{debugInfo.cookieEnabled ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <p className="text-gray-600">En Línea</p>
                  <p className="font-medium">{debugInfo.onLine ? 'Sí' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Soporte de APIs */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Soporte de APIs
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>WebRTC</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(debugInfo.webRTCSupported)}
                    <span className={getStatusColor(debugInfo.webRTCSupported)}>
                      {debugInfo.webRTCSupported ? 'Soportado' : 'No soportado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>MediaDevices API</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(debugInfo.mediaDevicesSupported)}
                    <span className={getStatusColor(debugInfo.mediaDevicesSupported)}>
                      {debugInfo.mediaDevicesSupported ? 'Soportado' : 'No soportado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>getUserMedia</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(debugInfo.getUserMediaSupported)}
                    <span className={getStatusColor(debugInfo.getUserMediaSupported)}>
                      {debugInfo.getUserMediaSupported ? 'Soportado' : 'No soportado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permisos */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-600" />
                Permisos de Cámara
              </h3>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-900">{debugInfo.cameraPermission || 'Verificando...'}</span>
              </div>
            </div>

            {/* Dispositivos de Cámara */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Camera className="h-5 w-5 text-green-600" />
                Cámaras Disponibles
              </h3>
              {Array.isArray(debugInfo.mediaDevices) ? (
                <div className="space-y-2">
                  {debugInfo.mediaDevices.map((device: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Camera className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{device.label}</p>
                          <p className="text-xs text-gray-500 font-mono">{device.deviceId.substring(0, 30)}...</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {debugInfo.mediaDevices.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="italic">No se encontraron cámaras</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">{debugInfo.mediaDevices}</p>
              )}
            </div>

            {/* Recomendaciones */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                Recomendaciones
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Asegúrate de que el navegador tenga permisos de cámara</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Usa HTTPS para acceso a la cámara (requerido en producción)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Verifica que no haya otras aplicaciones usando la cámara</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Prueba en diferentes navegadores si hay problemas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>En móviles, asegúrate de usar la cámara trasera</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 gap-3">
            <button
              onClick={checkCameraSupport}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Verificar Nuevamente
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <X className="h-4 w-4" />
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDebug;
