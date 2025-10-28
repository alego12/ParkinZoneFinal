import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ParkingSpace, Vehicle, User } from '../types';
import { Search, UserPlus, MapPin, Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CashierReserveModalProps {
  parkingSpace: ParkingSpace;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'choose' | 'existing' | 'new';

const CashierReserveModal: React.FC<CashierReserveModalProps> = ({ parkingSpace, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('choose');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Existing user state
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(false);

  // New user state
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [newVehicle, setNewVehicle] = useState({ model: '', plate: '', color: '', type: 'car' as 'car'|'motorcycle' });

  useEffect(() => {
    const now = new Date();
    setStartTime(now.toISOString().slice(0, 16));
  }, []);

  const searchClients = async (q: string) => {
    try {
      const res = await api.security.searchClients(q);
      setClients(res.data.users || []);
    } catch (e) {
      setClients([]);
    }
  };

  const loadClientVehicles = async (userId: number) => {
    try {
      const res = await api.security.getUserVehicles(userId);
      // filter compatibility
      const compatible = (res.data.vehicles || []).filter((v: Vehicle) =>
        parkingSpace.vehicleType === 'both' || parkingSpace.vehicleType === v.type
      );
      setClientVehicles(compatible);
    } catch (e) {
      setClientVehicles([]);
    }
  };

  const calculateAmount = () => {
    const v = clientVehicles.find(v => v.id === selectedVehicleId);
    if (!v || !startTime) return 0;
    const hourlyRate = v.type === 'motorcycle' ? (parkingSpace.motorcycleRate || 0) : (parkingSpace.carRate || 0);
    if (isIndefinite) return hourlyRate;
    if (!endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return durationHours * hourlyRate;
  };

  const createReservation = async (targetUserId: number, vehicleId: number) => {
    try {
      setLoading(true);
      const start = new Date(startTime);
      await api.reservations.create({
        targetUserId,
        vehicleId,
        parkingSpaceId: parkingSpace.id,
        startTime: start.toISOString(),
        endTime: isIndefinite ? null : (endTime ? new Date(endTime).toISOString() : null),
      });
      toast.success('Reserva creada exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleExistingSubmit = async () => {
    if (!selectedClient) return toast.error('Selecciona un usuario');
    if (!selectedVehicleId) return toast.error('Selecciona un vehículo');
    await createReservation(selectedClient.id, selectedVehicleId);
  };

  const handleCreateNewAndReserve = async () => {
    try {
      setLoading(true);
      if (!newUser.firstName || !newUser.lastName || !newUser.email || !newVehicle.model || !newVehicle.plate || !newVehicle.color) {
        toast.error('Completa los datos del usuario y vehículo');
        return;
      }
      // Atomic create user + vehicle + reservation
      const start = new Date(startTime);
      const payload = {
        user: {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          phone: newUser.phone,
          password: 'temp123',
        },
        vehicle: {
          plate: newVehicle.plate,
          model: newVehicle.model,
          color: newVehicle.color,
          type: newVehicle.type,
        },
        reservation: {
          parkingSpaceId: parkingSpace.id,
          startTime: start.toISOString(),
          endTime: isIndefinite ? null : (endTime ? new Date(endTime).toISOString() : null),
        }
      };
      await api.security.createClientWithVehicleReservation(payload);
      toast.success('Cliente, vehículo y reserva creados exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear usuario/vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Caja: Reservar Espacio</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-gray-900">Espacio {parkingSpace.spaceNumber}</span>
            </div>
            <div className="text-sm text-gray-600">{parkingSpace.zone}</div>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>Auto: ${parkingSpace.carRate}/h</span>
              <span className="mx-2">•</span>
              <span>Moto: ${parkingSpace.motorcycleRate}/h</span>
            </div>
          </div>

          {step === 'choose' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setStep('existing')} className="p-6 border rounded-lg hover:bg-gray-50 text-left">
                <div className="flex items-center mb-2">
                  <Search className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Usuario existente</span>
                </div>
                <p className="text-sm text-gray-600">Buscar cliente y seleccionar vehículo</p>
              </button>
              <button onClick={() => setStep('new')} className="p-6 border rounded-lg hover:bg-gray-50 text-left">
                <div className="flex items-center mb-2">
                  <UserPlus className="h-5 w-5 mr-2 text-green-600" />
                  <span className="font-medium">Usuario nuevo</span>
                </div>
                <p className="text-sm text-gray-600">Crear cliente y vehículo para reservar</p>
              </button>
            </div>
          )}

          {step === 'existing' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar cliente</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuery(v);
                    if (v.length >= 2) searchClients(v);
                    else setClients([]);
                  }}
                  placeholder="Nombre, email o teléfono"
                  className="input-field"
                />
                {clients.length > 0 && (
                  <div className="border rounded mt-2 max-h-40 overflow-auto">
                    {clients.map((c) => (
                      <div
                        key={c.id}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${selectedClient?.id === c.id ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          setSelectedClient(c);
                          setClients([]);
                          setQuery(`${c.firstName} ${c.lastName} (${c.email})`);
                          loadClientVehicles(c.id);
                        }}
                      >
                        {c.firstName} {c.lastName} - {c.email}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedClient && (
                <div className="space-y-4">
                  <div>
                    <label className="block text sm font-medium text-gray-700 mb-2">Seleccionar vehículo</label>
                    {clientVehicles.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700 flex items-start">
                        <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                        Este cliente no tiene vehículos compatibles con este espacio.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clientVehicles.map((v) => (
                          <label key={v.id} className={`flex items-center p-3 border rounded-lg cursor-pointer ${selectedVehicleId === v.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input type="radio" className="sr-only" checked={selectedVehicleId === v.id} onChange={() => setSelectedVehicleId(v.id)} />
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{v.type === 'motorcycle' ? '🏍️' : '🚗'}</span>
                              <div>
                                <div className="font-medium">{v.model}</div>
                                <div className="text-sm text-gray-600">{v.plate} • {v.color}</div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar className="h-4 w-4 inline mr-1" />Inicio</label>
                      <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" />
                    </div>
                    {!isIndefinite && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2"><Clock className="h-4 w-4 inline mr-1" />Fin</label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field" />
                      </div>
                    )}
                    <div className="flex items-center">
                      <input id="indef" type="checkbox" checked={isIndefinite} onChange={(e) => { setIsIndefinite(e.target.checked); if (e.target.checked) setEndTime(''); }} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                      <label htmlFor="indef" className="ml-2 text-sm text-gray-700">Tiempo indefinido</label>
                    </div>
                  </div>

                  {selectedVehicleId && startTime && (
                    <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                      <span className="text-sm">{isIndefinite ? 'Estimado mínimo (1h)' : 'Total estimado'}</span>
                      <span className="text-lg font-bold text-blue-600">${Number(calculateAmount() || 0).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setStep('choose')} className="btn-secondary">Atrás</button>
                    <button onClick={handleExistingSubmit} disabled={loading || !selectedClient || !selectedVehicleId} className="btn-primary disabled:opacity-50">{loading ? 'Creando...' : 'Crear Reserva'}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'new' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                  <input className="input-field" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                  <input className="input-field" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" className="input-field" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                  <input className="input-field" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                  <input className="input-field" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Placa</label>
                  <input className="input-field" value={newVehicle.plate} onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input className="input-field" value={newVehicle.color} onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar className="h-4 w-4 inline mr-1" />Inicio</label>
                  <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" />
                </div>
                {!isIndefinite && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><Clock className="h-4 w-4 inline mr-1" />Fin</label>
                    <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field" />
                  </div>
                )}
                <div className="flex items-center">
                  <input id="indef2" type="checkbox" checked={isIndefinite} onChange={(e) => { setIsIndefinite(e.target.checked); if (e.target.checked) setEndTime(''); }} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  <label htmlFor="indef2" className="ml-2 text-sm text-gray-700">Tiempo indefinido</label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setStep('choose')} className="btn-secondary">Atrás</button>
                <button onClick={handleCreateNewAndReserve} disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Creando...' : 'Crear y Reservar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashierReserveModal;
