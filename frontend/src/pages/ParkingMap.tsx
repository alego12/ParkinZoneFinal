import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ParkingSpace, Reservation } from '../types';
import { MapPin, Car, AlertTriangle, Clock, Settings, RefreshCw, Loader2, X, Bike, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateReservation from '../components/CreateReservation';
import SystemDiagnostic from '../components/SystemDiagnostic';
import CashierReserveModal from '../components/CashierReserveModal';
import { useAuth } from '../contexts/AuthContext';
import { translateVehicleTypeShort, translateSpaceStatus } from '../utils/translations';

const ParkingMap: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchSpaces();
    fetchActiveReservations();
  }, []);

  const fetchSpaces = async () => {
    try {
      if (!loading) setRefreshing(true);
      const response = await api.parking.getSpaces();
      setSpaces(response.data.spaces);
      if (!loading) toast.success('Mapa actualizado');
    } catch (error) {
      console.error('Error fetching parking spaces:', error);
      toast.error('Error al cargar el mapa de parqueo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveReservations = async () => {
    try {
      if (user?.role !== 'client') {
        // Only clients have /reservations list; others would get 403
        return;
      }
      const response = await api.reservations.getAll();
      const activeReservations = response.data.reservations.filter(
        (reservation: Reservation) => reservation.status === 'active'
      );
      setActiveReservations(activeReservations);
    } catch (error) {
      console.error('Error fetching active reservations:', error);
    }
  };

  const getActiveReservationForSpace = (spaceId: number) => {
    return activeReservations.find(reservation => reservation.parkingSpaceId === spaceId);
  };

  const getSpaceColor = (space: ParkingSpace) => {
    const baseColors = {
      available: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      occupied: 'bg-gradient-to-br from-red-500 to-red-600',
      maintenance: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      reserved: 'bg-gradient-to-br from-blue-500 to-blue-600',
    };
    
    const color = baseColors[space.status] || 'bg-gradient-to-br from-gray-500 to-gray-600';
    
    // Add border to indicate vehicle type
    if (space.vehicleType === 'motorcycle') {
      return `${color} border-2 border-orange-300 shadow-orange-200`;
    } else if (space.vehicleType === 'car') {
      return `${color} border-2 border-blue-300 shadow-blue-200`;
    } else if (space.vehicleType === 'both') {
      return `${color} border-2 border-purple-300 shadow-purple-200`;
    }
    
    return color;
  };

  const getVehicleIcon = (vehicleType: 'car' | 'motorcycle' | 'both' | string, size: 'sm' | 'md' = 'sm') => {
    const iconSize = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
    const bikeSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
    
    if (vehicleType === 'car') {
      return <Car className={`${iconSize} text-white drop-shadow-md`} />;
    } else if (vehicleType === 'motorcycle') {
      return <Bike className={`${iconSize} text-white drop-shadow-md`} />;
    } else if (vehicleType === 'both') {
      return (
        <div className="relative flex items-center justify-center">
          <Car className={`${iconSize} text-white drop-shadow-md absolute`} />
          <Bike className={`${bikeSize} text-white drop-shadow-md absolute -bottom-0.5 -right-0.5 opacity-95`} />
        </div>
      );
    }
    return <Car className={`${iconSize} text-white drop-shadow-md`} />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-white drop-shadow-md" />;
      case 'occupied':
        return <MapPin className="h-5 w-5 text-white drop-shadow-md" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-white drop-shadow-md" />;
      case 'reserved':
        return <Clock className="h-5 w-5 text-white drop-shadow-md" />;
      default:
        return <MapPin className="h-5 w-5 text-white drop-shadow-md" />;
    }
  };

  const getStatusText = (status: string) => {
    return translateSpaceStatus(status);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Cargando mapa de parqueo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="h-8 w-8 text-blue-600" />
              Mapa de Parqueo
            </h1>
            <p className="text-gray-600 mt-1">Visualiza y gestiona todos los espacios de parqueo disponibles</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowDiagnostic(true)}
              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              title="Diagnóstico del Sistema"
            >
              <Settings className="h-4 w-4" />
              <span>Diagnóstico</span>
            </button>
            <button
              onClick={fetchSpaces}
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
                  <span>Actualizar Mapa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          Leyenda
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Disponible</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-sm">
              <MapPin className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Ocupado</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Mantenimiento</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <Clock className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Reservado</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 border-2 border-blue-400 rounded-full flex items-center justify-center shadow-sm">
              <Car className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Espacio para Autos</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 border-2 border-orange-400 rounded-full flex items-center justify-center shadow-sm">
              <Bike className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Espacio para Motos</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
            <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center relative shadow-sm">
              <Car className="h-2.5 w-2.5 text-white absolute" />
              <Bike className="h-2 w-2 text-white absolute -bottom-0.5 -right-0.5 opacity-95" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Espacio Mixto</span>
          </div>
        </div>
      </div>

      {/* Parking Map */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="grid grid-cols-8 gap-4">
          {spaces.map((space) => (
            <div
              key={space.id}
              className={`parking-space ${getSpaceColor(space)} ${
                space.status === 'available' 
                  ? 'cursor-pointer hover:scale-110 hover:shadow-xl hover:z-10 transition-all duration-300' 
                  : 'cursor-not-allowed opacity-85'
              } flex flex-row items-center justify-center gap-12 px-20 py-12 rounded-lg shadow-md transition-all duration-300 relative group aspect-[2.5/1]`}
              onClick={() => {
                if (space.status !== 'available') return;
                setSelectedSpace(space);
                if (
                  user?.role === 'cashier' ||
                  user?.role === 'security' ||
                  user?.role === 'admin'
                ) {
                  setShowCashierModal(true);
                }
              }}
              title={`${space.spaceNumber} - ${getStatusText(space.status)} (${translateVehicleTypeShort(space.vehicleType)})`}
            >
              <div className="flex items-center justify-center flex-shrink-0">
                {getVehicleIcon(space.vehicleType, 'md')}
              </div>
              <div className="flex flex-col items-center justify-center flex-1 min-w-0">
                <span className="text-base font-extrabold text-white drop-shadow-lg tracking-tight">{space.spaceNumber}</span>
                <span className="text-xs font-medium text-white/90 drop-shadow-md">{space.zone}</span>
              </div>
              
            </div>
          ))}
        </div>
      </div>

      {/* Space Details Modal */}
      {selectedSpace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl shadow-lg ring-2 ring-blue-200">
                    {getVehicleIcon(selectedSpace.vehicleType, 'md')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      Espacio {selectedSpace.spaceNumber}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedSpace.zone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSpace(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <span className="text-gray-700 flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Zona:
                  </span>
                  <span className="font-bold text-gray-900 text-lg">{selectedSpace.zone}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <span className="text-gray-700 flex items-center gap-2 font-medium">
                    {getStatusIcon(selectedSpace.status)}
                    Estado:
                  </span>
                  <span className={`font-bold px-4 py-1.5 rounded-full text-sm shadow-sm ${
                    selectedSpace.status === 'available' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                    selectedSpace.status === 'occupied' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' :
                    selectedSpace.status === 'maintenance' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                    'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                  }`}>
                    {getStatusText(selectedSpace.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <span className="text-gray-700 flex items-center gap-2 font-medium">
                    <Car className="h-4 w-4 text-indigo-600" />
                    Tipo de Vehículo:
                  </span>
                  <span className="font-bold text-gray-900">{translateVehicleTypeShort(selectedSpace.vehicleType)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <span className="text-gray-700 font-medium">Posición:</span>
                  <span className="font-bold text-gray-900 font-mono">({selectedSpace.positionX}, {selectedSpace.positionY})</span>
                </div>
              </div>
              
              {/* Mostrar información de reserva activa si existe */}
              {selectedSpace.status === 'reserved' && (() => {
                const activeReservation = getActiveReservationForSpace(selectedSpace.id);
                return activeReservation ? (
                  <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-300 shadow-lg">
                    <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      Reserva Activa
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                        <span className="text-blue-700 font-medium">Vehículo:</span>
                        <span className="font-bold text-blue-900">{activeReservation.vehicle?.model || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                        <span className="text-blue-700 font-medium">Placa:</span>
                        <span className="font-bold text-blue-900 font-mono">{activeReservation.vehicle?.plate || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                        <span className="text-blue-700 flex items-center gap-1 font-medium">
                          <Clock className="h-4 w-4" />
                          Inicio:
                        </span>
                        <span className="font-bold text-blue-900">
                          {new Date(activeReservation.startTime).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {activeReservation.endTime && (
                        <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                          <span className="text-blue-700 flex items-center gap-1 font-medium">
                            <Clock className="h-4 w-4" />
                            Fin:
                          </span>
                          <span className="font-bold text-blue-900">
                            {new Date(activeReservation.endTime).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-blue-300 bg-white/80 rounded-lg p-3">
                        <span className="text-blue-700 flex items-center gap-1 font-bold">
                          <DollarSign className="h-5 w-5" />
                          Monto:
                        </span>
                        <span className="font-bold text-xl text-blue-900">
                          ${activeReservation.totalAmount?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            
            <div className="px-6 pb-6 flex justify-end space-x-3 border-t border-gray-200 pt-5">
              <button
                onClick={() => setSelectedSpace(null)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
              {selectedSpace.status === 'available' && user?.role === 'client' && (
                <button
                  onClick={() => {
                    setShowReservationModal(true);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  <Calendar className="h-4 w-4" />
                  Reservar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Reservation Modal */}
      {showReservationModal && selectedSpace && (
        <CreateReservation
          parkingSpace={selectedSpace}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedSpace(null);
          }}
          onSuccess={() => {
            fetchSpaces(); // Refresh the map
            fetchActiveReservations(); // Refresh active reservations
          }}
        />
      )}

      {/* Cashier Reservation Modal */}
      {showCashierModal && selectedSpace && (
        <CashierReserveModal
          parkingSpace={selectedSpace}
          onClose={() => {
            setShowCashierModal(false);
            setSelectedSpace(null);
          }}
          onSuccess={() => {
            fetchSpaces();
            fetchActiveReservations();
          }}
        />
      )}

      {/* System Diagnostic Modal */}
      {showDiagnostic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Diagnóstico del Sistema</h2>
                    <p className="text-sm text-gray-500">Verifica el estado del sistema</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnostic(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <SystemDiagnostic />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingMap;
