import { useState } from 'react';
import { User, Car, MapPin, Clock, CheckCircle, AlertTriangle, X, Loader2, UserPlus, Mail, Phone, Shield } from 'lucide-react';
import { translateVehicleTypeShort } from '../utils/translations';

const vehicleColors = [
  { name: 'Blanco', value: '#FFFFFF' },
  { name: 'Negro', value: '#000000' },
  { name: 'Gris', value: '#808080' },
  { name: 'Plateado', value: '#C0C0C0' },
  { name: 'Rojo', value: '#FF0000' },
  { name: 'Azul', value: '#0000FF' },
  { name: 'Verde', value: '#008000' },
  { name: 'Amarillo', value: '#FFFF00' },
  { name: 'Naranja', value: '#FFA500' },
  { name: 'Marrón', value: '#8B4513' },
];

interface ClientInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData: {
    user?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    vehicle?: {
      id: number; 
      model: string;
      plate: string;
      color: string;
      type: string;
    };
    reservation?: {
      id: number;
      parkingSpace: {
        spaceNumber: string;
        zone: string;
      };
      startTime: string;
      status: string;
    };
    scenario: 'with_reservation' | 'no_reservation' | 'new_client' | 'new_user';
    plate?: string;
    isNewUser?: boolean;
  };
  onAction: (action: 'enter' | 'skip' | 'new_user', data?: any) => void;
  loading?: boolean;
}

