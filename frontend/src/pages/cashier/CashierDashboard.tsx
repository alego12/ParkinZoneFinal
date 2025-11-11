import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ParkingSpace } from '../../types';
import { MapPin, Clock, Car, Bike, RefreshCw, Search, X, Loader2, DollarSign, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import SpaceDetailModal from '../../components/SpaceDetailModal';

const CashierDashboard: React.FC = () => {
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualPlate, setManualPlate] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Listen for updates from SpaceDetailModal to reflect liberation/changes
    const handleSpaceStatusChange = (event: any) => {
      const { spaceId, newStatus } = event.detail || {};
      setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, status: newStatus } : s));
    };
    window.addEventListener('spaceStatusChanged', handleSpaceStatusChange);
    return () => window.removeEventListener('spaceStatusChanged', handleSpaceStatusChange);
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
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-semibold text-gray-600">Cargando panel de caja...</span>
        </div>
      </div>
    );
  }

  const reservedSpaces = spaces.filter(s => s.status === 'reserved');
  const occupiedSpaces = spaces.filter(s => s.status === 'occupied');

  const getVehicleIcon = (vehicleType: 'car' | 'motorcycle' | 'both') => {
    if (vehicleType === 'car') {
      return <Car className="h-4 w-4 mx-auto mb-1" />;
    } else if (vehicleType === 'motorcycle') {
      return <Bike className="h-4 w-4 mx-auto mb-1" />;
    } else {
      return (
        <div className="relative h-5 w-5 mx-auto mb-1 flex items-center justify-center">
          <Car className="h-4 w-4 absolute" />
          <Bike className="h-3.5 w-3.5 absolute -bottom-0.5 -right-0.5 opacity-95" />
        </div>
      );
    }
  };

  const handleSpaceClick = (space: ParkingSpace) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSpace(null);
  };

  // Utilities to mirror simplified LPR manual flow
  const getFirstAvailableSpaceFresh = async (): Promise<ParkingSpace | null> => {
    try {
      const resp = await api.parking.getSpaces();
      const fresh = (resp.data.spaces || []).filter((s: ParkingSpace) => s.status === 'available' && (s as any).isActive !== false);
      return fresh.length > 0 ? fresh[0] : null;
    } catch {
      return null;
    }
  };

  const handleExistingVehicle = async (vehicle: any) => {
    // 1) Buscar reservas para este vehículo
    const reservationsResp = await api.security.getReservations();
    const allReservations = reservationsResp.data?.reservations || [];
    const reservationsByVehicle = allReservations.filter((r: any) => r.vehicleId === vehicle.id);

    // Caso SALIDA: si hay una reserva 'occupied' con plaza asignada
    const occupiedReservation = reservationsByVehicle
      .filter((r: any) => r.status === 'occupied' && !!(r.parkingSpaceId || r.parkingSpace))
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

    if (occupiedReservation) {
      const spaceId = occupiedReservation.parkingSpaceId || occupiedReservation.parkingSpace?.id;
      if (!spaceId) {
        toast.error('No se pudo determinar la plaza ocupada para salida');
        return;
      }
      try {
        const details = await api.security.getSpaceDetails(spaceId);
        const space: ParkingSpace = details.data.space;
        setSelectedSpace(space);
        setIsModalOpen(true);
      } catch {
        toast.error('No se pudo abrir el modal del espacio');
      }
      return; // Evitar flujo de entrada
    }

    // Caso ENTRADA: considerar reservas activas/pending sin endTime
    const candidateReservations = reservationsByVehicle
      .filter((r: any) => ['pending', 'active'].includes(r.status))
      .filter((r: any) => !r.endTime);

    const existingReservation = candidateReservations
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

    if (existingReservation) {
      // Crear registro LPR y procesarlo a ocupado
      const lprResp = await api.lpr.createRecord({
        plateNumber: vehicle.plate,
        vehicleColor: vehicle.color || 'Desconocido',
        confidence: 1.0,
        status: 'pending',
        reservationId: existingReservation.id,
        vehicleId: vehicle.id,
        userId: vehicle.userId || undefined,
        notes: 'Entrada manual (reserva existente)'
      });
      const recordId = lprResp.data?.record?.id;
      if (recordId) {
        await api.security.processLPRRecord(recordId, { action: 'match_reservation', reservationId: existingReservation.id });
      }
      toast.success(`Vehículo ${vehicle.plate} ingresó a su reserva`);
      await fetchDashboardData();
    } else {
      // Sin reserva: asignar primera plaza disponible y crear reserva
      const availableSpace = await getFirstAvailableSpaceFresh();
      if (!availableSpace) {
        toast.error('No hay plazas disponibles');
        return;
      }
      await api.security.createReservation({
        vehicleId: vehicle.id,
        parkingSpaceId: availableSpace.id,
        startTime: new Date().toISOString(),
        endTime: null,
        status: 'occupied'
      });
      toast.success(`Vehículo ${vehicle.plate} asignado a espacio ${availableSpace.spaceNumber}`);
      await fetchDashboardData();
    }
  };

  const handleNewVehicle = async (plate: string) => {
    // Crear usuario/vehículo mínimo no es parte del flujo de caja; intentaremos solo ocupar con reserva nueva
    const availableSpace = await getFirstAvailableSpaceFresh();
    if (!availableSpace) {
      toast.error('No hay plazas disponibles');
      return;
    }
    // Crear vehículo sin usuario (permitido por endpoint de seguridad)
    const vehResp = await api.security.createVehicle({ plate, model: 'Desconocido', color: 'Desconocido' });
    const vehicle = vehResp.data?.vehicle;
    await api.security.createReservation({
      vehicleId: vehicle.id,
      parkingSpaceId: availableSpace.id,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'occupied'
    });
    toast.success(`Vehículo ${plate} asignado a espacio ${availableSpace.spaceNumber}`);
    await fetchDashboardData();
  };

  const searchVehicle = async (plate: string) => {
    try {
      setProcessing(true);
      const response = await api.security.getVehicles();
      const vehicles = response.data.vehicles;
      const existingVehicle = vehicles.find((v: any) => v.plate.toLowerCase() === plate.toLowerCase());
      if (existingVehicle) {
        await handleExistingVehicle(existingVehicle);
      } else {
        await handleNewVehicle(plate);
      }
    } catch (e) {
      toast.error('Error al procesar placa');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Caja</h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona espacios reservados y ocupados</p>
          </div>
        </div>
        <button 
          onClick={fetchDashboardData} 
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold transform hover:scale-105 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Reservados</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{reservedSpaces.length}</p>
              <p className="text-xs text-gray-600 mt-1 font-medium">espacios reservados</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl shadow-lg border-2 border-red-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-md">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ocupados</p>
              <p className="text-4xl font-bold text-red-600 mt-1">{occupiedSpaces.length}</p>
              <p className="text-xs text-gray-600 mt-1 font-medium">espacios ocupados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listas de espacios: Reservados y Ocupados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Reservados */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              Espacios Reservados ({reservedSpaces.length})
            </h3>
          </div>
          <div className="p-6">
            {reservedSpaces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium">No hay espacios reservados</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {reservedSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 rounded-xl text-center cursor-pointer hover:from-blue-200 hover:to-blue-300 transition-all border-2 border-blue-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                    onClick={() => handleSpaceClick(space)}
                    title="Hacer clic para ver detalles"
                  >
                    <div className="mb-2 flex justify-center">
                      {getVehicleIcon(space.vehicleType)}
                    </div>
                    <div className="font-bold text-sm">{space.spaceNumber}</div>
                    <div className="text-xs font-medium mt-1 opacity-80">{space.zone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ocupados */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-5 border-b-2 border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-red-600 to-red-700 rounded-lg">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              Espacios Ocupados ({occupiedSpaces.length})
            </h3>
          </div>
          <div className="p-6">
            {occupiedSpaces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium">No hay espacios ocupados</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {occupiedSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="p-4 bg-gradient-to-br from-red-100 to-red-200 text-red-800 rounded-xl text-center cursor-pointer hover:from-red-200 hover:to-red-300 transition-all border-2 border-red-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                    onClick={() => handleSpaceClick(space)}
                    title="Hacer clic para ver detalles"
                  >
                    <div className="mb-2 flex justify-center">
                      {getVehicleIcon(space.vehicleType)}
                    </div>
                    <div className="font-bold text-sm">{space.spaceNumber}</div>
                    <div className="text-xs font-medium mt-1 opacity-80">{space.zone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entrada manual LPR (simplificada) */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
        <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <Search className="h-4 w-4 text-white" />
            </div>
            Entrada Manual por Placa
          </h3>
          <p className="text-sm text-gray-600 mt-1 font-medium">Ingresa la placa del vehículo para procesar entrada o salida</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Número de Placa
              </label>
              <input
                type="text"
                placeholder="Ejemplo: ABC123 o 1852PHD"
                value={manualPlate}
                onChange={e=>setManualPlate(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && manualPlate.trim().length >= 5 && !processing) {
                    searchVehicle(manualPlate.trim());
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-2 font-medium">Mínimo 5 caracteres</p>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <button
                onClick={() => manualPlate.trim() && searchVehicle(manualPlate.trim())}
                disabled={processing || manualPlate.trim().length < 5}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Procesar</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={() => setManualPlate('')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold transform hover:scale-105 active:scale-95"
              >
                <X className="h-4 w-4" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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

export default CashierDashboard;
