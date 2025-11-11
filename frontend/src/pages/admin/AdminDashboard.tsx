import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { DashboardStats, Reservation, LPRRecord } from '../../types';
import { 
  Users, 
  Car, 
  MapPin, 
  DollarSign, 
  TrendingUp,
  Eye,
  RefreshCw,
  Calendar,
  Loader2,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [todayLPRRecords, setTodayLPRRecords] = useState<LPRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLPR, setLoadingLPR] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchTodayLPRRecords();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getDashboard();
      
          setStats(response.data.statistics);
          setRecentReservations(response.data.recentReservations || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayLPRRecords = async () => {
    try {
      setLoadingLPR(true);
      // Obtener todos los registros (sin filtro de estado) y filtrar por día actual
      const response = await api.security.getLPRRecords({ 
        page: 1, 
        limit: 100 // Obtener más registros para asegurar que tenemos todos los del día
      });
      
      // Filtrar registros del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayRecords = (response.data.records || []).filter((record: LPRRecord) => {
        const detectedDate = new Date(record.detectedAt);
        return detectedDate >= today && detectedDate < tomorrow;
      });
      
      // Ordenar por fecha más reciente
      todayRecords.sort((a: LPRRecord, b: LPRRecord) => 
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      );
      
      setTodayLPRRecords(todayRecords);
    } catch (error) {
      console.error('Error fetching today LPR records:', error);
      toast.error('Error al cargar registros LPR del día');
    } finally {
      setLoadingLPR(false);
    }
  };

  const translateReservationStatus = (status: string): string => {
    switch (status) {
      case 'active': return 'Activa';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'occupied': return 'Ocupada';
      default: return status;
    }
  };

  const getColorFromName = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      'blanco': '#FFFFFF',
      'blanca': '#FFFFFF',
      'white': '#FFFFFF',
      'negro': '#000000',
      'negra': '#000000',
      'black': '#000000',
      'gris': '#808080',
      'gray': '#808080',
      'rojo': '#FF0000',
      'roja': '#FF0000',
      'red': '#FF0000',
      'azul': '#0000FF',
      'blue': '#0000FF',
      'verde': '#008000',
      'green': '#008000',
      'amarillo': '#FFFF00',
      'yellow': '#FFFF00',
      'plateado': '#C0C0C0',
      'silver': '#C0C0C0',
      'plateada': '#C0C0C0',
      'naranja': '#FFA500',
      'orange': '#FFA500',
      'marrón': '#8B4513',
      'brown': '#8B4513',
    };
    
    const normalizedColor = colorName.toLowerCase().trim();
    return colorMap[normalizedColor] || '#808080';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
      case 'matched':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'no_match':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
      case 'processed':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'vehicle_created':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const translateStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'matched': 'Coincidencia',
      'no_match': 'Sin Coincidencia',
      'processed': 'Procesado',
      'vehicle_created': 'Vehículo Creado',
    };
    return statusMap[status] || status;
  };

  const translateType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'entry': 'Entrada',
      'exit': 'Salida',
    };
    return typeMap[type] || 'Entrada';
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-semibold text-gray-600">Cargando panel de administración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-sm text-gray-600 mt-1">Vista general del sistema</p>
          </div>
        </div>
        <button
          onClick={() => {
            fetchDashboardData();
            fetchTodayLPRRecords();
          }}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Datos
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Usuarios</p>
                <p className="text-4xl font-bold text-blue-600 mt-1">{stats.users.total}</p>
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  {stats.users.clients} clientes, {stats.users.employees} empleados
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                <Car className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Espacios Disponibles</p>
                <p className="text-4xl font-bold text-green-600 mt-1">{stats.parking.available}</p>
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  de {stats.parking.total} total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl shadow-lg border-2 border-red-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-md">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Espacios Ocupados</p>
                <p className="text-4xl font-bold text-red-600 mt-1">{stats.parking.occupied}</p>
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  {((stats.parking.occupied / stats.parking.total) * 100).toFixed(1)}% ocupación
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl shadow-lg border-2 border-emerald-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ingresos (30 días)</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  ${typeof stats.revenue === 'number' ? stats.revenue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stats.revenue}
                </p>
                <p className="text-xs text-gray-600 mt-2 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Últimos 30 días
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              Reservas Recientes
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recentReservations.length > 0 ? (
                recentReservations.map((reservation) => (
                  <div key={reservation.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all border-2 border-gray-100 hover:border-blue-200">
                    <div className="flex items-center flex-1">
                      <div className={`w-4 h-4 rounded-full mr-3 flex-shrink-0 ${
                        reservation.status === 'active' ? 'bg-green-500 ring-2 ring-green-200' :
                        reservation.status === 'completed' ? 'bg-blue-500 ring-2 ring-blue-200' :
                        reservation.status === 'cancelled' ? 'bg-red-500 ring-2 ring-red-200' :
                        'bg-yellow-500 ring-2 ring-yellow-200'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {reservation.user?.firstName} {reservation.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-600 flex items-center gap-2 mt-1.5 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          <span>Espacio {reservation.parkingSpace?.spaceNumber}</span>
                          <span className="mx-1">•</span>
                          <DollarSign className="h-3.5 w-3.5 text-green-600" />
                          <span className="font-bold">${typeof reservation.totalAmount === 'number' ? reservation.totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : reservation.totalAmount}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 font-medium">
                        <Calendar className="h-3 w-3" />
                        {new Date(reservation.createdAt).toLocaleDateString('es-CO', { 
                          day: '2-digit', 
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                        reservation.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                        reservation.status === 'completed' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                        reservation.status === 'cancelled' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                        'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                      }`}>
                        {translateReservationStatus(reservation.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                    <Calendar className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No hay reservas recientes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent LPR Records - Today's Records */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-5 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Registros LPR del Día</h3>
              </div>
              <button
                onClick={fetchTodayLPRRecords}
                disabled={loadingLPR}
                className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold text-xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingLPR ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
          <div className="p-6">
            {loadingLPR ? (
              <div className="flex items-center justify-center gap-3 py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-sm font-semibold text-gray-600">Cargando registros del día...</span>
              </div>
            ) : todayLPRRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                  <Eye className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No hay registros LPR del día</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-700 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="py-4 pr-4 font-bold">Fecha</th>
                      <th className="py-4 pr-4 font-bold">Placa</th>
                      <th className="py-4 pr-4 font-bold">Color</th>
                      <th className="py-4 pr-4 font-bold">Tipo</th>
                      <th className="py-4 pr-4 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayLPRRecords.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 transition-all">
                        <td className="py-4 pr-4 font-medium">{new Date(r.detectedAt).toLocaleString('es-ES')}</td>
                        <td className="py-4 pr-4 font-mono font-bold text-lg">{r.plateNumber}</td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-md"
                              style={{ backgroundColor: getColorFromName(r.vehicleColor) }}
                              title={r.vehicleColor}
                            />
                            <span className="capitalize font-medium">{r.vehicleColor}</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full text-xs font-bold border border-gray-300 shadow-sm">
                            {translateType((r as any).type || 'entry')}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusColor(r.status)}`}>
                            {translateStatus(r.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
