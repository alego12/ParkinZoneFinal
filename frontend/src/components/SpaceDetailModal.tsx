import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ParkingSpace, Reservation, Schedule } from '../types';
import { X, MapPin, Clock, Car, User, Phone, Calendar, DollarSign, Unlock, AlertTriangle, QrCode, CreditCard, Banknote, Bike, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateVehicleType, translateVehicleTypeShort } from '../utils/translations';

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
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'occupied':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
      case 'maintenance':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
      case 'reserved':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
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

  const getVehicleIcon = (vehicleType: 'car' | 'motorcycle' | 'both') => {
    if (vehicleType === 'car') {
      return <Car className="h-5 w-5" />;
    } else if (vehicleType === 'motorcycle') {
      return <Bike className="h-5 w-5" />;
    } else {
      // 'both' - mostrar ambos iconos superpuestos
      return (
        <div className="relative h-5 w-5 flex items-center justify-center">
          <Car className="h-5 w-5 absolute" />
          <Bike className="h-4 w-4 absolute -bottom-0.5 -right-0.5 opacity-95" />
        </div>
      );
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Espacio {space.spaceNumber}
              </h2>
              <p className="text-sm text-gray-600 font-medium mt-1">{space.zone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
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
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg">
                    <Car className="h-4 w-4 text-white" />
                  </div>
                  Estado Actual
                </h3>
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-5 rounded-xl border-2 border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-gray-600" />
                      <span className="font-bold text-gray-900">Estado del Espacio</span>
                    </div>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${getStatusColor(space.status)}`}>
                      {getStatusText(space.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 mb-2">Tipo de Vehículo</p>
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(space.vehicleType)}
                        <p className="font-bold text-gray-900">{translateVehicleType(space.vehicleType)}</p>
                      </div>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Tarifas
                      </p>
                      <p className="font-bold text-gray-900">
                        Auto: ${space.carRate} | Motocicleta: ${space.motorcycleRate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Reservation or Occupied Vehicle */}
              {details.currentReservation ? (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    Reserva Actual
                  </h3>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="font-bold text-blue-900">Reserva Activa</span>
                      </div>
                      <div className="flex gap-2">
                        {space.status === 'occupied' && details.currentReservation.status === 'occupied' && (
                          <button
                            onClick={() => {
                              if (!canPay) {
                                toast.error('Acción reservada para cajeros y administradores');
                                return;
                              }
                              setShowMethodModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                          >
                            <Unlock className="h-4 w-4" />
                            <span>Liberar Espacio</span>
                          </button>
                        )}
                        <button
                          onClick={() => setShowLiberateModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                        >
                          <Unlock className="h-4 w-4" />
                          <span>Finalizar</span>
                        </button>
                        <button
                          onClick={handleSetMaintenanceSafely}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Mantenimiento</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Cliente
                        </p>
                        <p className="font-bold text-gray-900">
                          {details.currentReservation.user?.firstName} {details.currentReservation.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          {details.currentReservation.user?.phone}
                        </p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          Vehículo
                        </p>
                        <p className="font-bold text-gray-900">
                          {details.currentReservation.vehicle?.model} - <span className="font-mono">{details.currentReservation.vehicle?.plate}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          {details.currentReservation.vehicle?.color} • {details.currentReservation.vehicle?.type ? translateVehicleTypeShort(details.currentReservation.vehicle.type) : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Hora de Inicio
                        </p>
                        <p className="font-bold text-gray-900 text-sm">
                          {formatDate(details.currentReservation.startTime)}
                        </p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1">Estado</p>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusColor(details.currentReservation.status)}`}>
                          {getStatusText(details.currentReservation.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : space.status === 'occupied' ? (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-red-600 to-red-700 rounded-lg">
                      <Car className="h-4 w-4 text-white" />
                    </div>
                    Vehículo Ocupando el Espacio
                  </h3>
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 p-5 rounded-xl border-2 border-red-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-red-600" />
                        <span className="font-bold text-red-900">Espacio Ocupado</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowLiberateModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                        >
                          <Unlock className="h-4 w-4" />
                          <span>Liberar Espacio</span>
                        </button>
                        <button
                          onClick={() => {
                            handleChangeStatus('maintenance');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span>Mantenimiento</span>
                        </button>
                      </div>
                    </div>
                    
                    {details.occupiedVehicleInfo ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/60 p-3 rounded-lg">
                          <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            Vehículo Detectado
                          </p>
                          <p className="font-bold text-gray-900">
                            {details.occupiedVehicleInfo.vehicle.model} - <span className="font-mono">{details.occupiedVehicleInfo.vehicle.plate}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            {details.occupiedVehicleInfo.vehicle.color} • {details.occupiedVehicleInfo.vehicle.type ? translateVehicleTypeShort(details.occupiedVehicleInfo.vehicle.type) : 'N/A'}
                          </p>
                        </div>
                        {details.occupiedVehicleInfo.user ? (
                          <div className="bg-white/60 p-3 rounded-lg">
                            <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Propietario
                            </p>
                            <p className="font-bold text-gray-900">
                              {details.occupiedVehicleInfo.user.firstName} {details.occupiedVehicleInfo.user.lastName}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {details.occupiedVehicleInfo.user.phone}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white/60 p-3 rounded-lg">
                            <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Hora de Detección
                            </p>
                            <p className="font-bold text-gray-900 text-sm">
                              {formatDate(details.occupiedVehicleInfo.detectedAt)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Sin información de usuario</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-white/60 rounded-lg">
                        <p className="text-gray-600 mb-2 font-medium">Este espacio está actualmente ocupado</p>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
                      <Car className="h-4 w-4 text-white" />
                    </div>
                    Acciones Disponibles
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-green-600" />
                        <span className="font-bold text-green-900">Espacio Disponible</span>
                      </div>
                      <button
                        onClick={handleSetMaintenanceSafely}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Marcar Mantenimiento</span>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      Este espacio está disponible para nuevas reservas. Puedes marcarlo como en mantenimiento si es necesario.
                    </p>
                  </div>
                </div>
              )}

              {space.status === 'maintenance' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    Acciones Disponibles
                  </h3>
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-xl border-2 border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="font-bold text-yellow-900">En Mantenimiento</span>
                      </div>
                      <button
                        onClick={() => {
                          handleChangeStatus('available');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                      >
                        <Car className="h-4 w-4" />
                        <span>Marcar Disponible</span>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      Este espacio está en mantenimiento. Puedes marcarlo como disponible cuando esté listo para uso.
                    </p>
                  </div>
                </div>
              )}

              {/* Today's Schedule */}
              {details.todaySchedule && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    Horario del Día
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-green-900">{details.todaySchedule.name}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Horario de Apertura
                        </p>
                        <p className="font-bold text-gray-900">{formatTime(details.todaySchedule.startTime)}</p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Horario de Cierre
                        </p>
                        <p className="font-bold text-gray-900">{formatTime(details.todaySchedule.endTime)}</p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Tarifa Extendida
                        </p>
                        <p className="font-bold text-gray-900 flex items-center">
                          ${details.todaySchedule.overtimeRate}
                        </p>
                      </div>
                    </div>
                    {details.todaySchedule.description && (
                      <div className="mt-4 bg-white/60 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1">Descripción</p>
                        <p className="text-sm text-gray-900">{details.todaySchedule.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Reservations */}
              {(details.recentReservations || []).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    Reservas Recientes (Últimos 7 días)
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(details.recentReservations || []).map((reservation) => (
                      <div key={reservation.id} className="bg-gradient-to-r from-gray-50 to-purple-50 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {reservation.user?.firstName} {reservation.user?.lastName}
                              </p>
                              <p className="text-sm text-gray-600 font-medium">
                                {reservation.vehicle?.model} - <span className="font-mono">{reservation.vehicle?.plate}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600 mb-1 flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {formatDate(reservation.startTime)}
                            </p>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusColor(reservation.status)}`}>
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
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  Estadísticas del Espacio
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 text-center shadow-sm">
                    <p className="text-3xl font-bold text-blue-600">{(details.recentReservations || []).length}</p>
                    <p className="text-sm font-bold text-gray-600 mt-1">Reservas (7 días)</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 text-center shadow-sm">
                    <p className="text-3xl font-bold text-green-600">
                      {(details.recentReservations || []).filter(r => r.status === 'completed').length}
                    </p>
                    <p className="text-sm font-bold text-gray-600 mt-1">Completadas</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border-2 border-yellow-200 text-center shadow-sm">
                    <p className="text-3xl font-bold text-yellow-600">
                      {(details.recentReservations || []).filter(r => r.status === 'cancelled').length}
                    </p>
                    <p className="text-sm font-bold text-gray-600 mt-1">Canceladas</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200 text-center shadow-sm">
                    <p className="text-3xl font-bold text-purple-600">
                      ${(details.recentReservations || []).reduce((sum, r) => {
                        const amount = typeof r.totalAmount === 'number' ? r.totalAmount : 0;
                        return sum + amount;
                      }, 0).toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-gray-600 mt-1">Ingresos (7 días)</p>
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
        <div className="flex justify-end space-x-3 p-6 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold transform hover:scale-105 active:scale-95"
          >
            Cerrar
          </button>
          </div>
          </div>
        </div>
      )}

      {/* Liberation Confirmation Modal */}
      {showLiberateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-gray-200">
              <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Liberar Espacio</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">Espacio {space.spaceNumber} - {space.zone}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Razón de liberación *
                </label>
                <select
                  value={liberateReason}
                  onChange={(e) => setLiberateReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
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
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={liberateNotes}
                  onChange={(e) => setLiberateNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-gray-400"
                  placeholder="Agrega cualquier información adicional..."
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-bold mb-1">Acción importante:</p>
                  <p>Al liberar este espacio, se marcará como disponible y cualquier reserva activa será finalizada automáticamente.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLiberateModal(false);
                  setLiberateReason('');
                  setLiberateNotes('');
                }}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                disabled={liberating}
              >
                Cancelar
              </button>
              <button
                onClick={handleLiberateSpace}
                disabled={liberating || !liberateReason.trim()}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                {liberating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[65] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="mb-6 pb-4 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona método de pago</h3>
              <p className="text-sm text-gray-600 font-medium">El vehículo se está retirando. Selecciona el método con el que pagará.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button 
                type="button" 
                onClick={() => setSelectedMethod('cash')} 
                className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold flex flex-col items-center gap-2 ${
                  selectedMethod==='cash' 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-gray-50'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-sm">Efectivo</span>
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedMethod('qr')} 
                className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold flex flex-col items-center gap-2 ${
                  selectedMethod==='qr' 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-gray-50'
                }`}
              >
                <QrCode className="h-5 w-5" />
                <span className="text-sm">QR</span>
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedMethod('card')} 
                className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold flex flex-col items-center gap-2 ${
                  selectedMethod==='card' 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-sm">Tarjeta</span>
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowMethodModal(false)} 
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none" 
                disabled={paymentProcessing}
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmMethodAndLiberate} 
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none" 
                disabled={paymentProcessing}
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Confirmar y Liberar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentReservation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="mb-6 pb-4 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Registrar Pago</h3>
              <p className="text-sm text-gray-600 font-medium">Reserva #{paymentReservation.id} • Inicio {formatDate(paymentReservation.startTime)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Monto a cobrar
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Método de pago</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold flex flex-col items-center gap-2 ${
                      paymentMethod==='cash' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg scale-105' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-sm">Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold flex flex-col items-center gap-2 ${
                      paymentMethod==='qr' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg scale-105' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <QrCode className="h-5 w-5" />
                    <span className="text-sm">QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold flex flex-col items-center gap-2 ${
                      paymentMethod==='card' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600 shadow-lg scale-105' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm">Tarjeta</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'qr' && (
                <div className="text-center bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border-2 border-gray-200">
                  <img
                    src={(import.meta as any).env?.VITE_QR_PAYMENT_URL || 'https://res.cloudinary.com/dcybfl5ae/image/upload/v1760327765/rueda_negocios/comprobantes/BNB_Simple_2025_10_12-19_07_45_gvxwmo.png'}
                    alt="QR de pago"
                    className="mx-auto h-48 w-48 object-contain border-2 border-gray-300 rounded-xl shadow-md"
                  />
                  <p className="text-xs text-gray-600 mt-3 font-medium">Escanea el QR para pagar. Completa la referencia con el código de transacción.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Referencia *</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-gray-400"
                  placeholder="ID de transacción, últimos 4 de tarjeta, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t-2 border-gray-200">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentReservation(null); }}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                disabled={paymentProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePayment}
                disabled={paymentProcessing || paymentAmount <= 0 || !paymentReference.trim()}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Registrar Pago</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SpaceDetailModal;
