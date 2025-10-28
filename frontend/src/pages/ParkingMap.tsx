import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ParkingSpace, Reservation } from '../types';
import { MapPin, Car, AlertTriangle, Clock, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateReservation from '../components/CreateReservation';
import SystemDiagnostic from '../components/SystemDiagnostic';
import CashierReserveModal from '../components/CashierReserveModal';
import { useAuth } from '../contexts/AuthContext';

const ParkingMap: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
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
      const response = await api.parking.getSpaces();
      setSpaces(response.data.spaces);
    } catch (error) {
      console.error('Error fetching parking spaces:', error);
      toast.error('Error al cargar el mapa de parqueo');
    } finally {
      setLoading(false);
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
      available: 'bg-green-500 hover:bg-green-600',
      occupied: 'bg-red-500',
      maintenance: 'bg-yellow-500',
      reserved: 'bg-blue-500',
    };
    
    const color = baseColors[space.status] || 'bg-gray-500';
    
    // Add border to indicate vehicle type
    if (space.vehicleType === 'motorcycle') {
      return `${color} border-2 border-orange-400`;
    } else if (space.vehicleType === 'car') {
      return `${color} border-2 border-blue-400`;
    }
    
    return color;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <Car className="h-4 w-4" />;
      case 'occupied':
        return <MapPin className="h-4 w-4" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4" />;
      case 'reserved':
        return <Clock className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'occupied':
        return 'Ocupado';
      case 'maintenance':
        return 'Mantenimiento';
      case 'reserved':
        return 'Reservado';
      default:
        return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-8 gap-4">
              {[...Array(32)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mapa de Parqueo</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowDiagnostic(true)}
            className="btn-secondary flex items-center space-x-2"
            title="Diagnóstico del Sistema"
          >
            <Settings className="h-4 w-4" />
            <span>Diagnóstico</span>
          </button>
          <button
            onClick={fetchSpaces}
            className="btn-primary"
          >
            Actualizar Mapa
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Leyenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Disponible</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Ocupado</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Mantenimiento</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Reservado</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 border-2 border-blue-400 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Espacio para Autos</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 border-2 border-orange-400 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Espacio para Motos</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Espacio Mixto</span>
          </div>
        </div>
      </div>

      {/* Parking Map */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-8 gap-4">
          {spaces.map((space) => (
            <div
              key={space.id}
              className={`parking-space ${getSpaceColor(space)} ${
                space.status === 'available' ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
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
              title={`${space.spaceNumber} - ${getStatusText(space.status)} (${space.vehicleType === 'car' ? 'Auto' : space.vehicleType === 'motorcycle' ? 'Moto' : 'Mixto'})`}
            >
              {getStatusIcon(space.status)}
              <span className="ml-1 text-xs font-medium">{space.spaceNumber}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Space Details Modal */}
      {selectedSpace && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Espacio {selectedSpace.spaceNumber}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Zona:</span>
                <span className="font-medium">{selectedSpace.zone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="font-medium">{getStatusText(selectedSpace.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Posición:</span>
                <span className="font-medium">({selectedSpace.positionX}, {selectedSpace.positionY})</span>
              </div>
              
              {/* Mostrar información de reserva activa si existe */}
              {selectedSpace.status === 'reserved' && (() => {
                const activeReservation = getActiveReservationForSpace(selectedSpace.id);
                return activeReservation ? (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">📋 Reserva Activa</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Vehículo:</span>
                        <span className="font-medium">{activeReservation.vehicle?.model || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Placa:</span>
                        <span className="font-medium">{activeReservation.vehicle?.plate || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Hora inicio:</span>
                        <span className="font-medium">
                          {new Date(activeReservation.startTime).toLocaleTimeString()}
                        </span>
                      </div>
                      {activeReservation.endTime && (
                        <div className="flex justify-between">
                          <span className="text-blue-700">Hora fin:</span>
                          <span className="font-medium">
                            {new Date(activeReservation.endTime).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-blue-700">Monto:</span>
                        <span className="font-medium">${activeReservation.totalAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedSpace(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
              {selectedSpace.status === 'available' && user?.role === 'client' && (
                <button
                  onClick={() => {
                    setShowReservationModal(true);
                  }}
                  className="btn-primary"
                >
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Diagnóstico del Sistema</h2>
                <button
                  onClick={() => setShowDiagnostic(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
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
