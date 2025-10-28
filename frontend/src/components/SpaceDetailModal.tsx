import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ParkingSpace, Reservation, Schedule } from '../types';
import { X, MapPin, Clock, Car, User, Phone, Calendar, DollarSign, Unlock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SpaceDetailModalProps {
  space: ParkingSpace;
  isOpen: boolean;
  onClose: () => void;
}

interface SpaceDetails {
  space: ParkingSpace;
  currentReservation: Reservation | null;
  occupiedVehicleInfo: {
    vehicle: {
      model: string;
      plate: string;
      color: string;
      type: string;
    };
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    } | null;
    detectedAt: string;
    plateNumber: string;
    vehicleColor: string;
  } | null;
  todaySchedule: Schedule | null;
  recentReservations: Reservation[];
}

const SpaceDetailModal: React.FC<SpaceDetailModalProps> = ({ space, isOpen, onClose }) => {
  const [details, setDetails] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLiberateModal, setShowLiberateModal] = useState(false);
  const [liberateReason, setLiberateReason] = useState('');
  const [liberateNotes, setLiberateNotes] = useState('');
  const [liberating, setLiberating] = useState(false);
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  useEffect(() => {
    if (isOpen && space) {
      fetchSpaceDetails();
    }
  }, [isOpen, space]);

  const fetchSpaceDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching space details for space:', space.id);
      const response = await api.security.getSpaceDetails(space.id);
      console.log('Space details response:', response.data);
      setDetails(response.data);
    } catch (error: any) {
      console.error('Error fetching space details:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Error al cargar los detalles del espacio');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const handleChangeStatus = async (newStatus: string) => {
    try {
      console.log('Changing space status to:', newStatus);
      
      const response = await api.security.updateSpaceStatus(space.id, newStatus, `Cambio de estado por seguridad`);
      console.log('Status change response:', response.data);
      
      toast.success(`Estado del espacio cambiado a ${newStatus}`);
      
      // Refresh space details
      await fetchSpaceDetails();
      
      // Notify parent component to refresh spaces list
      window.dispatchEvent(new CustomEvent('spaceStatusChanged', { 
        detail: { spaceId: space.id, newStatus: newStatus } 
      }));
      
      if (newStatus === 'maintenance' || newStatus === 'available') {
        onClose();
      }
      
    } catch (error: any) {
      console.error('Error changing space status:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error al cambiar el estado del espacio');
    }
  };

  // Safely set maintenance: if occupied or with current reservation, liberate first
  const handleSetMaintenanceSafely = () => {
    const hasActiveOccupancy = space.status === 'occupied' || Boolean(details?.currentReservation);
    if (hasActiveOccupancy) {
      setPendingMaintenance(true);
      setShowLiberateModal(true);
      return;
    }
    handleChangeStatus('maintenance');
  };

  const handleLiberateSpace = async () => {
    if (!liberateReason.trim()) {
      toast.error('Por favor proporciona una razón para liberar el espacio');
      return;
    }

    try {
      setLiberating(true);
      console.log('Liberating space:', space.id, 'with reason:', liberateReason);
      
      const response = await api.security.liberateSpace(space.id, liberateReason, liberateNotes);
      console.log('Liberation response:', response.data);
      
      toast.success('Espacio liberado exitosamente');
      
      // Close modals and refresh data
      setShowLiberateModal(false);
      setLiberateReason('');
      setLiberateNotes('');
      
      // Refresh space details
      await fetchSpaceDetails();
      
      // Notify parent component to refresh spaces list
      window.dispatchEvent(new CustomEvent('spaceStatusChanged', { 
        detail: { spaceId: space.id, newStatus: 'available' } 
      }));

      // If maintenance was requested, change to maintenance now
      if (pendingMaintenance) {
        await handleChangeStatus('maintenance');
        setPendingMaintenance(false);
      }
      
      if (!pendingMaintenance) {
        onClose();
      }
      
    } catch (error: any) {
      console.error('Error liberating space:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error al liberar el espacio');
    } finally {
      setLiberating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Espacio {space.spaceNumber}
              </h2>
              <p className="text-sm text-gray-600">{space.zone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Current Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Estado Actual</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Car className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Estado del Espacio</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(space.status)}`}>
                      {getStatusText(space.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Vehículo</p>
                      <p className="font-medium">{space.vehicleType === 'both' ? 'Carros y Motos' : space.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tarifas</p>
                      <p className="font-medium">
                        Carro: ${space.carRate} | Moto: ${space.motorcycleRate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Reservation or Occupied Vehicle */}
              {details.currentReservation ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Reserva Actual</h3>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Reserva Activa</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowLiberateModal(true)}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <Unlock className="h-4 w-4" />
                          <span>Finalizar Reserva</span>
                        </button>
                        <button
                          onClick={handleSetMaintenanceSafely}
                          className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Mantenimiento</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Cliente</p>
                        <p className="font-medium">
                          {details.currentReservation.user?.firstName} {details.currentReservation.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {details.currentReservation.user?.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vehículo</p>
                        <p className="font-medium">
                          {details.currentReservation.vehicle?.model} - {details.currentReservation.vehicle?.plate}
                        </p>
                        <p className="text-sm text-gray-600">
                          {details.currentReservation.vehicle?.color} • {details.currentReservation.vehicle?.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Hora de Inicio</p>
                        <p className="font-medium">
                          {formatDate(details.currentReservation.startTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Estado</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(details.currentReservation.status)}`}>
                          {getStatusText(details.currentReservation.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : space.status === 'occupied' ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vehículo Ocupando el Espacio</h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Car className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-900">Espacio Ocupado</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowLiberateModal(true)}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <Unlock className="h-4 w-4" />
                          <span>Liberar Espacio</span>
                        </button>
                        <button
                          onClick={() => {
                            // Cambiar a mantenimiento
                            handleChangeStatus('maintenance');
                          }}
                          className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Mantenimiento</span>
                        </button>
                      </div>
                    </div>
                    
                    {details.occupiedVehicleInfo ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Vehículo Detectado</p>
                          <p className="font-medium">
                            {details.occupiedVehicleInfo.vehicle.model} - {details.occupiedVehicleInfo.vehicle.plate}
                          </p>
                          <p className="text-sm text-gray-600">
                            {details.occupiedVehicleInfo.vehicle.color} • {details.occupiedVehicleInfo.vehicle.type}
                          </p>
                        </div>
                        {details.occupiedVehicleInfo.user ? (
                          <div>
                            <p className="text-sm text-gray-600">Propietario</p>
                            <p className="font-medium">
                              {details.occupiedVehicleInfo.user.firstName} {details.occupiedVehicleInfo.user.lastName}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {details.occupiedVehicleInfo.user.phone}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-600">Hora de Detección</p>
                            <p className="font-medium">
                              {formatDate(details.occupiedVehicleInfo.detectedAt)}
                            </p>
                            <p className="text-sm text-gray-500">Sin información de usuario</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-600 mb-2">Este espacio está actualmente ocupado</p>
                        <p className="text-sm text-gray-500">
                          No hay información de reserva disponible para este vehículo.
                          <br />
                          Puede ser un vehículo que ingresó sin reserva previa.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Action Buttons for Available and Maintenance Spaces */}
              {space.status === 'available' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Acciones Disponibles</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Car className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-900">Espacio Disponible</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSetMaintenanceSafely}
                          className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Marcar Mantenimiento</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Este espacio está disponible para nuevas reservas. Puedes marcarlo como en mantenimiento si es necesario.
                    </p>
                  </div>
                </div>
              )}

              {space.status === 'maintenance' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Acciones Disponibles</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-900">En Mantenimiento</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            // Cambiar a disponible
                            handleChangeStatus('available');
                          }}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <Car className="h-4 w-4" />
                          <span>Marcar Disponible</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Este espacio está en mantenimiento. Puedes marcarlo como disponible cuando esté listo para uso.
                    </p>
                  </div>
                </div>
              )}

              {/* Today's Schedule */}
              {details.todaySchedule && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Horario del Día</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">{details.todaySchedule.name}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Horario de Apertura</p>
                        <p className="font-medium">{formatTime(details.todaySchedule.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Horario de Cierre</p>
                        <p className="font-medium">{formatTime(details.todaySchedule.endTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tarifa Extendida</p>
                        <p className="font-medium flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {details.todaySchedule.overtimeRate}
                        </p>
                      </div>
                    </div>
                    {details.todaySchedule.description && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Descripción</p>
                        <p className="text-sm">{details.todaySchedule.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Reservations */}
              {(details.recentReservations || []).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Reservas Recientes (Últimos 7 días)</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(details.recentReservations || []).map((reservation) => (
                      <div key={reservation.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <User className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="font-medium">
                                {reservation.user?.firstName} {reservation.user?.lastName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {reservation.vehicle?.model} - {reservation.vehicle?.plate}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {formatDate(reservation.startTime)}
                            </p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                              {getStatusText(reservation.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Space Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Estadísticas del Espacio</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{(details.recentReservations || []).length}</p>
                    <p className="text-sm text-gray-600">Reservas (7 días)</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {(details.recentReservations || []).filter(r => r.status === 'completed').length}
                    </p>
                    <p className="text-sm text-gray-600">Completadas</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {(details.recentReservations || []).filter(r => r.status === 'cancelled').length}
                    </p>
                    <p className="text-sm text-gray-600">Canceladas</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      ${(details.recentReservations || []).reduce((sum, r) => {
                        const amount = typeof r.totalAmount === 'number' ? r.totalAmount : 0;
                        return sum + amount;
                      }, 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Ingresos (7 días)</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Error al cargar los detalles del espacio</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Liberation Confirmation Modal */}
      {showLiberateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Liberar Espacio</h3>
                <p className="text-sm text-gray-600">Espacio {space.spaceNumber} - {space.zone}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón de liberación *
                </label>
                <select
                  value={liberateReason}
                  onChange={(e) => setLiberateReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Selecciona una razón</option>
                  <option value="Vehicle departed">Vehículo se retiró</option>
                  <option value="No vehicle present">No hay vehículo presente</option>
                  <option value="System error">Error del sistema</option>
                  <option value="Manual verification">Verificación manual</option>
                  <option value="Other">Otra razón</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={liberateNotes}
                  onChange={(e) => setLiberateNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Agrega cualquier información adicional..."
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Acción importante:</p>
                  <p>Al liberar este espacio, se marcará como disponible y cualquier reserva activa será finalizada automáticamente.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowLiberateModal(false);
                  setLiberateReason('');
                  setLiberateNotes('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={liberating}
              >
                Cancelar
              </button>
              <button
                onClick={handleLiberateSpace}
                disabled={liberating || !liberateReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {liberating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Liberando...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Confirmar Liberación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceDetailModal;
