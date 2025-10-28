import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { DashboardStats, Reservation, LPRRecord } from '../../types';
import { 
  Users, 
  Car, 
  MapPin, 
  DollarSign, 
  TrendingUp,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [recentLPRRecords, setRecentLPRRecords] = useState<LPRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getDashboard();
      
      setStats(response.data.statistics);
      setRecentReservations(response.data.recentReservations || []);
      setRecentLPRRecords(response.data.recentLPRRecords || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <button
          onClick={fetchDashboardData}
          className="btn-primary"
        >
          Actualizar Datos
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.users.total}</p>
                <p className="text-xs text-gray-500">
                  {stats.users.clients} clientes, {stats.users.employees} empleados
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Espacios Disponibles</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.parking.available}</p>
                <p className="text-xs text-gray-500">
                  de {stats.parking.total} total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Espacios Ocupados</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.parking.occupied}</p>
                <p className="text-xs text-gray-500">
                  {((stats.parking.occupied / stats.parking.total) * 100).toFixed(1)}% ocupación
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ingresos (30 días)</p>
                <p className="text-2xl font-semibold text-gray-900">${stats.revenue}</p>
                <p className="text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Reservas Recientes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentReservations.length > 0 ? (
                recentReservations.map((reservation) => (
                  <div key={reservation.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        reservation.status === 'active' ? 'bg-green-500' :
                        reservation.status === 'completed' ? 'bg-blue-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {reservation.user?.firstName} {reservation.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Espacio {reservation.parkingSpace?.spaceNumber} - ${reservation.totalAmount}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(reservation.createdAt).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        reservation.status === 'active' ? 'bg-green-100 text-green-800' :
                        reservation.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {reservation.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay reservas recientes</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent LPR Records */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Registros LPR Recientes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentLPRRecords.length > 0 ? (
                recentLPRRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        record.status === 'processed' || record.status === 'matched' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.plateNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.vehicleColor} - {(record.confidence * 100).toFixed(1)}% confianza
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(record.detectedAt).toLocaleString()}
                      </p>
                      <button
                        onClick={() => window.open(api.lpr.getImage(record.imagePath.split('/').pop() || ''), '_blank')}
                        className="inline-flex items-center text-xs text-primary-600 hover:text-primary-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver imagen
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay registros LPR recientes</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
