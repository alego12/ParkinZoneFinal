import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ParkingSpace, LPRRecord } from '../../types';
import { MapPin, AlertTriangle, Car, Clock, Eye, Search, Settings, Bike, RefreshCw, Shield } from 'lucide-react';
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

  const getVehicleIcon = (vehicleType: 'car' | 'motorcycle' | 'both', isHorizontal: boolean = false) => {
    const baseClasses = isHorizontal ? "h-6 w-6" : "h-4 w-4 mx-auto mb-1";
    const containerClasses = isHorizontal 
      ? "relative h-6 w-6 flex items-center justify-center flex-shrink-0" 
      : "relative h-5 w-5 mx-auto mb-1 flex items-center justify-center";
    
    if (vehicleType === 'car') {
      return <Car className={baseClasses} />;
    } else if (vehicleType === 'motorcycle') {
      return <Bike className={baseClasses} />;
    } else {
      // 'both' - mostrar ambos iconos superpuestos
      return (
        <div className={containerClasses}>
          <Car className={isHorizontal ? "h-6 w-6 absolute" : "h-4 w-4 absolute"} />
          <Bike className={isHorizontal ? "h-5 w-5 absolute -bottom-0.5 -right-0.5 opacity-95" : "h-3.5 w-3.5 absolute -bottom-0.5 -right-0.5 opacity-95"} />
        </div>
      );
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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Seguridad</h1>
            <p className="text-sm text-gray-600 mt-1">Monitoreo y control de espacios de parqueo</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.location.href = '/security/lpr'}
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold"
          >
            <Settings className="h-4 w-4" />
            <span>Gestión LPR</span>
          </button>
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg font-medium">
            <Clock className="h-3.5 w-3.5 inline mr-1" />
            {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={fetchSpaces}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Disponibles</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {spaces.filter(s => s.status === 'available').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-xl shadow-lg border-2 border-red-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-md">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Ocupados</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {occupiedSpaces.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-xl shadow-lg border-2 border-yellow-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Mantenimiento</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {maintenanceSpaces.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Reservados</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {spaces.filter(s => s.status === 'reserved').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Spaces Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Spaces */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="p-2 bg-green-600 rounded-lg mr-3">
                <Car className="h-5 w-5 text-white" />
              </div>
              Espacios Disponibles 
              <span className="ml-2 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                {spaces.filter(s => s.status === 'available').length}
              </span>
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3">
              {spaces
                .filter(space => space.status === 'available')
                .map((space) => (
                  <div
                    key={space.id}
                    className="p-3 bg-gradient-to-br from-green-100 to-green-200 text-green-900 rounded-xl text-center cursor-pointer hover:from-green-200 hover:to-green-300 transition-all shadow-md hover:shadow-lg transform hover:scale-110 active:scale-95 border-2 border-green-300"
                    onClick={() => handleSpaceClick(space)}
                    title="Hacer clic para ver detalles"
                  >
                    {getVehicleIcon(space.vehicleType)}
                    <div className="font-bold text-sm mt-1">{space.spaceNumber}</div>
                    <div className="text-xs font-medium opacity-75">{space.zone}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Occupied Spaces */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50 border-b-2 border-red-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="p-2 bg-red-600 rounded-lg mr-3">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              Espacios Ocupados
              <span className="ml-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                {occupiedSpaces.length}
              </span>
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3">
              {occupiedSpaces.map((space) => (
                <div
                  key={space.id}
                  className="p-3 bg-gradient-to-br from-red-100 to-red-200 text-red-900 rounded-xl text-center cursor-pointer hover:from-red-200 hover:to-red-300 transition-all shadow-md hover:shadow-lg transform hover:scale-110 active:scale-95 border-2 border-red-300"
                  onClick={() => handleSpaceClick(space)}
                  title="Hacer clic para ver detalles"
                >
                  {getVehicleIcon(space.vehicleType)}
                  <div className="font-bold text-sm mt-1">{space.spaceNumber}</div>
                  <div className="text-xs font-medium opacity-75">{space.zone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance Spaces */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 border-b-2 border-yellow-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="p-2 bg-yellow-600 rounded-lg mr-3">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              En Mantenimiento
              <span className="ml-2 px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-bold">
                {maintenanceSpaces.length}
              </span>
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3">
              {maintenanceSpaces.map((space) => (
                <div
                  key={space.id}
                  className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-900 rounded-xl text-center cursor-pointer hover:from-yellow-200 hover:to-yellow-300 transition-all shadow-md hover:shadow-lg transform hover:scale-110 active:scale-95 border-2 border-yellow-300"
                  onClick={() => handleSpaceClick(space)}
                  title="Hacer clic para ver detalles"
                >
                  {getVehicleIcon(space.vehicleType)}
                  <div className="font-bold text-sm mt-1">{space.spaceNumber}</div>
                  <div className="text-xs font-medium opacity-75">{space.zone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent LPR Records */}
      {recentLPRRecords.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <Eye className="h-5 w-5 text-white" />
              </div>
              Registros LPR Recientes
              <span className="ml-2 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                {recentLPRRecords.length}
              </span>
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recentLPRRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => window.open(api.lpr.getImage(record.imagePath.split('/').pop() || ''), '_blank')}
                      className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl hover:from-blue-200 hover:to-blue-300 transition-all shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95"
                    >
                      <Eye className="h-5 w-5 text-blue-600" />
                    </button>
                    <div>
                      <p className="font-bold text-gray-900 text-lg font-mono">{record.plateNumber}</p>
                      <p className="text-sm text-gray-600 font-medium mt-1">
                        {record.vehicleColor} • {(record.confidence * 100).toFixed(1)}% confianza
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.detectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 shadow-sm">
                      Pendiente
                    </span>
                    <button
                      onClick={() => {
                        window.location.href = '/admin/lpr-records';
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold text-sm"
                    >
                      <Search className="h-4 w-4" />
                      Procesar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  window.location.href = '/admin/lpr-records';
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold flex items-center gap-2 mx-auto"
              >
                Ver todos los registros LPR
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <div className="p-2 bg-gray-600 rounded-lg mr-3">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            Vista Detallada de Todos los Espacios
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-8 gap-3">
            {spaces.map((space) => {
              const status = getSpaceStatus(space.status);
              const colorClasses = {
                'available': 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                'occupied': 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                'maintenance': 'bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                'reserved': 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
              };
              return (
                <div
                  key={space.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 ${colorClasses[space.status as keyof typeof colorClasses] || 'bg-gradient-to-br from-gray-500 to-gray-600'} text-white flex items-center gap-2 shadow-md hover:shadow-xl border-2 border-white/20`}
                  title={`${space.spaceNumber} - ${status.text} - Hacer clic para ver detalles`}
                  onClick={() => handleSpaceClick(space)}
                >
                  {getVehicleIcon(space.vehicleType, true)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate drop-shadow-md">{space.spaceNumber}</div>
                    <div className="text-xs opacity-90 truncate drop-shadow-sm">{space.zone}</div>
                  </div>
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
