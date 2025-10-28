import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Vehicle, ParkingSpace, Reservation } from '../types';
import { Calendar, Clock, MapPin, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
    return type === 'motorcycle' ? '🏍️' : '🚗';
  };

  const getVehicleTypeLabel = (type: string) => {
    return type === 'motorcycle' ? 'Moto' : 'Auto';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Crear Reserva</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Parking Space Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-gray-900">
                Espacio {parkingSpace.spaceNumber}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {parkingSpace.zone}
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>Auto: ${parkingSpace.carRate}/h</span>
              <span className="mx-2">•</span>
              <span>Moto: ${parkingSpace.motorcycleRate}/h</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Active Reservation Warning */}
            {activeReservation && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Ya tienes una reserva activa
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                      Espacio {activeReservation.parkingSpace?.spaceNumber} - 
                      Vehículo: {activeReservation.vehicle?.model} ({activeReservation.vehicle?.plate})
                    </p>
                    <button
                      type="button"
                      onClick={cancelActiveReservation}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Cancelar Reserva Activa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Vehículo
              </label>
              
              {vehiclesLoading ? (
                <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
              ) : vehicles.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        No tienes vehículos registrados
                      </p>
                      <p className="text-sm text-yellow-700">
                        Ve a "Mis Vehículos" para agregar uno
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <label
                      key={vehicle.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVehicle?.id === vehicle.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                        <span className="text-2xl mr-3">
                          {getVehicleIcon(vehicle.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">
                              {vehicle.model}
                            </span>
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {getVehicleTypeLabel(vehicle.type)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {vehicle.plate} • {vehicle.color}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Time Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha y Hora Inicio
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-field"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo se pueden hacer reservas para el día actual
                </p>
              </div>
              
              {/* Indefinite Time Checkbox */}
              <div className="flex items-center">
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="indefinite" className="ml-2 text-sm text-gray-700">
                  Tiempo indefinido (sin hora de fin)
                </label>
              </div>
              
              {!isIndefinite && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Fecha y Hora Fin
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input-field"
                    required={!isIndefinite}
                  />
                </div>
              )}
            </div>

            {/* Amount Calculation */}
            {selectedVehicle && startTime && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {isIndefinite ? 'Estimado mínimo (1 hora):' : 'Total a pagar:'}
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    ${Number(calculateAmount() || 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {isIndefinite ? (
                    <>
                      <div>💰 Estimado basado en 1 hora de estancia</div>
                      <div>⏰ El monto final se calculará al finalizar</div>
                      <div>📊 Tarifa: ${selectedVehicle?.type === 'motorcycle' 
                        ? Number(parkingSpace.motorcycleRate || 0).toFixed(2)
                        : Number(parkingSpace.carRate || 0).toFixed(2)}/hora
                      </div>
                    </>
                  ) : (
                    <>
                      Tarifa: ${selectedVehicle?.type === 'motorcycle' 
                        ? Number(parkingSpace.motorcycleRate || 0).toFixed(2)
                        : Number(parkingSpace.carRate || 0).toFixed(2)}/hora
                      {endTime && (
                        <>
                          {' • Duración: '}
                          {Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) * 10) / 10}h
                        </>
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
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedVehicle || vehicles.length === 0 || !!activeReservation}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : activeReservation ? 'Cancelar Reserva Activa Primero' : 'Crear Reserva'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateReservation;
