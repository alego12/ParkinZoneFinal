import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LPRRecord, User, ParkingSpace } from '../../types';
import { Search, UserPlus, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
// Removed CameraComponent to focus on manual flow
import ClientInfoModal from '../../components/ClientInfoModal';

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
      // 1) Buscar reserva existente (pendiente/activa) para este vehículo
      const reservationsResp = await api.security.getReservations();
      const allReservations = reservationsResp.data?.reservations || [];
      // Consider only non-finalized reservations: correct status AND no endTime
      const candidateReservations = allReservations
        .filter((r: any) => r.vehicleId === vehicle.id)
        .filter((r: any) => ['pending', 'active'].includes(r.status))
        .filter((r: any) => !r.endTime); // endTime must be null/undefined

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
          status: 'active',
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
              status: 'active',
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
        return 'bg-yellow-100 text-yellow-800';
      case 'matched':
        return 'bg-green-100 text-green-800';
      case 'no_match':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema LPR Automático</h1>
            <p className="text-gray-600">Reconocimiento de placas y gestión automática de vehículos</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchRecords}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Actualizar</span>
            </button>
            <button
              onClick={fetchAvailableSpaces}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Espacios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Entrada Manual por Placa */}
      <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Entrada Manual</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            placeholder="Ingresa placa (ej. 1852PHD)"
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={manualPlate}
            onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && manualPlate.trim()) {
                await searchVehicle(manualPlate.trim());
              }
            }}
          />
          <button
            onClick={async () => {
              if (!manualPlate.trim()) {
                toast.error('Ingresa una placa válida');
                return;
              }
              await searchVehicle(manualPlate.trim());
            }}
            className="btn-primary"
            disabled={processing}
          >
            Procesar
          </button>
        </div>
      </div>

      {/* Componente de cámara removido para flujo manual */}

      {/* Panel de última detección removido */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Records List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Registros Pendientes
              </h3>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                {records.length}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleRecordSelect(record)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Botón de ver imagen removido para flujo manual */}
                      <div>
                        <p className="font-medium text-gray-900">{record.plateNumber}</p>
                        <p className="text-sm text-gray-600">
                          {record.vehicleColor} • {(record.confidence * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.detectedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.status)}
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status === 'pending' ? 'Pendiente' : record.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Record Details and Actions */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg" />
              <h3 className="text-lg font-semibold text-gray-900">Detalles y Acciones</h3>
            </div>
          </div>
          <div className="p-6">
            {selectedRecord && matchResult ? (
              <div className="space-y-6">
                {/* Record Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Información del Registro</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Placa</p>
                        <p className="font-medium">{selectedRecord.plateNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Color</p>
                        <p className="font-medium">{selectedRecord.vehicleColor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Confianza</p>
                        <p className="font-medium">{(selectedRecord.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha</p>
                        <p className="font-medium">{new Date(selectedRecord.detectedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matches */}
                {matchResult.hasMatch && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Coincidencias Encontradas</h4>
                    
                    {/* Vehicles */}
                    {matchResult.vehicles.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Vehículos registrados:</p>
                        {matchResult.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="bg-green-50 p-3 rounded-lg mb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{vehicle.model} - {vehicle.plate}</p>
                                <p className="text-sm text-gray-600">
                                  {vehicle.user.firstName} {vehicle.user.lastName} ({vehicle.user.email})
                                </p>
                              </div>
                              <button
                                onClick={() => handleProcessRecord('match_reservation', { 
                                  vehicleId: vehicle.id,
                                  reservationId: matchResult.reservations.find(r => r.vehicleId === vehicle.id)?.id
                                })}
                                disabled={processing}
                                className="btn-primary btn-sm"
                              >
                                Marcar como Entrada
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Active Reservations */}
                    {matchResult.reservations.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Reservas activas:</p>
                        {matchResult.reservations.map((reservation) => (
                          <div key={reservation.id} className="bg-blue-50 p-3 rounded-lg mb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Espacio {reservation.parkingSpace.spaceNumber}</p>
                                <p className="text-sm text-gray-600">
                                  {reservation.user.firstName} {reservation.user.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {new Date(reservation.startTime).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleProcessRecord('match_reservation', { 
                                  reservationId: reservation.id,
                                  vehicleId: reservation.vehicleId
                                })}
                                disabled={processing}
                                className="btn-primary btn-sm"
                              >
                                Confirmar Entrada
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
                    <h4 className="font-medium text-gray-900 mb-2">No se encontraron coincidencias</h4>
                    
                    {/* Create Vehicle */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Registrar vehículo manualmente:</p>
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Buscar usuario por nombre, email o teléfono..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              handleSearchUsers(e.target.value);
                            }}
                          />
                          {users.length > 0 && (
                            <div className="mt-2 border border-gray-300 rounded-md max-h-32 overflow-y-auto">
                              {users.map((user) => (
                                <div
                                  key={user.id}
                                  className="p-2 hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
                                    setUsers([]);
                                  }}
                                >
                                  <p className="font-medium">{user.firstName} {user.lastName}</p>
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
                            className="btn-primary w-full"
                          >
                            <UserPlus className="h-4 w-4 inline mr-2" />
                            Crear Vehículo para Usuario
                          </button>
                        )}
                      </div>
                    </div>

                    {/* No Match */}
                    <button
                      onClick={() => handleProcessRecord('no_match')}
                      disabled={processing}
                      className="btn-secondary w-full"
                    >
                      <XCircle className="h-4 w-4 inline mr-2" />
                      Marcar como Sin Coincidencia
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Selecciona un registro LPR para ver detalles y procesar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de LPR */}
      <div className="mt-8 bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Histórico de LPR (todos los estados)</h3>
            <button
              onClick={fetchAllRecords}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
        <div className="p-6">
          {historyRecords.length === 0 ? (
            <p className="text-gray-500">Sin registros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Placa</th>
                    <th className="py-2 pr-4">Color</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Imagen</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{new Date(r.detectedAt).toLocaleString()}</td>
                      <td className="py-2 pr-4 font-mono">{r.plateNumber}</td>
                      <td className="py-2 pr-4">{r.vehicleColor}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 truncate max-w-[200px]" title={r.imagePath}>{r.imagePath}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

      {/* Modales de OCR removidos para flujo manual */}
    </div>
  );
};

export default LPRManagement;
