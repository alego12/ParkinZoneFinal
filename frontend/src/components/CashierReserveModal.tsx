import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ParkingSpace, Vehicle, User } from '../types';
import { Search, UserPlus, MapPin, Calendar, Clock, DollarSign, AlertCircle, X, Loader2, Car, Bike, CheckCircle, ArrowLeft } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Caja: Reservar Espacio</h2>
                <p className="text-sm text-gray-600 mt-1">Crear una nueva reserva para un cliente</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110 active:scale-95"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 mb-6 border-2 border-blue-300 shadow-lg">
            <div className="flex items-center mb-3">
              <div className="p-3 bg-blue-600 rounded-xl mr-3 shadow-md">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-xl">Espacio {parkingSpace.spaceNumber}</span>
                <div className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {parkingSpace.zone}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm bg-white/70 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-700">Auto:</span>
                <span className="text-green-600 font-bold text-base">${parkingSpace.carRate}/h</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-gray-700">Moto:</span>
                <span className="text-green-600 font-bold text-base">${parkingSpace.motorcycleRate}/h</span>
              </div>
            </div>
          </div>

          {step === 'choose' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setStep('existing')} 
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 text-left transition-all shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mr-3 shadow-lg">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-gray-900 text-lg">Usuario existente</span>
                </div>
                <p className="text-sm text-gray-600 ml-14 font-medium">Buscar cliente y seleccionar vehículo</p>
              </button>
              <button 
                onClick={() => setStep('new')} 
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 text-left transition-all shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mr-3 shadow-lg">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-gray-900 text-lg">Usuario nuevo</span>
                </div>
                <p className="text-sm text-gray-600 ml-14 font-medium">Crear cliente y vehículo para reservar</p>
              </button>
            </div>
          )}

          {step === 'existing' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Buscar cliente
                </label>
                <div className="relative">
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
                    className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                {clients.length > 0 && (
                  <div className="border-2 border-gray-300 rounded-xl mt-3 max-h-48 overflow-auto shadow-lg bg-white">
                    {clients.map((c) => (
                      <div
                        key={c.id}
                        className={`px-4 py-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all border-b border-gray-100 last:border-b-0 ${
                          selectedClient?.id === c.id ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => {
                          setSelectedClient(c);
                          setClients([]);
                          setQuery(`${c.firstName} ${c.lastName} (${c.email})`);
                          loadClientVehicles(c.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900">{c.firstName} {c.lastName}</p>
                            <p className="text-sm text-gray-600 mt-0.5">{c.email}</p>
                          </div>
                          {selectedClient?.id === c.id && (
                            <div className="p-1.5 bg-blue-600 rounded-full">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedClient && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Car className="h-5 w-5 text-indigo-600" />
                      Seleccionar vehículo
                    </label>
                    {clientVehicles.length === 0 ? (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 text-sm text-yellow-800 flex items-start shadow-sm">
                        <div className="p-2 bg-yellow-600 rounded-lg mr-3">
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold">Este cliente no tiene vehículos compatibles con este espacio.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clientVehicles.map((v) => (
                          <label 
                            key={v.id} 
                            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              selectedVehicleId === v.id 
                                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-[1.02]' 
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
                            }`}
                          >
                            <input 
                              type="radio" 
                              className="sr-only" 
                              checked={selectedVehicleId === v.id} 
                              onChange={() => setSelectedVehicleId(v.id)} 
                            />
                            <div className="flex items-center w-full">
                              <div className={`p-3 rounded-xl mr-4 shadow-md ${
                                v.type === 'motorcycle' 
                                  ? 'bg-gradient-to-br from-orange-100 to-orange-200' 
                                  : 'bg-gradient-to-br from-blue-100 to-blue-200'
                              }`}>
                                {v.type === 'motorcycle' ? (
                                  <Bike className="h-6 w-6 text-orange-600" />
                                ) : (
                                  <Car className="h-6 w-6 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-gray-900 text-lg">{v.model}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-2 mt-1 font-medium">
                                  <span className="font-mono">{v.plate}</span>
                                  <span>•</span>
                                  <span className="capitalize">{v.color}</span>
                                </div>
                              </div>
                              {selectedVehicleId === v.id && (
                                <div className="p-1.5 bg-blue-600 rounded-full">
                                  <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        Inicio
                      </label>
                      <input 
                        type="datetime-local" 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)} 
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                      />
                    </div>
                    {!isIndefinite && (
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-600" />
                          Fin
                        </label>
                        <input 
                          type="datetime-local" 
                          value={endTime} 
                          onChange={(e) => setEndTime(e.target.value)} 
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                        />
                      </div>
                    )}
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <input 
                        id="indef" 
                        type="checkbox" 
                        checked={isIndefinite} 
                        onChange={(e) => { setIsIndefinite(e.target.checked); if (e.target.checked) setEndTime(''); }} 
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer" 
                      />
                      <label htmlFor="indef" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Tiempo indefinido</label>
                    </div>
                  </div>

                  {selectedVehicleId && startTime && (
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-5 border-2 border-green-300 shadow-lg flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">{isIndefinite ? 'Estimado mínimo (1h)' : 'Total estimado'}</span>
                      <span className="text-2xl font-bold text-green-700 flex items-center gap-1">
                        <DollarSign className="h-7 w-7" />
                        {Number(calculateAmount() || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={() => setStep('choose')} 
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Atrás
                    </button>
                    <button 
                      onClick={handleExistingSubmit} 
                      disabled={loading || !selectedClient || !selectedVehicleId} 
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Crear Reserva
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'new' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Nombre</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    value={newUser.firstName} 
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Apellido</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    value={newUser.lastName} 
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    value={newUser.email} 
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Teléfono</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    value={newUser.phone} 
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Modelo</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    value={newVehicle.model} 
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Placa</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono" 
                    value={newVehicle.plate} 
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Color</label>
                  <input 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    value={newVehicle.color} 
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Inicio
                  </label>
                  <input 
                    type="datetime-local" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                  />
                </div>
                {!isIndefinite && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      Fin
                    </label>
                    <input 
                      type="datetime-local" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)} 
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                    />
                  </div>
                )}
                <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <input 
                    id="indef2" 
                    type="checkbox" 
                    checked={isIndefinite} 
                    onChange={(e) => { setIsIndefinite(e.target.checked); if (e.target.checked) setEndTime(''); }} 
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer" 
                  />
                  <label htmlFor="indef2" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Tiempo indefinido</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setStep('choose')} 
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </button>
                <button 
                  onClick={handleCreateNewAndReserve} 
                  disabled={loading} 
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Crear y Reservar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashierReserveModal;
