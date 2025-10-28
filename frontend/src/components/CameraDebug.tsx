import { useState, useEffect } from 'react';
import { Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Bug className="h-6 w-6 mr-2" />
              Debug de Cámara
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Información del Navegador */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Información del Navegador</h3>
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
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Soporte de APIs</h3>
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
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Permisos de Cámara</h3>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{debugInfo.cameraPermission || 'Verificando...'}</span>
              </div>
            </div>

            {/* Dispositivos de Cámara */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Cámaras Disponibles</h3>
              {Array.isArray(debugInfo.mediaDevices) ? (
                <div className="space-y-2">
                  {debugInfo.mediaDevices.map((device: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <p className="font-medium">{device.label}</p>
                        <p className="text-xs text-gray-500 font-mono">{device.deviceId}</p>
                      </div>
                    </div>
                  ))}
                  {debugInfo.mediaDevices.length === 0 && (
                    <p className="text-gray-500 italic">No se encontraron cámaras</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">{debugInfo.mediaDevices}</p>
              )}
            </div>

            {/* Recomendaciones */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Recomendaciones</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Asegúrate de que el navegador tenga permisos de cámara</li>
                <li>• Usa HTTPS para acceso a la cámara (requerido en producción)</li>
                <li>• Verifica que no haya otras aplicaciones usando la cámara</li>
                <li>• Prueba en diferentes navegadores si hay problemas</li>
                <li>• En móviles, asegúrate de usar la cámara trasera</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={checkCameraSupport}
              disabled={isChecking}
              className="btn-secondary mr-3"
            >
              {isChecking ? 'Verificando...' : 'Verificar Nuevamente'}
            </button>
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDebug;
