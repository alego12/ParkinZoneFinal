import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Vehicle, ParkingSpace, Reservation } from '../types';
import { Calendar, Clock, MapPin, DollarSign, AlertCircle, X, Car, CheckCircle, Loader2, Bike } from 'lucide-react';
import toast from 'react-hot-toast';
import { translateVehicleTypeShort } from '../utils/translations';

interface CreateReservationProps {
  parkingSpace: ParkingSpace;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateReservation: React.FC<CreateReservationProps> = ({ 
  parkingSpace, 
  onClose, 
  onSuccess 
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchVehicles();
    checkActiveReservation();
    // Set default start time to current time (today only)
    const now = new Date();
    setStartTime(now.toISOString().slice(0, 16));
  }, []);

  const checkActiveReservation = async () => {
    try {
      const response = await api.reservations.getActive();
      setActiveReservation(response.data.reservation);
    } catch (error) {
      // No active reservation is fine
      setActiveReservation(null);
    }
  };

  const cancelActiveReservation = async () => {
    if (!activeReservation) return;
    
    try {
      await api.reservations.cancel(activeReservation.id);
      setActiveReservation(null);
      toast.success('Reserva activa cancelada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cancelar la reserva');
    }
  };

  const fetchVehicles = async () => {
    try {
      setVehiclesLoading(true);
      const response = await api.vehicles.getAll();
      
      // Filter vehicles based on parking space compatibility
      const compatibleVehicles = response.data.vehicles.filter((vehicle: Vehicle) => {
        return parkingSpace.vehicleType === 'both' || 
               parkingSpace.vehicleType === vehicle.type;
      });
      
      setVehicles(compatibleVehicles);
      
      // Auto-select first vehicle if only one compatible
      if (compatibleVehicles.length === 1) {
        setSelectedVehicle(compatibleVehicles[0]);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Error al cargar vehículos');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const calculateAmount = () => {
    if (!selectedVehicle || !startTime) return 0;
    
    // Get the hourly rate
    const hourlyRate = selectedVehicle.type === 'motorcycle' 
      ? (parkingSpace.motorcycleRate || 0)
      : (parkingSpace.carRate || 0);
    
    if (isIndefinite) {
      // For indefinite reservations, show estimated minimum (1 hour)
      // The actual amount will be calculated when the reservation ends
      return hourlyRate;
    }
    
    if (!endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return durationHours * hourlyRate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicle) {
      toast.error('Selecciona un vehículo');
      return;
    }

    if (!startTime) {
      toast.error('Selecciona una hora de inicio');
      return;
    }

    if (!isIndefinite && !endTime) {
      toast.error('Selecciona una hora de fin o marca como indefinida');
      return;
    }

    // Validate start time is today
    const start = new Date(startTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (start < today || start >= tomorrow) {
      toast.error('Las reservas solo se pueden hacer para el día actual');
      return;
    }

    if (!isIndefinite && endTime) {
      const end = new Date(endTime);
      if (end <= start) {
        toast.error('La hora de fin debe ser posterior a la hora de inicio');
        return;
      }
    }

    try {
      setLoading(true);
      
      await api.reservations.create({
        vehicleId: selectedVehicle.id,
        parkingSpaceId: parkingSpace.id,
        startTime: start.toISOString(),
        endTime: isIndefinite ? null : (endTime ? new Date(endTime).toISOString() : null),
      });

      toast.success('Reserva creada exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Datos inválidos';
        toast.error(`Error de validación: ${errorMessage}`);
      } else if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || 'Error interno del servidor';
        toast.error(`Error del servidor: ${errorMessage}`);
        
        // Mostrar detalles adicionales en desarrollo
        if ((import.meta as any).env?.DEV) {
          console.error('Error details:', error.response?.data);
        }
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Error de conexión. Verifica que el servidor esté funcionando.');
      } else {
        toast.error(error.response?.data?.message || 'Error inesperado al crear la reserva');
      }
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    // Icon is handled by lucide-react icons in the component
    return '';
  };

  const getVehicleTypeLabel = (type: string) => {
    return translateVehicleTypeShort(type);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Crear Reserva</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110 active:scale-95"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Parking Space Info */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 mb-6 border-2 border-blue-200 shadow-md">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-lg">
                  Espacio {parkingSpace.spaceNumber}
                </span>
                <div className="text-sm text-gray-600 mt-0.5">{parkingSpace.zone}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm bg-white/60 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-gray-700">Auto:</span>
                <span className="font-bold text-green-600">${parkingSpace.carRate}/h</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-gray-700">Moto:</span>
                <span className="font-bold text-orange-600">${parkingSpace.motorcycleRate}/h</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Active Reservation Warning */}
            {activeReservation && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
                <div className="flex items-start">
                  <div className="p-2 bg-red-600 rounded-lg mr-3">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-900 mb-2">
                      Ya tienes una reserva activa
                    </h3>
                    <p className="text-sm text-red-800 mb-3 bg-white/60 rounded-lg p-2">
                      <span className="font-semibold">Espacio {activeReservation.parkingSpace?.spaceNumber}</span>
                      <br />
                      Vehículo: {activeReservation.vehicle?.model} ({activeReservation.vehicle?.plate})
                    </p>
                    <button
                      type="button"
                      onClick={cancelActiveReservation}
                      className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-medium shadow-sm hover:shadow-md"
                    >
                      Cancelar Reserva Activa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-600" />
                Seleccionar Vehículo
              </label>
              
              {vehiclesLoading ? (
                <div className="animate-pulse bg-gradient-to-r from-gray-200 to-gray-300 h-16 rounded-xl"></div>
              ) : vehicles.length === 0 ? (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-600 rounded-lg mr-3">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-yellow-900">
                        No tienes vehículos registrados
                      </p>
                      <p className="text-sm text-yellow-800 mt-1">
                        Ve a "Mis Vehículos" para agregar uno
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicles.map((vehicle) => (
                    <label
                      key={vehicle.id}
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedVehicle?.id === vehicle.id
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-[1.02]'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vehicle"
                        value={vehicle.id}
                        checked={selectedVehicle?.id === vehicle.id}
                        onChange={() => setSelectedVehicle(vehicle)}
                        className="sr-only"
                      />
                      <div className="flex items-center flex-1">
                        <div className={`p-3 rounded-xl mr-4 ${
                          vehicle.type === 'motorcycle' 
                            ? 'bg-gradient-to-br from-orange-100 to-orange-200' 
                            : 'bg-gradient-to-br from-blue-100 to-blue-200'
                        }`}>
                          {vehicle.type === 'motorcycle' ? (
                            <Bike className="h-6 w-6 text-orange-600" />
                          ) : (
                            <Car className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-lg">
                              {vehicle.model}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                              {getVehicleTypeLabel(vehicle.type)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            {vehicle.plate} • {vehicle.color}
                          </div>
                        </div>
                        {selectedVehicle?.id === vehicle.id && (
                          <div className="p-1.5 bg-blue-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Time Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Fecha y Hora Inicio
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Solo se pueden hacer reservas para el día actual
                </p>
              </div>
              
              {/* Indefinite Time Checkbox */}
              <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="indefinite"
                  checked={isIndefinite}
                  onChange={(e) => {
                    setIsIndefinite(e.target.checked);
                    if (e.target.checked) {
                      setEndTime('');
                    }
                  }}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="indefinite" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                  Tiempo indefinido (sin hora de fin)
                </label>
              </div>
              
              {!isIndefinite && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    Fecha y Hora Fin
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required={!isIndefinite}
                  />
                </div>
              )}
            </div>

            {/* Amount Calculation */}
            {selectedVehicle && startTime && (
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-5 border-2 border-green-300 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-800">
                    {isIndefinite ? 'Estimado mínimo (1 hora):' : 'Total a pagar:'}
                  </span>
                  <span className="text-2xl font-bold text-green-700 flex items-center gap-1">
                    <DollarSign className="h-6 w-6" />
                    {Number(calculateAmount() || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-xs text-gray-700 bg-white/60 rounded-lg p-3 space-y-1">
                  {isIndefinite ? (
                    <>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-gray-600" />
                        <span>Estimado basado en 1 hora de estancia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-600" />
                        <span>El monto final se calculará al finalizar</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <DollarSign className="h-3 w-3 text-gray-600" />
                        <span>Tarifa: ${selectedVehicle?.type === 'motorcycle' 
                          ? Number(parkingSpace.motorcycleRate || 0).toFixed(2)
                          : Number(parkingSpace.carRate || 0).toFixed(2)}/hora
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold">
                        Tarifa: ${selectedVehicle?.type === 'motorcycle' 
                          ? Number(parkingSpace.motorcycleRate || 0).toFixed(2)
                          : Number(parkingSpace.carRate || 0).toFixed(2)}/hora
                      </div>
                      {endTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Duración: {Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) * 10) / 10} horas
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedVehicle || vehicles.length === 0 || !!activeReservation}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </span>
                ) : activeReservation ? (
                  'Cancelar Reserva Activa Primero'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Crear Reserva
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateReservation;
