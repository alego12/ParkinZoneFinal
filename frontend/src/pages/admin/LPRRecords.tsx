import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LPRRecord, User, Vehicle, Reservation } from '../../types';
import { 
  Eye, 
  AlertCircle, 
  Search, 
  UserPlus, 
  Car,
  MapPin,
  Calendar,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MatchData {
  record: LPRRecord;
  vehicles: Vehicle[];
  reservations: Reservation[];
  hasMatch: boolean;
}

const LPRRecords: React.FC = () => {
  const [records, setRecords] = useState<LPRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<LPRRecord | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, [currentPage, statusFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await api.lpr.getRecords(params);
      
      setRecords(response.data.records);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching LPR records:', error);
      toast.error('Error al cargar los registros LPR');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchRecord = async (record: LPRRecord) => {
    try {
      const response = await api.security.getLPRMatch(record.id);
      setSelectedRecord(record);
      setMatchData(response.data);
      setShowMatchModal(true);
    } catch (error) {
      console.error('Error fetching match data:', error);
      toast.error('Error al buscar coincidencias');
    }
  };

  const handleProcessRecord = async (action: string, reservationId?: number, userId?: number) => {
    if (!selectedRecord) return;

    try {
      const data = {
        action,
        reservationId,
        userId,
        notes
      };

      await api.security.processLPRRecord(selectedRecord.id, data);
      toast.success('Registro procesado exitosamente');
      setShowMatchModal(false);
      setShowUserSearch(false);
      setSelectedRecord(null);
      setMatchData(null);
      setSelectedUser(null);
      setNotes('');
      fetchRecords();
    } catch (error) {
      console.error('Error processing record:', error);
      toast.error('Error al procesar el registro');
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.security.searchUsers(query);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Error al buscar usuarios');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-green-100 text-green-800';
      case 'no_match': return 'bg-red-100 text-red-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'vehicle_created': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'matched': return 'Coincidencia';
      case 'no_match': return 'Sin coincidencia';
      case 'processed': return 'Procesado';
      case 'vehicle_created': return 'Vehículo creado';
      default: return status;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

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
    };
    
    const normalizedColor = colorName.toLowerCase().trim();
    return colorMap[normalizedColor] || '#808080';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registros LPR</h1>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="matched">Coincidencia</option>
            <option value="no_match">Sin coincidencia</option>
            <option value="processed">Procesado</option>
            <option value="vehicle_created">Vehículo creado</option>
          </select>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imagen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confianza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Eye className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No hay registros LPR</p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => window.open(api.lpr.getImage(record.imagePath.split('/').pop() || ''), '_blank')}
                      className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-5 w-5 text-gray-600" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.plateNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2 border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: getColorFromName(record.vehicleColor) }}
                      ></div>
                      <span className="text-sm text-gray-900 capitalize">
                        {record.vehicleColor}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getConfidenceColor(record.confidence)}`}>
                      {(record.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span>{new Date(record.detectedAt).toLocaleDateString('es-CO', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(record.detectedAt).toLocaleTimeString('es-CO', { 
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {record.status === 'pending' && (
                      <button
                        onClick={() => handleMatchRecord(record)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Search className="h-4 w-4" />
                        Buscar
                      </button>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Match Modal */}
      {showMatchModal && matchData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Procesar Registro LPR - {matchData.record.plateNumber}
              </h3>
              <button
                onClick={() => setShowMatchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Agregar notas sobre el procesamiento..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Información del vehículo detectado
                  </label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p><strong>Placa:</strong> {matchData.record.plateNumber}</p>
                    <p><strong>Color:</strong> {matchData.record.vehicleColor}</p>
                    <p><strong>Confianza:</strong> {(matchData.record.confidence * 100).toFixed(1)}%</p>
                    <p><strong>Fecha:</strong> {new Date(matchData.record.detectedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reservas encontradas */}
            {matchData.reservations.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Reservas activas encontradas ({matchData.reservations.length})
                </h4>
                <div className="space-y-3">
                  {matchData.reservations.map((reservation) => (
                    <div key={reservation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {reservation.user?.firstName} {reservation.user?.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{reservation.user?.email}</p>
                              <p className="text-sm text-gray-600">{reservation.user?.phone}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-900">
                                <Car className="h-4 w-4 inline mr-1" />
                                {reservation.vehicle?.model} - {reservation.vehicle?.plate}
                              </p>
                              <p className="text-sm text-gray-600">
                                <MapPin className="h-4 w-4 inline mr-1" />
                                Espacio {reservation.parkingSpace?.spaceNumber}
                              </p>
                              <p className="text-sm text-gray-600">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {new Date(reservation.startTime).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleProcessRecord('match_reservation', reservation.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Marcar como ocupado
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehículos encontrados sin reserva */}
            {matchData.vehicles.length > 0 && matchData.reservations.length === 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Vehículos registrados encontrados ({matchData.vehicles.length})
                </h4>
                <div className="space-y-3">
                  {matchData.vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {(vehicle as any).user?.firstName} {(vehicle as any).user?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{(vehicle as any).user?.email}</p>
                          <p className="text-sm text-gray-600">{(vehicle as any).user?.phone}</p>
                          <p className="text-sm text-gray-900 mt-2">
                            <Car className="h-4 w-4 inline mr-1" />
                            {vehicle.model} - {vehicle.plate}
                          </p>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Sin reserva activa</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sin coincidencias */}
            {!matchData.hasMatch && (
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">
                        No se encontraron coincidencias
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Este vehículo no está registrado en el sistema. Puedes crear un nuevo registro de vehículo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-between">
              <div className="flex gap-2">
                {!matchData.hasMatch && (
                  <button
                    onClick={() => {
                      setShowMatchModal(false);
                      setShowUserSearch(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Crear vehículo
                  </button>
                )}
                <button
                  onClick={() => handleProcessRecord('no_match')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Marcar como sin coincidencia
                </button>
              </div>
              <button
                onClick={() => setShowMatchModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Buscar Usuario
              </h3>
              <button
                onClick={() => {
                  setShowUserSearch(false);
                  setUserSearchQuery('');
                  setSearchResults([]);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por email, nombre o teléfono
              </label>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa email, nombre o teléfono..."
              />
            </div>

            {searchResults.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                        selectedUser?.id === user.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUserSearch(false);
                  setUserSearchQuery('');
                  setSearchResults([]);
                  setSelectedUser(null);
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedUser) {
                    handleProcessRecord('create_vehicle', undefined, selectedUser.id);
                  }
                }}
                disabled={!selectedUser}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear vehículo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LPRRecords;
