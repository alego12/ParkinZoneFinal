import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Reservation, Vehicle } from '../../types';
import { 
  Car, 
  Calendar, 
  Plus, 
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  RefreshCw,
  DollarSign,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parkingStats, setParkingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'client') {
      toast.error('No tienes permisos para acceder al dashboard del cliente');
      navigate('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Verificar autenticación primero
      const userResponse = await api.auth.me();
      if (userResponse.data.user.role !== 'client') {
        throw new Error('Usuario no tiene permisos de cliente');
      }
      
      const [activeReservationResponse, vehiclesResponse, statsResponse] = await Promise.all([
        api.reservations.getActive(),
        api.vehicles.getAll(),
        api.parking.getStats()
      ]);
      
      setActiveReservation(activeReservationResponse.data.reservation);
      setVehicles(vehiclesResponse.data.vehicles);
      setParkingStats(statsResponse.data);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      
      if (error.response?.status === 403) {
        toast.error('No tienes permisos para acceder a esta funcionalidad');
      } else if (error.response?.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente');
      } else {
        toast.error('Error al cargar los datos del dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCompleteReservation = async () => {
    if (!activeReservation) return;

    try {
      await api.reservations.complete(activeReservation.id);
      toast.success('Reserva completada exitosamente');
      fetchDashboardData();
    } catch (error) {
      toast.error('Error al completar la reserva');
    }
  };

  const handleCancelReservation = async () => {
    if (!activeReservation) return;

    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) return;

    try {
      await api.reservations.cancel(activeReservation.id);
      toast.success('Reserva cancelada exitosamente');
      fetchDashboardData();
    } catch (error) {
      toast.error('Error al cancelar la reserva');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
          <p className="text-gray-600 mt-1">Gestiona tus reservas y vehículos</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Active Reservation */}
      <div className="mb-8">
        {activeReservation ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                Reserva Activa
              </h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Activa
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Espacio</p>
                    <p className="font-medium">{activeReservation.parkingSpace?.spaceNumber}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Vehículo</p>
                    <p className="font-medium">
                      {activeReservation.vehicle?.model} - {activeReservation.vehicle?.plate}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Inicio</p>
                    <p className="font-medium">
                      {new Date(activeReservation.startTime).toLocaleDateString('es-CO', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activeReservation.startTime).toLocaleTimeString('es-CO', { 
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Fin Programado</p>
                    {activeReservation.endTime ? (
                      <>
                        <p className="font-medium">
                          {new Date(activeReservation.endTime).toLocaleDateString('es-CO', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activeReservation.endTime).toLocaleTimeString('es-CO', { 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="font-medium text-blue-600">En curso</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Monto Total</p>
                    <p className="font-medium text-lg text-green-600">
                      ${typeof activeReservation.totalAmount === 'number' ? activeReservation.totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : activeReservation.totalAmount}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">Estado de Pago:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    activeReservation.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activeReservation.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancelReservation}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Cancelar Reserva
              </button>
              <button
                onClick={handleCompleteReservation}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Completar Reserva
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes reservas activas
              </h3>
              <p className="text-gray-500 mb-4">
                Puedes crear una nueva reserva desde el mapa de parqueo
              </p>
              <button
                onClick={() => navigate('/map')}
                className="btn-primary"
              >
                Ver Mapa de Parqueo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow border border-blue-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mis Vehículos</p>
              <p className="text-2xl font-semibold text-gray-900">{vehicles.length}</p>
              <p className="text-xs text-gray-500">de 3 máximo</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Espacios Disponibles</p>
              <p className="text-2xl font-semibold text-gray-900">
                {parkingStats?.available || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow border border-purple-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reserva Activa</p>
              <p className="text-2xl font-semibold text-gray-900">
                {activeReservation ? '1' : '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Estado</p>
              <p className="text-sm font-semibold text-gray-900">
                {activeReservation ? 'Con Reserva' : 'Sin Reserva'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Car className="h-8 w-8 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Gestionar Vehículos</h3>
          </div>
          <p className="text-gray-500 mb-4">
            Agrega, edita o elimina tus vehículos registrados
          </p>
          <button
            onClick={() => navigate('/client/vehicles')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver Vehículos
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mis Reservas</h3>
          </div>
          <p className="text-gray-500 mb-4">
            Revisa el historial de todas tus reservas
          </p>
          <button
            onClick={() => navigate('/client/reservations')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Ver Historial
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Nueva Reserva</h3>
          </div>
          <p className="text-gray-500 mb-4">
            Crea una nueva reserva de estacionamiento
          </p>
          <button
            onClick={() => navigate('/map')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear Reserva
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
