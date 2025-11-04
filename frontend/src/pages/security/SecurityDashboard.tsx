import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ParkingSpace, LPRRecord } from '../../types';
import { MapPin, AlertTriangle, Car, Clock, Eye, Search, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import SpaceDetailModal from '../../components/SpaceDetailModal';

const SecurityDashboard: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [recentLPRRecords, setRecentLPRRecords] = useState<LPRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSpaces();
    fetchRecentLPRRecords();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSpaces();
      fetchRecentLPRRecords();
    }, 30000);

    // Listen for space status changes from modal
    const handleSpaceStatusChange = (event: any) => {
      const { spaceId, newStatus } = event.detail;
      // Update the specific space status in the local state
      setSpaces(prevSpaces => 
        prevSpaces.map(space => 
          space.id === spaceId 
            ? { ...space, status: newStatus }
            : space
        )
      );
    };

    window.addEventListener('spaceStatusChanged', handleSpaceStatusChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('spaceStatusChanged', handleSpaceStatusChange);
    };
  }, []);

  const fetchSpaces = async () => {
    try {
      const response = await api.parking.getSpaces();
      setSpaces(response.data.spaces);
    } catch (error) {
      console.error('Error fetching parking spaces:', error);
      toast.error('Error al cargar los espacios de parqueo');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLPRRecords = async () => {
    try {
      const response = await api.lpr.getRecords({ 
        page: 1, 
        limit: 5,
        status: 'pending'
      });
      setRecentLPRRecords(response.data.records);
    } catch (error) {
      console.error('Error fetching LPR records:', error);
    }
  };

  const getSpaceStatus = (status: string) => {
    switch (status) {
      case 'available':
        return { color: 'bg-green-500', icon: Car, text: 'Disponible' };
      case 'occupied':
        return { color: 'bg-red-500', icon: MapPin, text: 'Ocupado' };
      case 'maintenance':
        return { color: 'bg-yellow-500', icon: AlertTriangle, text: 'Mantenimiento' };
      case 'reserved':
        return { color: 'bg-blue-500', icon: Clock, text: 'Reservado' };
      default:
        return { color: 'bg-gray-500', icon: MapPin, text: 'Desconocido' };
    }
  };

  const occupiedSpaces = spaces.filter(space => space.status === 'occupied');
  const maintenanceSpaces = spaces.filter(space => space.status === 'maintenance');

  const handleSpaceClick = (space: ParkingSpace) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSpace(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-12 bg-gray-200 rounded"></div>
                  ))}
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
        <h1 className="text-2xl font-bold text-gray-900">Panel de Seguridad</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.location.href = '/security/lpr'}
            className="btn-secondary flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Gestión LPR</span>
          </button>
          <div className="text-sm text-gray-600">
            Última actualización: {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={fetchSpaces}
            className="btn-primary"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Disponibles</p>
              <p className="text-2xl font-semibold text-gray-900">
                {spaces.filter(s => s.status === 'available').length}
              </p>
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
              <p className="text-2xl font-semibold text-gray-900">
                {occupiedSpaces.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Mantenimiento</p>
              <p className="text-2xl font-semibold text-gray-900">
                {maintenanceSpaces.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Reservados</p>
              <p className="text-2xl font-semibold text-gray-900">
                {spaces.filter(s => s.status === 'reserved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Spaces Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Spaces */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Car className="h-5 w-5 text-green-600 mr-2" />
              Espacios Disponibles ({spaces.filter(s => s.status === 'available').length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-2">
              {spaces
                .filter(space => space.status === 'available')
                .map((space) => (
                  <div
                    key={space.id}
                    className="p-3 bg-green-100 text-green-800 rounded-lg text-center cursor-pointer hover:bg-green-200 transition-colors"
                    onClick={() => handleSpaceClick(space)}
                    title="Hacer clic para ver detalles"
                  >
                    <div className="font-medium">{space.spaceNumber}</div>
                    <div className="text-xs">{space.zone}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Occupied Spaces */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 text-red-600 mr-2" />
              Espacios Ocupados ({occupiedSpaces.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-2">
              {occupiedSpaces.map((space) => (
                <div
                  key={space.id}
                  className="p-3 bg-red-100 text-red-800 rounded-lg text-center cursor-pointer hover:bg-red-200 transition-colors"
                  onClick={() => handleSpaceClick(space)}
                  title="Hacer clic para ver detalles"
                >
                  <div className="font-medium">{space.spaceNumber}</div>
                  <div className="text-xs">{space.zone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance Spaces */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              En Mantenimiento ({maintenanceSpaces.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-2">
              {maintenanceSpaces.map((space) => (
                <div
                  key={space.id}
                  className="p-3 bg-yellow-100 text-yellow-800 rounded-lg text-center cursor-pointer hover:bg-yellow-200 transition-colors"
                  onClick={() => handleSpaceClick(space)}
                  title="Hacer clic para ver detalles"
                >
                  <div className="font-medium">{space.spaceNumber}</div>
                  <div className="text-xs">{space.zone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent LPR Records */}
      {recentLPRRecords.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Eye className="h-5 w-5 text-blue-600 mr-2" />
              Registros LPR Recientes ({recentLPRRecords.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recentLPRRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => window.open(api.lpr.getImage(record.imagePath.split('/').pop() || ''), '_blank')}
                      className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <div>
                      <p className="font-medium text-gray-900">{record.plateNumber}</p>
                      <p className="text-sm text-gray-600">
                        {record.vehicleColor} • {(record.confidence * 100).toFixed(1)}% confianza
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.detectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Pendiente
                    </span>
                    <button
                      onClick={() => {
                        // Navigate to LPR records page or open modal
                        window.location.href = '/admin/lpr-records';
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      <Search className="h-4 w-4 inline mr-1" />
                      Procesar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  window.location.href = '/admin/lpr-records';
                }}
                className="text-blue-600 hover:text-blue-900 font-medium"
              >
                Ver todos los registros LPR →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Vista Detallada</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-8 gap-4">
            {spaces.map((space) => {
              const status = getSpaceStatus(space.status);
              const Icon = status.icon;
              return (
                <div
                  key={space.id}
                  className={`p-3 rounded-lg text-center cursor-pointer transition-all duration-200 hover:scale-105 ${status.color} text-white`}
                  title={`${space.spaceNumber} - ${status.text} - Hacer clic para ver detalles`}
                  onClick={() => handleSpaceClick(space)}
                >
                  <Icon className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs font-medium">{space.spaceNumber}</div>
                  <div className="text-xs opacity-75">{space.zone}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Space Detail Modal */}
      {selectedSpace && (
        <SpaceDetailModal
          space={selectedSpace}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default SecurityDashboard;
