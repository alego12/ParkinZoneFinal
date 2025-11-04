import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ParkingSpace } from '../../types';
import { MapPin, Clock } from 'lucide-react';
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
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const reservedSpaces = spaces.filter(s => s.status === 'reserved');
  const occupiedSpaces = spaces.filter(s => s.status === 'occupied');

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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Caja</h1>
        <button onClick={fetchDashboardData} className="btn-primary">Actualizar</button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Reservados</p>
              <p className="text-2xl font-semibold text-gray-900">{reservedSpaces.length}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{occupiedSpaces.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listas de espacios: Reservados y Ocupados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Reservados */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              Espacios Reservados ({reservedSpaces.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-2">
              {reservedSpaces.map((space) => (
                <div
                  key={space.id}
                  className="p-3 bg-blue-100 text-blue-800 rounded-lg text-center cursor-pointer hover:bg-blue-200 transition-colors"
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

        {/* Ocupados */}
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
      </div>

      {/* Entrada manual LPR (simplificada) */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Entrada Manual (Placa)</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="Ingresa placa (ej. 1852PHD)"
            value={manualPlate}
            onChange={e=>setManualPlate(e.target.value.toUpperCase())}
            className="input md:col-span-4"
          />
          <button
            onClick={() => manualPlate.trim() && searchVehicle(manualPlate.trim())}
            disabled={processing || manualPlate.trim().length < 5}
            className="btn-primary disabled:opacity-50"
          >
            {processing ? 'Procesando...' : 'Procesar'}
          </button>
          <button
            onClick={() => setManualPlate('')}
            className="btn-secondary"
          >
            Limpiar
          </button>
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
