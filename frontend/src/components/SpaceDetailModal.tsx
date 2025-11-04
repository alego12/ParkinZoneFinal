import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ParkingSpace, Reservation, Schedule } from '../types';
import { X, MapPin, Clock, Car, User, Phone, Calendar, DollarSign, Unlock, AlertTriangle, QrCode, CreditCard, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';

interface SpaceDetailModalProps {
  space: ParkingSpace;
  isOpen: boolean;
  onClose: () => void;
  autoOpenPayment?: boolean;
  initialMethod?: 'cash' | 'qr' | 'card';
  paymentOnly?: boolean;
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

const SpaceDetailModal: React.FC<SpaceDetailModalProps> = ({ space, isOpen, onClose, autoOpenPayment = false, initialMethod = 'cash', paymentOnly = false }) => {
  const { user } = useAuth();
  const canPay = Boolean(user && (user.role === 'admin' || user.role === 'cashier'));
  const [details, setDetails] = useState<SpaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLiberateModal, setShowLiberateModal] = useState(false);
  const [liberateReason, setLiberateReason] = useState('');
  const [liberateNotes, setLiberateNotes] = useState('');
  const [liberating, setLiberating] = useState(false);
  const [pendingMaintenance, setPendingMaintenance] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReservation, setPaymentReservation] = useState<Reservation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'qr'|'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // New: quick method selection modal for "Liberar Espacio"
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'cash'|'qr'|'card'>('cash');

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
      // Si debemos abrir directamente el modal de pago
      if (autoOpenPayment) {
        if (!canPay) {
          // Seguridad no puede abrir cobro automático
          console.warn('Usuario sin permisos de pago intentando autoOpenPayment');
        } else {
          try {
            // Verificar si hay una reserva activa antes de intentar preparar checkout
            if (response.data.currentReservation) {
              const preview = await api.security.prepareCheckout(space.id);
              const reservation = preview.data?.reservation as Reservation | undefined;
              const amt = Number(preview.data?.suggestedAmount || 0);
              if (reservation?.id) {
                setPaymentReservation(reservation);
                setPaymentAmount(amt);
                setPaymentMethod(initialMethod);
                setSelectedMethod(initialMethod);
                setPaymentReference('');
                setShowMethodModal(false);
                setShowPaymentModal(true);
              }
            } else {
              console.warn('No hay reserva activa para preparar checkout');
              // Si no hay reserva, simplemente no abrimos el modal de pago automáticamente
            }
          } catch (e: any) {
            console.error('Error preparando checkout automático', e);
            // Si es un 404, probablemente no hay reserva activa - esto es normal
            if (e.response?.status === 404) {
              console.warn('No se encontró reserva activa para checkout (esto es normal si el espacio está libre)');
            }
          }
        }
      }
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
      
      // Prepare payment if reservation completed
      const completed = response.data?.reservation as Reservation | undefined;
      if (completed && completed.id) {
        setPaymentReservation(completed);
        const amt = typeof completed.totalAmount === 'number' ? completed.totalAmount : parseFloat(String(completed.totalAmount || 0));
        setPaymentAmount(Number.isFinite(amt) ? amt : 0);
        setPaymentMethod('cash');
        setPaymentReference('');
        setShowPaymentModal(true);
      }

      // Close liberation modal and refresh lists
      setShowLiberateModal(false);
      setLiberateReason('');
      setLiberateNotes('');
      
      // Refresh space details
      await fetchSpaceDetails();
      
      // Notify parent component to refresh spaces list
      window.dispatchEvent(new CustomEvent('spaceStatusChanged', { 
        detail: { spaceId: space.id, newStatus: 'available' } 
      }));

      // If maintenance was requested, defer payment modal until after maintenance change
      if (pendingMaintenance) {
        await handleChangeStatus('maintenance');
        setPendingMaintenance(false);
      }
      // Do not close parent yet if payment modal is open
      if (!showPaymentModal && !pendingMaintenance) {
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

  // Confirma método y abre modal de pago (no libera aún)
  const handleConfirmMethodAndLiberate = async () => {
    if (!canPay) {
      toast.error('Acción reservada para cajeros y administradores');
      setShowMethodModal(false);
      return;
    }
    try {
      setPaymentProcessing(true);
      // Obtener monto sugerido sin cambiar estado
      const preview = await api.security.prepareCheckout(space.id);
      const reservation = preview.data?.reservation as Reservation | undefined;
      const amt = Number(preview.data?.suggestedAmount || 0);

      if (!reservation?.id) {
        toast.error('No hay reserva activa/ocupada para este espacio');
        setShowMethodModal(false);
        return;
      }

      // Abrir SIEMPRE modal de pago, y requerir referencia al confirmar
      setPaymentReservation(reservation);
      setPaymentAmount(amt);
      setPaymentMethod(selectedMethod);
      setPaymentReference('');
      setShowPaymentModal(true);
      setShowMethodModal(false);
    } catch (e: any) {
      console.error('Liberate & pay error', e);
      toast.error(e?.response?.data?.message || 'Error al liberar y registrar pago');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Registrar pago desde el modal de pago (requerir referencia y método elegido)
  const handleCreatePayment = async () => {
    if (!canPay) {
      toast.error('Acción reservada para cajeros y administradores');
      return;
    }
    if (!paymentReservation) return;
    if (paymentAmount <= 0) {
      toast.error('Monto inválido');
      return;
    }
    if (!paymentReference.trim()) {
      toast.error('Referencia requerida para evidenciar el pago');
      return;
    }
    try {
      setPaymentProcessing(true);
      // Realizar checkout atómico con el método seleccionado (libera y registra pago)
      await api.security.checkout(space.id, {
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentReference,
        notes: `Pago desde modal del espacio ${space.spaceNumber} (método ${paymentMethod})`,
      });
      toast.success('Checkout completado');
      // Registrar LPR record de salida como evidencia
      try {
        const plate = details?.currentReservation?.vehicle?.plate || details?.occupiedVehicleInfo?.vehicle.plate || 'SIN-PLACA';
        const color = details?.currentReservation?.vehicle?.color || details?.occupiedVehicleInfo?.vehicle.color || 'Desconocido';
        const reservationId = paymentReservation?.id;
        const vehicleId = details?.currentReservation?.vehicle?.id as any;
        const userId = details?.currentReservation?.user?.id as any;
        await api.lpr.createRecord({
          plateNumber: plate,
          vehicleColor: color,
          confidence: 1.0,
          status: 'processed',
          type: 'exit',
          notes: `Salida registrada con referencia ${paymentReference}`,
          reservationId,
          vehicleId,
          userId,
        });
      } catch (e) {
        console.warn('No se pudo registrar LPR de salida desde SpaceDetailModal', e);
      }
      setShowPaymentModal(false);
      setPaymentReservation(null);
      // Notificar y refrescar
      window.dispatchEvent(new CustomEvent('spaceStatusChanged', { detail: { spaceId: space.id, newStatus: 'available' } }));
      await fetchSpaceDetails();
      onClose();
    } catch (e: any) {
      console.error('Create payment error', e);
      toast.error(e?.response?.data?.message || 'Error al registrar pago');
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <>
      {!paymentOnly && (
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
                        {space.status === 'occupied' && details.currentReservation.status === 'occupied' && (
                          <button
                            onClick={() => {
                              if (!canPay) {
                                toast.error('Acción reservada para cajeros y administradores');
                                return;
                              }
                              setShowMethodModal(true);
                            }}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <Unlock className="h-4 w-4" />
                            <span>Liberar Espacio</span>
                          </button>
                        )}
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
        </div>
      )}

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

      {/* Method Selection Modal (flujo rápido) */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[65] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona método de pago</h3>
            <p className="text-sm text-gray-600 mb-4">El vehículo se está retirando. Selecciona el método con el que pagará.</p>
            <div className="flex items-center space-x-3 mb-4">
              <button type="button" onClick={() => setSelectedMethod('cash')} className={`px-3 py-2 rounded-lg border ${selectedMethod==='cash' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                <Banknote className="h-4 w-4 inline mr-1" /> Efectivo
              </button>
              <button type="button" onClick={() => setSelectedMethod('qr')} className={`px-3 py-2 rounded-lg border ${selectedMethod==='qr' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                <QrCode className="h-4 w-4 inline mr-1" /> QR
              </button>
              <button type="button" onClick={() => setSelectedMethod('card')} className={`px-3 py-2 rounded-lg border ${selectedMethod==='card' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                <CreditCard className="h-4 w-4 inline mr-1" /> Tarjeta
              </button>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowMethodModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors" disabled={paymentProcessing}>Cancelar</button>
              <button onClick={handleConfirmMethodAndLiberate} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" disabled={paymentProcessing}>
                {paymentProcessing ? 'Procesando...' : 'Confirmar y Liberar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Registrar Pago</h3>
              <p className="text-sm text-gray-600">Reserva #{paymentReservation.id} • Inicio {formatDate(paymentReservation.startTime)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto a cobrar</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`px-3 py-2 rounded-lg border ${paymentMethod==='cash' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
                  >
                    <Banknote className="h-4 w-4 inline mr-1" /> Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`px-3 py-2 rounded-lg border ${paymentMethod==='qr' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
                  >
                    <QrCode className="h-4 w-4 inline mr-1" /> QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`px-3 py-2 rounded-lg border ${paymentMethod==='card' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
                  >
                    <CreditCard className="h-4 w-4 inline mr-1" /> Tarjeta
                  </button>
                </div>
              </div>

              {paymentMethod === 'qr' && (
                <div className="text-center">
                  <img
                    src={(import.meta as any).env?.VITE_QR_PAYMENT_URL || 'https://res.cloudinary.com/dcybfl5ae/image/upload/v1760327765/rueda_negocios/comprobantes/BNB_Simple_2025_10_12-19_07_45_gvxwmo.png'}
                    alt="QR de pago"
                    className="mx-auto h-48 w-48 object-contain border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-2">Escanea el QR para pagar. Completa la referencia con el código de transacción.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Referencia (opcional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="ID de transacción, últimos 4 de tarjeta, etc."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentReservation(null); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={paymentProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePayment}
                disabled={paymentProcessing || paymentAmount <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentProcessing ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SpaceDetailModal;
