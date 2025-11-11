import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { DashboardStats, ParkingSpace, Reservation } from '../types';
import { 
  Users, 
  Car, 
  MapPin, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  Loader2,
  X,
  Bike,
  Activity,
  RefreshCw,
  BarChart3,
  Shield,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { translateVehicleType, translateSpaceStatus, translateVehicleTypeShort } from '../utils/translations';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [parkingOverview, setParkingOverview] = useState<{ available: number; occupied: number; occupancyRate: number } | null>(null);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [spaceDetails, setSpaceDetails] = useState<any>(null);

  const onSpaceClick = async (space: ParkingSpace) => {
    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      const res = await api.security.getSpaceDetails(space.id);
      setSpaceDetails(res.data);
    } catch (e) {
      toast.error('No se pudo cargar el detalle del espacio');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      if (!loading) setRefreshing(true);
      else setLoading(true);
      
      // Fetch data based on user role
      if (user?.role === 'admin') {
        const [statsResponse, parkingResponse] = await Promise.all([
          api.admin.getDashboard(),
          api.parking.getSpaces()
        ]);
        
        setStats(statsResponse.data.statistics);
        setSpaces(parkingResponse.data.spaces);
      } else if (user?.role === 'client') {
        const [activeReservationResponse, parkingResponse] = await Promise.all([
          api.reservations.getActive(),
          api.parking.getStats()
        ]);
        
        setActiveReservation(activeReservationResponse.data.reservation);
        setParkingOverview(parkingResponse.data);
      } else if (user?.role === 'security') {
        const parkingResponse = await api.parking.getSpaces();
        setSpaces(parkingResponse.data.spaces);
      } else if (user?.role === 'cashier') {
        const parkingResponse = await api.parking.getSpaces();
        setSpaces(parkingResponse.data.spaces);
      }
      if (!loading) toast.success('Datos actualizados');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderAdminDashboard = () => {
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;
    const reservedSpaces = spaces.filter(s => s.status === 'reserved').length;
    const occupancyRate = totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0;

    return (
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Dashboard Administrativo
            </h1>
            <p className="text-gray-600 mt-1">Vista general del sistema y estadísticas</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Actualizar</span>
              </>
            )}
          </button>
        </div>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Users className="h-8 w-8" />
                </div>
                <TrendingUp className="h-5 w-5 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90 mb-1">Total Usuarios</p>
              <p className="text-3xl font-bold">{stats.users.total}</p>
              <p className="text-xs opacity-75 mt-2">
                {stats.users.clients} clientes • {stats.users.employees} empleados
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Car className="h-8 w-8" />
                </div>
                <CheckCircle className="h-5 w-5 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90 mb-1">Espacios Disponibles</p>
              <p className="text-3xl font-bold">{stats.parking.available}</p>
              <p className="text-xs opacity-75 mt-2">
                de {stats.parking.total} total
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <MapPin className="h-8 w-8" />
                </div>
                <Activity className="h-5 w-5 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90 mb-1">Espacios Ocupados</p>
              <p className="text-3xl font-bold">{stats.parking.occupied}</p>
              <p className="text-xs opacity-75 mt-2">
                {occupancyRate}% de ocupación
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <DollarSign className="h-8 w-8" />
                </div>
                <TrendingUp className="h-5 w-5 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90 mb-1">Ingresos (30 días)</p>
              <p className="text-3xl font-bold">
                ${stats.revenue?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
              <p className="text-xs opacity-75 mt-2">
                Últimos 30 días
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Resumen de Espacios
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Disponibles</span>
                </div>
                <span className="text-lg font-bold text-green-600">{availableSpaces}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Ocupados</span>
                </div>
                <span className="text-lg font-bold text-red-600">{occupiedSpaces}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">Mantenimiento</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{maintenanceSpaces}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Reservados</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{reservedSpaces}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Estado de Espacios ({totalSpaces} total)
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 max-h-96 overflow-y-auto">
              {spaces.map((space: ParkingSpace) => (
                <div
                  key={space.id}
                  className={`p-3 rounded-lg text-center cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200 ${
                    space.status === 'available' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                    space.status === 'occupied' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' :
                    space.status === 'maintenance' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' :
                    'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                  }`}
                  title={`Espacio ${space.spaceNumber} - ${space.zone} - ${translateSpaceStatus(space.status)}`}
                  onClick={() => onSpaceClick(space)}
                >
                  <div className="font-bold text-sm mb-1">{space.spaceNumber}</div>
                  <div className="text-xs opacity-90">{space.zone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClientDashboard = () => (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            Mi Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Información de tus reservas y estado del parqueo</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Actualizando...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Actualizar</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Calendar className="h-8 w-8" />
            </div>
            <CheckCircle className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90 mb-1">Reserva Activa</p>
          <p className="text-3xl font-bold">{activeReservation ? '1' : '0'}</p>
          <p className="text-xs opacity-75 mt-2">
            {activeReservation ? 'En curso' : 'Sin reserva'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <MapPin className="h-8 w-8" />
            </div>
            <TrendingUp className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90 mb-1">Espacios Disponibles</p>
          <p className="text-3xl font-bold">{parkingOverview?.available || 0}</p>
          <p className="text-xs opacity-75 mt-2">
            Listos para reservar
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Car className="h-8 w-8" />
            </div>
            <Activity className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90 mb-1">Espacios Ocupados</p>
          <p className="text-3xl font-bold">{parkingOverview?.occupied || 0}</p>
          <p className="text-xs opacity-75 mt-2">
            En uso actualmente
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <BarChart3 className="h-8 w-8" />
            </div>
            <TrendingUp className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90 mb-1">Ocupación</p>
          <p className="text-3xl font-bold">{parkingOverview?.occupancyRate || 0}%</p>
          <p className="text-xs opacity-75 mt-2">
            Tasa de ocupación
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Reserva Activa
          </h3>
          {activeReservation ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Reserva Activa</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Espacio:
                  </span>
                  <span className="font-semibold text-gray-900">{activeReservation.parkingSpace?.spaceNumber}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehículo:
                  </span>
                  <span className="font-semibold text-gray-900">{activeReservation.vehicle?.model} - {activeReservation.vehicle?.plate}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Inicio:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {new Date(activeReservation.startTime).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {activeReservation.endTime && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Fin:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {new Date(activeReservation.endTime).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <span className="text-sm text-gray-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Monto:
                  </span>
                  <span className="text-lg font-bold text-blue-900">
                    ${activeReservation.totalAmount?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No tienes reservas activas</p>
              <p className="text-sm mt-1">Puedes crear una nueva reserva desde el mapa</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Estado del Parqueo
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Espacios disponibles</span>
              </div>
              <span className="text-xl font-bold text-green-600">{parkingOverview?.available || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Espacios ocupados</span>
              </div>
              <span className="text-xl font-bold text-red-600">{parkingOverview?.occupied || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Tasa de ocupación</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{parkingOverview?.occupancyRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityDashboard = () => {
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;
    const reservedSpaces = spaces.filter(s => s.status === 'reserved').length;
    const occupancyRate = totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0;

    return (
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Panel de Seguridad
            </h1>
            <p className="text-gray-600 mt-1">Monitoreo y control de espacios de parqueo</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Actualizar</span>
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Car className="h-8 w-8" />
              </div>
              <CheckCircle className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Disponibles</p>
            <p className="text-3xl font-bold">{availableSpaces}</p>
            <p className="text-xs opacity-75 mt-2">
              Listos para usar
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <MapPin className="h-8 w-8" />
              </div>
              <Activity className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Ocupados</p>
            <p className="text-3xl font-bold">{occupiedSpaces}</p>
            <p className="text-xs opacity-75 mt-2">
              En uso actualmente
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <AlertCircle className="h-8 w-8" />
              </div>
              <Clock className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Mantenimiento</p>
            <p className="text-3xl font-bold">{maintenanceSpaces}</p>
            <p className="text-xs opacity-75 mt-2">
              Requieren atención
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <TrendingUp className="h-8 w-8" />
              </div>
              <BarChart3 className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Ocupación</p>
            <p className="text-3xl font-bold">{occupancyRate}%</p>
            <p className="text-xs opacity-75 mt-2">
              Tasa de ocupación
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Estado de Espacios ({totalSpaces} total)
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 max-h-96 overflow-y-auto">
            {spaces.map((space: ParkingSpace) => (
              <div
                key={space.id}
                className={`p-3 rounded-lg text-center cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200 ${
                  space.status === 'available' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                  space.status === 'occupied' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' :
                  space.status === 'maintenance' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' :
                  'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                }`}
                title={`Espacio ${space.spaceNumber} - ${space.zone} - ${translateSpaceStatus(space.status)}`}
                onClick={() => onSpaceClick(space)}
              >
                <div className="font-bold text-sm mb-1">{space.spaceNumber}</div>
                <div className="text-xs opacity-90">{space.zone}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCashierDashboard = () => {
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;
    const reservedSpaces = spaces.filter(s => s.status === 'reserved').length;
    const occupancyRate = totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0;

    return (
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-blue-600" />
              Panel de Caja
            </h1>
            <p className="text-gray-600 mt-1">Gestión de pagos y espacios de parqueo</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Actualizar</span>
              </>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Car className="h-8 w-8" />
              </div>
              <CheckCircle className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Disponibles</p>
            <p className="text-3xl font-bold">{availableSpaces}</p>
            <p className="text-xs opacity-75 mt-2">
              Listos para reservar
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <MapPin className="h-8 w-8" />
              </div>
              <Activity className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Ocupados</p>
            <p className="text-3xl font-bold">{occupiedSpaces}</p>
            <p className="text-xs opacity-75 mt-2">
              En uso actualmente
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <AlertCircle className="h-8 w-8" />
              </div>
              <Clock className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Mantenimiento</p>
            <p className="text-3xl font-bold">{maintenanceSpaces}</p>
            <p className="text-xs opacity-75 mt-2">
              Requieren atención
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <TrendingUp className="h-8 w-8" />
              </div>
              <BarChart3 className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Ocupación</p>
            <p className="text-3xl font-bold">{occupancyRate}%</p>
            <p className="text-xs opacity-75 mt-2">
              Tasa de ocupación
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Estado de Espacios ({totalSpaces} total)
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 max-h-96 overflow-y-auto">
            {spaces.map((space: ParkingSpace) => (
              <div
                key={space.id}
                className={`p-3 rounded-lg text-center cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-200 ${
                  space.status === 'available' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                  space.status === 'occupied' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' :
                  space.status === 'maintenance' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' :
                  'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                }`}
                title={`Espacio ${space.spaceNumber} - ${space.zone} - ${translateSpaceStatus(space.status)}`}
                onClick={() => onSpaceClick(space)}
              >
                <div className="font-bold text-sm mb-1">{space.spaceNumber}</div>
                <div className="text-xs opacity-90">{space.zone}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {user?.role === 'admin' && renderAdminDashboard()}
      {user?.role === 'client' && renderClientDashboard()}
      {user?.role === 'security' && renderSecurityDashboard()}
      {user?.role === 'cashier' && renderCashierDashboard()}

      {detailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Detalle de Espacio</h3>
                    <p className="text-sm text-gray-500">Información completa del espacio</p>
                  </div>
                </div>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                  onClick={() => { setDetailsOpen(false); setSpaceDetails(null); }}
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              {detailsLoading || !spaceDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Espacio
                      </p>
                      <p className="font-semibold text-gray-900">{spaceDetails.space.spaceNumber}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Zona</p>
                      <p className="font-semibold text-gray-900">{spaceDetails.space.zone}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Estado
                      </p>
                      <p className={`font-semibold px-3 py-1 rounded-full text-sm inline-block ${
                        spaceDetails.space.status === 'available' ? 'bg-green-100 text-green-800' :
                        spaceDetails.space.status === 'occupied' ? 'bg-red-100 text-red-800' :
                        spaceDetails.space.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {translateSpaceStatus(spaceDetails.space.status)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Tipo de Vehículo
                      </p>
                      <p className="font-semibold text-gray-900">{translateVehicleType(spaceDetails.space.vehicleType || 'both')}</p>
                    </div>
                  </div>

                  {spaceDetails.currentReservation ? (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border-2 border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Reserva Actual
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-gray-600 mb-1 flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            Vehículo
                          </p>
                          <p className="font-semibold text-gray-900">{spaceDetails.currentReservation.vehicle?.model} - {spaceDetails.currentReservation.vehicle?.plate}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-gray-600 mb-1 flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Cliente
                          </p>
                          <p className="font-semibold text-gray-900">{spaceDetails.currentReservation.user?.firstName} {spaceDetails.currentReservation.user?.lastName}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-gray-600 mb-1 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Inicio
                          </p>
                          <p className="font-semibold text-gray-900">
                            {new Date(spaceDetails.currentReservation.startTime).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-gray-600 mb-1 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Estado
                          </p>
                          <p className="font-semibold text-gray-900 capitalize">{spaceDetails.currentReservation.status}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-gray-600" />
                        Sin reserva activa
                      </h4>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600">Tarifa auto:</span>
                          <span className="font-semibold text-gray-900">${spaceDetails.space.carRate ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-orange-600" />
                          <span className="text-gray-600">Tarifa moto:</span>
                          <span className="font-semibold text-gray-900">${spaceDetails.space.motorcycleRate ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {spaceDetails.recentReservations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Reservas Recientes
                      </h4>
                      <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                        {spaceDetails.recentReservations.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                            <div>
                              <p className="font-semibold text-gray-900">{r.vehicle?.plate}</p>
                              <p className="text-gray-600 text-xs">{r.user?.firstName} {r.user?.lastName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-900 font-medium">
                                {new Date(r.createdAt).toLocaleString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
