import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ParkingSpace } from '../../types';
import { Car, MapPin, AlertCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const CashierDashboard: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.parking.getSpaces();
      setSpaces(res.data.spaces || []);
    } catch (error) {
      console.error('Error fetching cashier dashboard data:', error);
      toast.error('Error al cargar el panel de Caja');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
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

  const available = spaces.filter(s => s.status === 'available').length;
  const occupied = spaces.filter(s => s.status === 'occupied').length;
  const maintenance = spaces.filter(s => s.status === 'maintenance').length;
  const occupancyRate = spaces.length > 0 ? Math.round((occupied / spaces.length) * 100) : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Caja</h1>
        <button onClick={fetchDashboardData} className="btn-primary">Actualizar</button>
      </div>

      {/* KPIs operativos (sin dinero) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Disponibles</p>
              <p className="text-2xl font-semibold text-gray-900">{available}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{occupied}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{maintenance}</p>
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
    </div>
  );
};

export default CashierDashboard;
