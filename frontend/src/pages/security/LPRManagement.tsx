import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LPRRecord, User, ParkingSpace } from '../../types';
import { Search, UserPlus, CheckCircle, XCircle, Clock, AlertTriangle, Camera, Shield, RefreshCw, Loader2, Eye, Car, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
// Removed CameraComponent to focus on manual flow
import ClientInfoModal from '../../components/ClientInfoModal';
import SpaceDetailModal from '../../components/SpaceDetailModal';
import LPRCameraModal from '../../components/LPRCameraModal';

interface MatchResult {
  record: LPRRecord;
  vehicles: any[];
  reservations: any[];
  hasMatch: boolean;
}
 
const LPRManagement: React.FC = () => {
  const [records, setRecords] = useState<LPRRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LPRRecord | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  const [clientModalData, setClientModalData] = useState<any>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [availableSpaces, setAvailableSpaces] = useState<ParkingSpace[]>([]);
  const [manualPlate, setManualPlate] = useState('');
  const [historyRecords, setHistoryRecords] = useState<LPRRecord[]>([]);
  // Reuse SpaceDetailModal for exit flow
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  // Modal de cámara para reconocimiento de placas
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchAvailableSpaces();
    fetchAllRecords();
  }, []);

  // Obtiene en tiempo real la primera plaza disponible y activa
  const getFirstAvailableSpaceFresh = async (): Promise<ParkingSpace | null> => {
    try {
      const resp = await api.parking.getSpaces();
      const fresh = resp.data.spaces.filter((s: ParkingSpace) => s.status === 'available' && s.isActive);
      return fresh.length > 0 ? fresh[0] : null;
    } catch (e) {
      console.error('Error fetching fresh available spaces:', e);
      return null;
    }
  };

  const fetchAvailableSpaces = async () => {
    try {
      const response = await api.parking.getSpaces();
      const available = response.data.spaces.filter((space: ParkingSpace) => 
        space.status === 'available' && space.isActive
      );
      setAvailableSpaces(available);
    } catch (error) {
      console.error('Error fetching available spaces:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await api.security.getLPRRecords({ 
        page: 1, 
        limit: 50,
        status: 'pending'
      });
      setRecords(response.data.records);
    } catch (error) {
      console.error('Error fetching LPR records:', error);
      toast.error('Error al cargar registros LPR');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecords = async () => {
    try {
      const response = await api.security.getLPRRecords({ page: 1, limit: 50 });
      setHistoryRecords(response.data.records || []);
    } catch (error) {
      console.error('Error fetching all LPR records:', error);
    }
  };

  const handleRecordSelect = async (record: LPRRecord) => {
    setSelectedRecord(record);
    try {
      const response = await api.security.getLPRMatch(record.id);
      setMatchResult(response.data);
    } catch (error) {
      console.error('Error fetching match result:', error);
      toast.error('Error al buscar coincidencias');
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      const response = await api.security.searchUsers(query);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Error al buscar usuarios');
    }
  };

  // Función para buscar vehículo existente
  const searchVehicle = async (plate: string) => {
    try {
      setProcessing(true);
      console.log('🔍 Buscando vehículo con placa:', plate);
      
      const response = await api.security.getVehicles();
      const vehicles = response.data.vehicles;
      const existingVehicle = vehicles.find((v: any) => 
        v.plate.toLowerCase() === plate.toLowerCase()
      );

      if (existingVehicle) {
        console.log('✅ Vehículo encontrado:', existingVehicle);
        await handleExistingVehicle(existingVehicle);
        } else {
        console.log('❌ Vehículo no encontrado, crear nuevo');
        await handleNewVehicle(plate);
      }
    } catch (error) {
      console.error('❌ Error buscando vehículo:', error);
      toast.error('Error al buscar vehículo');
    } finally {
      setProcessing(false);
    }
  };

  // Función para manejar vehículo existente
  const handleExistingVehicle = async (vehicle: any) => {
    try {
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
        console.log('[LPR] Exit detected for space', spaceId, 'opening SpaceDetailModal');
        try {
          const details = await api.security.getSpaceDetails(spaceId);
          const space: ParkingSpace = details.data.space;
          setSelectedSpace(space);
          setIsSpaceModalOpen(true);
        } catch (e) {
          console.error('No se pudo cargar detalles del espacio para salida', e);
          toast.error('No se pudo abrir el modal del espacio');
        }
        return; // Evitar flujo de entrada
      }

      // Caso ENTRADA: Consider only non-finalized reservations: active/pending AND no endTime
      const candidateReservations = reservationsByVehicle
        .filter((r: any) => ['pending', 'active'].includes(r.status))
        .filter((r: any) => !r.endTime);

      // Pick the most recent by startTime if multiple
      const existingReservation = candidateReservations
        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        [0];

      if (existingReservation) {
        // 2) Crear registro LPR manual vinculado y procesarlo para ocupar su espacio reservado
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
          await api.security.processLPRRecord(recordId, {
            action: 'match_reservation',
            reservationId: existingReservation.id,
          });
        }

        toast.success(`Vehículo ${vehicle.plate} ingresó a su reserva (espacio ${existingReservation.parkingSpace?.spaceNumber || existingReservation.parkingSpaceId})`);
      } else {
        // 3) Si no hay reserva, usar la primera plaza disponible como antes
        const availableSpace = await getFirstAvailableSpaceFresh();
        if (!availableSpace) {
          toast.error('No hay plazas disponibles');
          return;
        }

        const reservationData = {
          vehicleId: vehicle.id,
          parkingSpaceId: availableSpace.id,
          startTime: new Date().toISOString(),
          endTime: null,
          status: 'occupied',
          notes: 'Entrada automática por LPR'
        };

        const res = await api.security.createReservation(reservationData);
        const createdReservation = res.data?.reservation;

        await api.parking.updateSpaceStatus(availableSpace.id, 'occupied');

        try {
          await api.lpr.createRecord({
            plateNumber: vehicle.plate,
            vehicleColor: vehicle.color || 'Desconocido',
            confidence: 1.0,
            status: 'processed',
            reservationId: createdReservation?.id,
            vehicleId: vehicle.id,
            userId: vehicle.userId || undefined,
            notes: 'Entrada manual por seguridad/admin'
          });
        } catch (e) {
          console.error('No se pudo crear LPR record manual:', e);
        }

        toast.success(`Vehículo ${vehicle.plate} ingresó automáticamente a plaza ${availableSpace.spaceNumber}`);
      }

      // Actualizar listados
      fetchAvailableSpaces();
      fetchRecords();
      fetchAllRecords();
      
    } catch (error) {
      console.error('❌ Error creando reserva:', error);
      toast.error('Error al crear reserva automática');
    }
  };

  // Función para manejar vehículo nuevo
  const handleNewVehicle = async (plate: string) => {
    // Mostrar modal para completar datos del usuario
    setClientModalData({
      plate,
      isNewUser: true,
      scenario: 'new_user'
    });
    setShowClientModal(true);
  };

  // Función para manejar acciones del modal de cliente
  const handleClientAction = async (action: 'enter' | 'skip' | 'new_user', data?: any) => {
    setProcessing(true);
    
    try {
      if (action === 'new_user') {
        // Crear usuario cliente, luego vehículo con ese owner, luego reserva y registro LPR
        try {
          // 1) Crear usuario cliente
          const userPayload = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            role: 'client',
            // password temporal si el endpoint lo requiere; backend puede ignorarlo
            password: data.password || 'Temp1234*',
          };

          const userResp = await api.security.createUser(userPayload);
          const newUser = userResp.data?.user;

          if (!newUser?.id) {
            toast.error('No se pudo crear el usuario cliente');
            return;
          }

          // 2) Crear vehículo asociado al nuevo usuario
          const vehicleData = {
            userId: newUser.id,
            plate: clientModalData.plate,
            model: data.make && data.model ? `${data.make} ${data.model}` : (data.model || 'No especificado'),
            color: data.color || 'No especificado'
          };

          const vehicleResponse = await api.security.createVehicle(vehicleData);
          const newVehicle = vehicleResponse.data.vehicle;

          // 3) Conseguir plaza disponible real-time y crear reserva
          const availableSpace = await getFirstAvailableSpaceFresh();
          if (availableSpace) {
            const reservationData = {
              vehicleId: newVehicle.id,
              parkingSpaceId: availableSpace.id,
              startTime: new Date().toISOString(),
              endTime: null,
              status: 'occupied',
              notes: 'Entrada automática por LPR - Usuario nuevo'
            };

            const res = await api.security.createReservation(reservationData);
            const createdReservation = res.data?.reservation;
            await api.parking.updateSpaceStatus(availableSpace.id, 'occupied');

            // 4) Registrar LPR manual (sin imagen)
            try {
              await api.lpr.createRecord({
                plateNumber: newVehicle.plate,
                vehicleColor: newVehicle.color || 'Desconocido',
                confidence: 1.0,
                status: 'processed',
                reservationId: createdReservation?.id,
                vehicleId: newVehicle.id,
                userId: newUser.id,
                notes: 'Entrada manual por seguridad/admin - usuario y vehículo nuevos'
              });
            } catch (e) {
              console.error('No se pudo crear LPR record manual:', e);
            }

            // 5) Entregar credenciales (descarga)
            try {
              api.pdf.downloadUserCredentials(newUser.id);
            } catch (e) {
              console.warn('No se pudieron descargar las credenciales del usuario', e);
            }

            toast.success(`✅ Usuario y vehículo creados. Vehículo ${newVehicle.plate} ingresó a plaza ${availableSpace.spaceNumber}`);
          } else {
            toast.error('Usuario y vehículo creados, pero no hay plazas disponibles');
          }

          // Actualizar listas
          fetchAvailableSpaces();
          fetchRecords();
          fetchAllRecords();

        } catch (error) {
          console.error('Error creando usuario/vehículo/reserva:', error);
          toast.error('Error al crear usuario/vehículo/reserva');
        }
      } else if (action === 'enter') {
        switch (clientModalData.scenario) {
          
          case 'with_reservation':
            // Confirmar ingreso - cambiar estado de reserva a ocupado
            await api.reservations.complete(data.reservationId);
            toast.success('Ingreso confirmado. Espacio marcado como ocupado.');
            break;
            
          case 'no_reservation':
            // Crear reserva automática para vehículo existente
            await api.reservations.create({
              vehicleId: clientModalData.vehicle.id,
              parkingSpaceId: getSpaceIdByNumber(data.spaceNumber),
              startTime: new Date().toISOString(),
              endTime: null // Reserva indefinida
            });
            toast.success('Reserva creada automáticamente. Espacio asignado.');
            break;
            
          case 'new_client':
            // Crear cliente, vehículo y reserva
            await api.auth.register({
              firstName: clientModalData.user.firstName,
              lastName: clientModalData.user.lastName,
              email: clientModalData.user.email,
              phone: clientModalData.user.phone,
              password: 'temp123', // Contraseña temporal
              role: 'client'
            });
            
            const newVehicle = await api.vehicles.create({
              model: clientModalData.vehicle.model,
              plate: clientModalData.vehicle.plate,
              color: clientModalData.vehicle.color,
              type: clientModalData.vehicle.type
            });
            
            await api.reservations.create({
              vehicleId: newVehicle.data.vehicle.id,
              parkingSpaceId: getSpaceIdByNumber(data.spaceNumber),
              startTime: new Date().toISOString(),
              endTime: null // Reserva indefinida
            });
            
            toast.success('Cliente, vehículo y reserva creados automáticamente.');
            break;
        }
      } else {
        // Acción "skip" - solo cerrar modal
        toast('Acción pospuesta', { icon: 'ℹ️' });
      }
      
      setShowClientModal(false);
      setClientModalData(null);
      fetchAvailableSpaces(); // Actualizar espacios disponibles
      
    } catch (error: any) {
      console.error('Error processing client action:', error);
      toast.error(error.response?.data?.message || 'Error al procesar la acción');
    } finally {
      setProcessing(false);
    }
  };

  // Función auxiliar para obtener ID de espacio por número
  const getSpaceIdByNumber = (spaceNumber: string): number => {
    const space = availableSpaces.find(s => s.spaceNumber === spaceNumber);
    return space ? space.id : 1; // Fallback al primer espacio
  };

  const handleProcessRecord = async (action: string, data?: any) => {
    if (!selectedRecord) return;

    setProcessing(true);
    try {
      await api.security.processLPRRecord(selectedRecord.id, {
        action,
        ...data,
        notes: `Procesado por seguridad: ${action}`
      });

      toast.success('Registro procesado exitosamente');
      setSelectedRecord(null);
      setMatchResult(null);
      fetchRecords();
    } catch (error: any) {
      console.error('Error processing record:', error);
      toast.error(error.response?.data?.message || 'Error al procesar registro');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'matched':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'no_match':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
      case 'matched':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'no_match':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
      case 'processed':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'vehicle_created':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  // Función para traducir estados al español
  const translateStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'matched': 'Coincidencia',
      'no_match': 'Sin Coincidencia',
      'processed': 'Procesado',
      'vehicle_created': 'Vehículo Creado',
    };
    return statusMap[status] || status;
  };

  // Función para traducir tipos al español
  const translateType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'entry': 'Entrada',
      'exit': 'Salida',
    };
    return typeMap[type] || 'Entrada';
  };

  // Función para obtener color CSS desde nombre de color en español
  const getColorFromName = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      'blanco': '#FFFFFF',
      'blanca': '#FFFFFF',
      'white': '#FFFFFF',
      'negro': '#000000',
      'negra': '#000000',
      'black': '#000000',
      'gris': '#808080',
      'gray': '#808080',
      'gris': '#808080',
      'rojo': '#FF0000',
      'roja': '#FF0000',
      'red': '#FF0000',
      'azul': '#0000FF',
      'blue': '#0000FF',
      'verde': '#008000',
      'green': '#008000',
      'amarillo': '#FFFF00',
      'yellow': '#FFFF00',
      'plateado': '#C0C0C0',
      'silver': '#C0C0C0',
      'plateada': '#C0C0C0',
      'naranja': '#FFA500',
      'orange': '#FFA500',
      'marrón': '#8B4513',
      'brown': '#8B4513',
      'marrón': '#8B4513',
    };
    
    const normalizedColor = colorName.toLowerCase().trim();
    return colorMap[normalizedColor] || '#808080'; // Gris por defecto
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header mejorado */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Sistema LPR Automático</h1>
              <p className="text-gray-600">Reconocimiento de placas y gestión automática de vehículos</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchRecords}
              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualizar</span>
            </button>
            <button
              onClick={fetchAvailableSpaces}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold"
            >
              <MapPin className="h-4 w-4" />
              <span>Espacios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Entrada Manual por Placa */}
      <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
            <Car className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Entrada Manual</h3>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 md:flex-none">
            <input
              type="text"
              placeholder="Ingresa placa (ej. 1852PHD)"
              className="w-full md:w-80 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 font-mono text-lg"
              value={manualPlate}
              onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && manualPlate.trim()) {
                  await searchVehicle(manualPlate.trim());
                }
              }}
            />
          </div>
          <button
            onClick={async () => {
              if (!manualPlate.trim()) {
                toast.error('Ingresa una placa válida');
                return;
              }
              await searchVehicle(manualPlate.trim());
            }}
            className="px-6 py-3 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Procesar
              </>
            )}
          </button>
          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:via-purple-800 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 transform hover:scale-105 active:scale-95 disabled:transform-none"
            disabled={processing}
            title="Reconocer placa desde cámara"
          >
            <Camera className="h-5 w-5" />
            <span className="hidden md:inline">Cámara</span>
          </button>
        </div>
      </div>

      {/* Componente de cámara removido para flujo manual */}

      {/* Panel de última detección removido */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Records List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-yellow-50 to-orange-50 border-b-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-md">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Registros Pendientes
                </h3>
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 rounded-full text-sm font-bold shadow-sm">
                  {records.length}
                </span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedRecord?.id === record.id
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
                  }`}
                  onClick={() => handleRecordSelect(record)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Car className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
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
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(record.status)}`}>
                        {translateStatus(record.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Record Details and Actions */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Detalles y Acciones</h3>
            </div>
          </div>
          <div className="p-6">
            {selectedRecord && matchResult ? (
              <div className="space-y-6">
                {/* Record Info */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    Información del Registro
                  </h4>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-5 rounded-xl border-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-sm font-bold text-gray-600 mb-1">Placa</p>
                        <p className="font-bold text-gray-900 text-lg font-mono">{selectedRecord.plateNumber}</p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-sm font-bold text-gray-600 mb-1">Color</p>
                        <p className="font-bold text-gray-900 capitalize">{selectedRecord.vehicleColor}</p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-sm font-bold text-gray-600 mb-1">Confianza</p>
                        <p className="font-bold text-gray-900">{(selectedRecord.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg">
                        <p className="text-sm font-bold text-gray-600 mb-1">Fecha</p>
                        <p className="font-bold text-gray-900 text-sm">{new Date(selectedRecord.detectedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matches */}
                {matchResult.hasMatch && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Coincidencias Encontradas
                    </h4>
                    
                    {/* Vehicles */}
                    {matchResult.vehicles.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-bold text-gray-700 mb-3">Vehículos registrados:</p>
                        {matchResult.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl mb-3 border-2 border-green-200 shadow-md">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Car className="h-5 w-5 text-green-600" />
                                  <p className="font-bold text-gray-900 text-lg">{vehicle.model} - <span className="font-mono">{vehicle.plate}</span></p>
                                </div>
                                <p className="text-sm text-gray-700 font-medium">
                                  {vehicle.user.firstName} {vehicle.user.lastName} ({vehicle.user.email})
                                </p>
                              </div>
                              <button
                                onClick={() => handleProcessRecord('match_reservation', { 
                                  vehicleId: vehicle.id,
                                  reservationId: matchResult.reservations.find(r => r.vehicleId === vehicle.id)?.id
                                })}
                                disabled={processing}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {processing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Marcar Entrada
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Active Reservations */}
                    {matchResult.reservations.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-bold text-gray-700 mb-3">Reservas activas:</p>
                        {matchResult.reservations.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-3 border-2 border-blue-200 shadow-md">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="h-5 w-5 text-blue-600" />
                                  <p className="font-bold text-gray-900 text-lg">Espacio {reservation.parkingSpace.spaceNumber}</p>
                                </div>
                                <p className="text-sm text-gray-700 font-medium">
                                  {reservation.user.firstName} {reservation.user.lastName}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(reservation.startTime).toLocaleString()}
                                </p>
                              </div>
                              {selectedSpace && (
                                <SpaceDetailModal
                                  space={selectedSpace}
                                  isOpen={isSpaceModalOpen}
                                  autoOpenPayment={true}
                                  initialMethod={'cash'}
                                  onClose={() => {
                                    setIsSpaceModalOpen(false);
                                    setSelectedSpace(null);
                                    fetchAvailableSpaces();
                                    fetchRecords();
                                    fetchAllRecords();
                                  }}
                                />
                              )}
                              <button
                                onClick={() => handleProcessRecord('match_reservation', { 
                                  reservationId: reservation.id,
                                  vehicleId: reservation.vehicleId
                                })}
                                disabled={processing}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {processing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Confirmar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No Match Actions */}
                {!matchResult.hasMatch && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      No se encontraron coincidencias
                    </h4>
                    
                    {/* Create Vehicle */}
                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-700 mb-3">Registrar vehículo manualmente:</p>
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Buscar usuario por nombre, email o teléfono..."
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              handleSearchUsers(e.target.value);
                            }}
                          />
                          {users.length > 0 && (
                            <div className="mt-3 border-2 border-gray-300 rounded-xl max-h-40 overflow-y-auto shadow-lg bg-white">
                              {users.map((user) => (
                                <div
                                  key={user.id}
                                  className="p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all border-b border-gray-100 last:border-b-0"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
                                    setUsers([]);
                                  }}
                                >
                                  <p className="font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                                  <p className="text-sm text-gray-600">{user.email}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {selectedUserId && (
                          <button
                            onClick={() => handleProcessRecord('create_vehicle', { userId: selectedUserId })}
                            disabled={processing}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
                          >
                            {processing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                Crear Vehículo para Usuario
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* No Match */}
                    <button
                      onClick={() => handleProcessRecord('no_match')}
                      disabled={processing}
                      className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
                    >
                      <XCircle className="h-4 w-4" />
                      Marcar como Sin Coincidencia
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600">Selecciona un registro LPR</p>
                <p className="text-sm text-gray-500 mt-1">para ver detalles y procesar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de LPR */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg shadow-md">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Histórico de LPR (todos los estados)</h3>
            </div>
            <button
              onClick={fetchAllRecords}
              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-semibold text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>
        <div className="p-6">
          {historyRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 font-medium">Sin registros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-700 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="py-4 pr-4 font-bold">Fecha</th>
                    <th className="py-4 pr-4 font-bold">Placa</th>
                    <th className="py-4 pr-4 font-bold">Color</th>
                    <th className="py-4 pr-4 font-bold">Tipo</th>
                    <th className="py-4 pr-4 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all">
                      <td className="py-4 pr-4 font-medium">{new Date(r.detectedAt).toLocaleString('es-ES')}</td>
                      <td className="py-4 pr-4 font-mono font-bold text-lg">{r.plateNumber}</td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-md"
                            style={{ backgroundColor: getColorFromName(r.vehicleColor) }}
                            title={r.vehicleColor}
                          />
                          <span className="capitalize font-medium">{r.vehicleColor}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full text-xs font-bold border border-gray-300 shadow-sm">
                          {translateType((r as any).type || 'entry')}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusColor(r.status)}`}>
                          {translateStatus(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de espacio (salida) */}
      {selectedSpace && (
        <SpaceDetailModal
          space={selectedSpace}
          isOpen={isSpaceModalOpen}
          autoOpenPayment={true}
          initialMethod={'cash'}
          paymentOnly={true}
          onClose={() => {
            setIsSpaceModalOpen(false);
            setSelectedSpace(null);
            // refrescar listados tras cerrar
            fetchAvailableSpaces();
            fetchRecords();
            fetchAllRecords();
          }}
        />
      )}

      {/* Modal de información del cliente */}
      <ClientInfoModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setClientModalData(null);
        }}
        clientData={clientModalData}
        onAction={handleClientAction}
        loading={processing}
      />

      {/* Modal de cámara para reconocimiento de placas */}
      <LPRCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPlateDetected={async (plate: string) => {
          // Cuando se detecta una placa, usar el mismo flujo que el manual
          if (plate && plate.trim()) {
            await searchVehicle(plate.trim());
          }
        }}
        onError={(error: string) => {
          toast.error(error);
        }}
      />

      {/* Modales de OCR removidos para flujo manual */}
    </div>
  );
};

export default LPRManagement;
