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
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [parkingOverview, setParkingOverview] = useState<{ available: number; occupied: number; occupancyRate: number } | null>(null);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
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
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

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

  const renderAdminDashboard = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Administrativo</h1>
      
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.users.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Espacios Disponibles</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.parking.available}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Espacios Ocupados</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.parking.occupied}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ingresos (30 días)</p>
                <p className="text-2xl font-semibold text-gray-900">${stats.revenue}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Espacios ({spaces.length} total)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {spaces.map((space: ParkingSpace) => (
            <div
              key={space.id}
              className={`p-3 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 ${
                space.status === 'available' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                space.status === 'occupied' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                space.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
              title={`Espacio ${space.spaceNumber} - ${space.zone} - Estado: ${space.status}`}
              onClick={() => onSpaceClick(space)}
            >
              <div className="font-medium text-sm">{space.spaceNumber}</div>
              <div className="text-xs capitalize opacity-75">{space.status}</div>
              <div className="text-xs opacity-60">{space.zone}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClientDashboard = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reserva Activa</h3>
          {activeReservation ? (
            <div className="space-y-3">
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Reserva Activa</span>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Espacio:</strong> {activeReservation.parkingSpace?.spaceNumber}</p>
                <p><strong>Vehículo:</strong> {activeReservation.vehicle?.model} - {activeReservation.vehicle?.plate}</p>
                <p><strong>Inicio:</strong> {new Date(activeReservation.startTime).toLocaleString()}</p>
                <p><strong>Fin:</strong> {activeReservation.endTime ? new Date(activeReservation.endTime).toLocaleString() : 'En curso'}</p>
                <p><strong>Monto:</strong> ${activeReservation.totalAmount}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center text-gray-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>No tienes reservas activas</span>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del Parqueo</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Espacios disponibles:</span>
              <span className="font-medium text-green-600">{parkingOverview?.available || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Espacios ocupados:</span>
              <span className="font-medium text-red-600">{parkingOverview?.occupied || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tasa de ocupación:</span>
              <span className="font-medium">{parkingOverview?.occupancyRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityDashboard = () => {
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;
    const occupancyRate = spaces.length > 0 ? Math.round((occupiedSpaces / spaces.length) * 100) : 0;

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de Seguridad</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Disponibles</p>
                <p className="text-2xl font-semibold text-gray-900">{availableSpaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <MapPin className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ocupados</p>
                <p className="text-2xl font-semibold text-gray-900">{occupiedSpaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Mantenimiento</p>
                <p className="text-2xl font-semibold text-gray-900">{maintenanceSpaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ocupación</p>
                <p className="text-2xl font-semibold text-gray-900">{occupancyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Espacios ({spaces.length} total)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {spaces.map((space: ParkingSpace) => (
              <div
                key={space.id}
                className={`p-3 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 ${
                  space.status === 'available' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                  space.status === 'occupied' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                  space.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                  'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
                title={`Espacio ${space.spaceNumber} - ${space.zone} - Estado: ${space.status}`}
                onClick={() => onSpaceClick(space)}
              >
                <div className="font-medium text-sm">{space.spaceNumber}</div>
                <div className="text-xs capitalize opacity-75">{space.status}</div>
                <div className="text-xs opacity-60">{space.zone}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  const renderCashierDashboard = () => {
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;
    const occupancyRate = spaces.length > 0 ? Math.round((occupiedSpaces / spaces.length) * 100) : 0;

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de Caja</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Disponibles</p>
                <p className="text-2xl font-semibold text-gray-900">{availableSpaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <MapPin className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ocupados</p>
                <p className="text-2xl font-semibold text-gray-900">{occupiedSpaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Mantenimiento</p>
                <p className="text-2xl font-semibold text-gray-900">{maintenanceSpaces}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ocupación</p>
                <p className="text-2xl font-semibold text-gray-900">{occupancyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Espacios ({spaces.length} total)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {spaces.map((space: ParkingSpace) => (
              <div
                key={space.id}
                className={`p-3 rounded-lg text-center cursor-pointer hover:shadow-md transition-all duration-200 ${
                  space.status === 'available' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                  space.status === 'occupied' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                  space.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                  'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
                title={`Espacio ${space.spaceNumber} - ${space.zone} - Estado: ${space.status}`}
                onClick={() => onSpaceClick(space)}
              >
                <div className="font-medium text-sm">{space.spaceNumber}</div>
                <div className="text-xs capitalize opacity-75">{space.status}</div>
                <div className="text-xs opacity-60">{space.zone}</div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalle de Espacio</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => { setDetailsOpen(false); setSpaceDetails(null); }}>
                ×
              </button>
            </div>
            {detailsLoading || !spaceDetails ? (
              <div className="text-gray-500">Cargando...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Espacio</p>
                    <p className="font-medium">{spaceDetails.space.spaceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Zona</p>
                    <p className="font-medium">{spaceDetails.space.zone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="font-medium capitalize">{spaceDetails.space.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo</p>
                    <p className="font-medium capitalize">{spaceDetails.space.vehicleType || 'both'}</p>
                  </div>
                </div>

                {spaceDetails.currentReservation ? (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="font-semibold mb-2">Reserva Actual</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Vehículo</p>
                        <p className="font-medium">{spaceDetails.currentReservation.vehicle?.model} - {spaceDetails.currentReservation.vehicle?.plate}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cliente</p>
                        <p className="font-medium">{spaceDetails.currentReservation.user?.firstName} {spaceDetails.currentReservation.user?.lastName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Inicio</p>
                        <p className="font-medium">{new Date(spaceDetails.currentReservation.startTime).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estado</p>
                        <p className="font-medium capitalize">{spaceDetails.currentReservation.status}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md text-sm">
                    <p className="font-semibold mb-2">Sin reserva activa</p>
                    <p>Tarifa auto: ${spaceDetails.space.carRate ?? 0} • Tarifa moto: ${spaceDetails.space.motorcycleRate ?? 0}</p>
                  </div>
                )}

                {spaceDetails.recentReservations?.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Reservas recientes</p>
                    <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                      {spaceDetails.recentReservations.map((r: any) => (
                        <div key={r.id} className="flex justify-between border rounded p-2">
                          <div>
                            <p className="font-medium">{r.vehicle?.plate}</p>
                            <p className="text-gray-600">{r.user?.firstName} {r.user?.lastName}</p>
                          </div>
                          <div className="text-right">
                            <p>{new Date(r.createdAt).toLocaleString()}</p>
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
      )}
    </>
  );
};

export default Dashboard;
