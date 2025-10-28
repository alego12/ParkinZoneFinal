import { useState } from 'react';
import { User, Car, MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              {getScenarioIcon()}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{getScenarioTitle()}</h2>
                <p className="text-sm text-gray-600">{getScenarioDescription()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Client Information */}
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información del Cliente
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-medium">
                    {clientData.user ? `${clientData.user.firstName} ${clientData.user.lastName}` : 'Nuevo usuario'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{clientData.user?.email || 'Por completar'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-medium">{clientData.user?.phone || 'Por completar'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID Cliente</p>
                  <p className="font-medium">#{clientData.user?.id || 'Nuevo'}</p>
                </div>
              </div>
            </div>

            {/* Formulario para usuario nuevo */}
            {clientData?.scenario === 'new_user' && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Completar Datos del Vehículo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: juan@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: 12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <input
                      type="text"
                      value={formData.make}
                      onChange={(e) => setFormData({...formData, make: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Corolla"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Azul"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Información del Vehículo
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Modelo</p>
                  <p className="font-medium">{clientData.vehicle?.model || 'Por completar'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Placa</p>
                  <p className="font-medium">{clientData.vehicle?.plate || clientData.plate || 'Por completar'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-medium">{clientData.vehicle?.color || 'Por completar'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-medium">
                    {clientData.vehicle?.type === 'car' ? 'Auto' : clientData.vehicle?.type === 'motorcycle' ? 'Moto' : 'Por completar'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reservation Info (if exists) */}
            {clientData.reservation && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Reserva Activa
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Espacio</p>
                    <p className="font-medium">
                      {clientData.reservation.parkingSpace.spaceNumber} - {clientData.reservation.parkingSpace.zone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Hora de Inicio</p>
                    <p className="font-medium">
                      {new Date(clientData.reservation.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="font-medium">{clientData.reservation.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Reserva</p>
                    <p className="font-medium">Tiempo Indefinido</p>
                  </div>
                </div>
              </div>
            )}

            {/* Space Selection (for no_reservation scenario) */}
            {clientData.scenario === 'no_reservation' && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Asignación de Plaza
                </h3>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Seleccionar plaza disponible:</p>
                  <select
                    value={selectedSpace}
                    onChange={(e) => setSelectedSpace(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            
            {clientData.scenario === 'with_reservation' ? (
              <>
                <button
                  onClick={() => onAction('enter', { reservationId: clientData.reservation?.id })}
                  disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirmar Ingreso</span>
                </button>
                <button
                  onClick={() => onAction('skip')}
                  disabled={loading}
                  className="flex-1 btn-secondary flex items-center justify-center space-x-2"
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
                disabled={loading || !formData.make || !formData.model}
                className="flex-1 btn-primary flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Registrar Vehículo y Asignar Plaza</span>
              </button>
            ) : (
              <button
                onClick={() => onAction('enter', { 
                  spaceNumber: selectedSpace,
                  scenario: clientData.scenario 
                })}
                disabled={loading || (clientData.scenario === 'no_reservation' && !selectedSpace)}
                className="flex-1 btn-primary flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>
                  {clientData.scenario === 'no_reservation' ? 'Asignar Plaza' : 'Registrar y Asignar'}
                </span>
              </button>
            )}
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Procesando...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInfoModal;