const ClientInfoModal: React.FC<ClientInfoModalProps> = ({
  isOpen,
  onClose,
  clientData,
  onAction,
  loading = false
}) => {
  // Estado para el formulario de usuario nuevo
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    make: '',
    model: '',
    color: ''
  });
  const [selectedSpace, setSelectedSpace] = useState<string>('');

  if (!isOpen) return null;

  const getScenarioTitle = () => {
    switch (clientData.scenario) {
      case 'with_reservation':
        return 'Cliente con Reserva Activa';
      case 'no_reservation':
        return 'Cliente sin Reserva';
      case 'new_client':
        return 'Nuevo Cliente Detectado';
      default:
        return 'Información del Cliente';
    }
  };

  const getScenarioIcon = () => {
    switch (clientData.scenario) {
      case 'with_reservation':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'no_reservation':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'new_client':
        return <User className="h-6 w-6 text-blue-600" />;
      default:
        return <User className="h-6 w-6 text-gray-600" />;
    }
  };

  const getScenarioDescription = () => {
    switch (clientData.scenario) {
      case 'with_reservation':
        return 'El vehículo tiene una reserva activa. Puedes confirmar la entrada o posponerla.';
      case 'no_reservation':
        return 'El vehículo no tiene reserva. Se asignará automáticamente una plaza disponible.';
      case 'new_client':
        return 'Cliente nuevo detectado. Se creará automáticamente el registro y se asignará una plaza.';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-200">
            <div className="flex items-start gap-4 flex-1">
              <div className={`p-3 rounded-xl shadow-lg ${
                clientData.scenario === 'new_user' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  : clientData.scenario === 'with_reservation'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-yellow-500 to-orange-600'
              }`}>
                {getScenarioIcon()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{getScenarioTitle()}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{getScenarioDescription()}</p>
                {clientData.plate && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-300">
                    <Car className="h-4 w-4 text-gray-600" />
                    <span className="font-mono font-bold text-gray-900">{clientData.plate}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Client Information */}
          <div className="space-y-6">
            {/* User Info */}
            {clientData.user && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Nombre</p>
                    <p className="font-bold text-gray-900">
                      {clientData.user ? `${clientData.user.firstName} ${clientData.user.lastName}` : 'Nuevo usuario'}
                    </p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </p>
                    <p className="font-bold text-gray-900">{clientData.user?.email || 'Por completar'}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Teléfono
                    </p>
                    <p className="font-bold text-gray-900">{clientData.user?.phone || 'Por completar'}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      ID Cliente
                    </p>
                    <p className="font-bold text-gray-900">#{clientData.user?.id || 'Nuevo'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario para usuario nuevo */}
            {clientData?.scenario === 'new_user' && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  Completar Datos del Usuario y Vehículo
                </h3>
                <div className="space-y-4">
                  <div className="bg-white/80 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Datos Personales
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nombre *</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                          placeholder="Ingresa el nombre"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Apellido *</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                          placeholder="Ingresa el apellido"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                          placeholder="usuario@ejemplo.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Teléfono *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                          placeholder="12345678"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4 text-blue-600" />
                      Datos del Vehículo
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Marca *</label>
                        <input
                          type="text"
                          value={formData.make}
                          onChange={(e) => setFormData({...formData, make: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                          placeholder="Ej: Toyota"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Modelo *</label>
                        <input
                          type="text"
                          value={formData.model}
                          onChange={(e) => setFormData({...formData, model: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                          placeholder="Ej: Corolla"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Color del Vehículo</label>
                      <div className="grid grid-cols-5 gap-2">
                        {vehicleColors.map((color) => (
                          <label
                            key={color.name}
                            className={`relative flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer transition-all ${
                              formData.color === color.name
                                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                            }`}
                          >
                            <input
                              type="radio"
                              name="color"
                              value={color.name}
                              checked={formData.color === color.name}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                              className="sr-only"
                            />
                            <div
                              className="w-8 h-8 rounded-full border-2 border-gray-300 mb-1.5 shadow-sm"
                              style={{ backgroundColor: color.value }}
                            ></div>
                            <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight">
                              {color.name}
                            </span>
                            {formData.color === color.name && (
                              <div className="absolute top-0.5 right-0.5">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                          </label>
                        ))}
                      </div>
                      {!formData.color && (
                        <p className="text-xs text-gray-500 mt-2 font-medium">Selecciona un color</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Info */}
            {clientData.vehicle && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg">
                    <Car className="h-4 w-4 text-white" />
                  </div>
                  Información del Vehículo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Modelo</p>
                    <p className="font-bold text-gray-900">{clientData.vehicle?.model || 'Por completar'}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Placa</p>
                    <p className="font-bold text-gray-900 font-mono">{clientData.vehicle?.plate || clientData.plate || 'Por completar'}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Color</p>
                    <p className="font-bold text-gray-900 capitalize">{clientData.vehicle?.color || 'Por completar'}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Tipo de Vehículo</p>
                    <p className="font-bold text-gray-900">
                      {clientData.vehicle?.type ? translateVehicleTypeShort(clientData.vehicle.type) : 'Por completar'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reservation Info (if exists) */}
            {clientData.reservation && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  Reserva Activa
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Espacio</p>
                    <p className="font-bold text-gray-900">
                      {clientData.reservation.parkingSpace.spaceNumber} - {clientData.reservation.parkingSpace.zone}
                    </p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Hora de Inicio
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {new Date(clientData.reservation.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Estado</p>
                    <p className="font-bold text-gray-900 capitalize">{clientData.reservation.status}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-600 mb-1">Tipo de Reserva</p>
                    <p className="font-bold text-gray-900">Tiempo Indefinido</p>
                  </div>
                </div>
              </div>
            )}

            {/* Space Selection (for no_reservation scenario) */}
            {clientData.scenario === 'no_reservation' && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 border-2 border-yellow-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  Asignación de Plaza
                </h3>
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">Seleccionar plaza disponible:</p>
                  <select
                    value={selectedSpace}
                    onChange={(e) => setSelectedSpace(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-medium"
                  >
                    <option value="">Seleccionar plaza...</option>
                    <option value="A1">A1 - Zona A</option>
                    <option value="A3">A3 - Zona A</option>
                    <option value="A4">A4 - Zona A</option>
                    <option value="A5">A5 - Zona A</option>
                    <option value="A6">A6 - Zona A</option>
                    <option value="A7">A7 - Zona A</option>
                    <option value="A8">A8 - Zona A</option>
                    <option value="C1">C1 - Zona C</option>
                    <option value="C2">C2 - Zona C</option>
                    <option value="C3">C3 - Zona C</option>
                    <option value="C4">C4 - Zona C</option>
                    <option value="C5">C5 - Zona C</option>
                    <option value="C6">C6 - Zona C</option>
                    <option value="C7">C7 - Zona C</option>
                    <option value="C8">C8 - Zona C</option>
                    <option value="D1">D1 - Zona D</option>
                    <option value="D2">D2 - Zona D</option>
                    <option value="D3">D3 - Zona D</option>
                    <option value="D4">D4 - Zona D</option>
                    <option value="D5">D5 - Zona D</option>
                    <option value="D6">D6 - Zona D</option>
                    <option value="D7">D7 - Zona D</option>
                    <option value="D8">D8 - Zona D</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6 pt-6 border-t-2 border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
              disabled={loading}
            >
              Cancelar
            </button>
            
            {clientData.scenario === 'with_reservation' ? (
              <>
                <button
                  onClick={() => onAction('enter', { reservationId: clientData.reservation?.id })}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <span>Confirmar Ingreso</span>
                </button>
                <button
                  onClick={() => onAction('skip')}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  <Clock className="h-4 w-4" />
                  <span>Por Ahora No</span>
                </button>
              </>
            ) : clientData.scenario === 'new_user' ? (
              <button
                onClick={() => onAction('new_user', { 
                  ...formData,
                  plate: clientData.plate
                })}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.make || !formData.model}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Registrar Usuario y Asignar Plaza</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => onAction('enter', { 
                  spaceNumber: selectedSpace,
                  scenario: clientData.scenario 
                })}
                disabled={loading || (clientData.scenario === 'no_reservation' && !selectedSpace)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>
                  {clientData.scenario === 'no_reservation' ? 'Asignar Plaza' : 'Registrar y Asignar'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoModal;
