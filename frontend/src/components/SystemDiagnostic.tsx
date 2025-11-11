import { useState } from 'react';
import { api } from '../services/api';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Activity, Server, Database, Calendar, Car } from 'lucide-react';
import toast from 'react-hot-toast';

interface DiagnosticResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const SystemDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setDiagnostics([]);
    
    const results: DiagnosticResult[] = [];

    try {
      // Test 1: Verificar conexión al servidor
      try {
        await api.auth.me();
        results.push({
          status: 'success',
          message: 'Conexión al servidor establecida correctamente'
        });
      } catch (error: any) {
        results.push({
          status: 'error',
          message: 'Error de conexión al servidor',
          details: error.response?.data?.message || error.message
        });
      }

      // Test 2: Verificar espacios de parqueo
      try {
        const response = await api.parking.getSpaces();
        const spaces = response.data.spaces;
        results.push({
          status: 'success',
          message: `Espacios de parqueo cargados: ${spaces.length} espacios disponibles`
        });
      } catch (error: any) {
        results.push({
          status: 'error',
          message: 'Error cargando espacios de parqueo',
          details: error.response?.data?.message || error.message
        });
      }

      // Test 3: Verificar vehículos
      try {
        const response = await api.vehicles.getAll();
        const vehicles = response.data.vehicles;
        results.push({
          status: 'success',
          message: `Vehículos cargados: ${vehicles.length} vehículos registrados`
        });
      } catch (error: any) {
        results.push({
          status: 'error',
          message: 'Error cargando vehículos',
          details: error.response?.data?.message || error.message
        });
      }

      // Test 4: Verificar horarios
      try {
        const response = await api.reservations.getTodaySchedule();
        const schedule = response.data.schedule;
        results.push({
          status: 'success',
          message: `Horario de hoy: ${schedule.name} (${schedule.startTime} - ${schedule.endTime})`
        });
      } catch (error: any) {
        results.push({
          status: 'warning',
          message: 'No se pudo cargar el horario de hoy',
          details: error.response?.data?.message || error.message
        });
      }

      // Test 5: Verificar reservas activas
      try {
        const response = await api.reservations.getActive();
        const activeReservation = response.data.reservation;
        if (activeReservation) {
          results.push({
            status: 'warning',
            message: `Tienes una reserva activa en el espacio ${activeReservation.parkingSpace?.spaceNumber}`
          });
        } else {
          results.push({
            status: 'success',
            message: 'No tienes reservas activas'
          });
        }
      } catch (error: any) {
        results.push({
          status: 'success',
          message: 'No tienes reservas activas'
        });
      }

    } catch (error) {
      results.push({
        status: 'error',
        message: '❌ Error general ejecutando diagnósticos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }

    setDiagnostics(results);
    setLoading(false);
    
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    if (errorCount === 0 && warningCount === 0) {
      toast.success('Todos los diagnósticos pasaron correctamente');
    } else if (errorCount > 0) {
      toast.error(`${errorCount} errores encontrados. Revisa los detalles.`);
    } else {
      toast(`${warningCount} advertencias encontradas.`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Diagnóstico del Sistema
          </h2>
          <p className="text-sm text-gray-600 mt-1">Verifica el estado de los servicios del sistema</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Ejecutando...' : 'Ejecutar Diagnósticos'}
        </button>
      </div>

      {diagnostics.length > 0 && (
        <div className="space-y-3">
          {diagnostics.map((diagnostic, index) => {
            const getTestIcon = () => {
              switch (index) {
                case 0: return <Server className="h-4 w-4 text-gray-400" />;
                case 1: return <Database className="h-4 w-4 text-gray-400" />;
                case 2: return <Car className="h-4 w-4 text-gray-400" />;
                case 3: return <Calendar className="h-4 w-4 text-gray-400" />;
                case 4: return <CheckCircle className="h-4 w-4 text-gray-400" />;
                default: return <Activity className="h-4 w-4 text-gray-400" />;
              }
            };
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(diagnostic.status)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(diagnostic.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTestIcon()}
                      <p className="text-sm font-medium text-gray-900">
                        {diagnostic.message}
                      </p>
                    </div>
                    {diagnostic.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                          Ver detalles técnicos
                        </summary>
                        <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-3 rounded-lg overflow-x-auto border border-gray-200">
                          {JSON.stringify(diagnostic.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {diagnostics.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium mb-1">Listo para ejecutar diagnósticos</p>
          <p className="text-sm text-gray-500">Haz clic en "Ejecutar Diagnósticos" para verificar el estado del sistema</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600 font-medium">Ejecutando diagnósticos...</p>
          <p className="text-sm text-gray-500 mt-1">Por favor espera mientras verificamos los servicios</p>
        </div>
      )}
    </div>
  );
};

export default SystemDiagnostic;
