import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Vehicle } from '../../types';
import { Plus, Edit, Trash2, Car } from 'lucide-react';
import toast from 'react-hot-toast';

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    model: '',
    plate: '',
    color: '',
    type: 'car' as 'car' | 'motorcycle',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.vehicles.getAll();
      setVehicles(response.data.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Error al cargar los vehículos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formato de placa boliviana
    const plateRegex = /^[0-9]{4}[A-Z]{3}$/;
    if (!plateRegex.test(formData.plate)) {
      toast.error('La placa debe tener el formato boliviano: 4 dígitos seguidos de 3 letras (ej: 1825PHD)');
      return;
    }
    
    try {
      if (editingVehicle) {
        await api.vehicles.update(editingVehicle.id, formData);
        toast.success('Vehículo actualizado exitosamente');
      } else {
        await api.vehicles.create(formData);
        toast.success('Vehículo agregado exitosamente');
      }
      
      setShowModal(false);
      setEditingVehicle(null);
      setFormData({ model: '', plate: '', color: '', type: 'car' });
      fetchVehicles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar el vehículo');
    }
  };

  const handleDelete = async (vehicleId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este vehículo?')) return;

    try {
      await api.vehicles.delete(vehicleId);
      toast.success('Vehículo eliminado exitosamente');
      fetchVehicles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el vehículo');
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      model: vehicle.model,
      plate: vehicle.plate,
      color: vehicle.color,
      type: vehicle.type,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormData({ model: '', plate: '', color: '', type: 'car' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
    setFormData({ model: '', plate: '', color: '', type: 'car' });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Mis Vehículos</h1>
        <button
          onClick={openCreateModal}
          disabled={vehicles.length >= 3}
          className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Vehículo
        </button>
      </div>

      {vehicles.length >= 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Car className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Has alcanzado el límite máximo de 3 vehículos. Elimina un vehículo para agregar uno nuevo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes vehículos registrados
            </h3>
            <p className="text-gray-500 mb-6">
              Agrega tu primer vehículo para poder hacer reservas
            </p>
            <button
              onClick={openCreateModal}
              className="btn-primary"
            >
              Agregar Primer Vehículo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Placa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Car className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.plate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                          style={{ backgroundColor: vehicle.color.toLowerCase() }}
                        ></div>
                        <span className="text-sm text-gray-900 capitalize">
                          {vehicle.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        vehicle.type === 'motorcycle' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {vehicle.type === 'motorcycle' ? '🏍️ Moto' : '🚗 Auto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(vehicle.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(vehicle)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingVehicle ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo del Vehículo
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ej: Toyota Corolla"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Placa
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ej: 1825PHD"
                  value={formData.plate}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase();
                    // Solo permitir números y letras, máximo 7 caracteres
                    value = value.replace(/[^A-Z0-9]/g, '');
                    if (value.length <= 7) {
                      setFormData({ ...formData, plate: value });
                    }
                  }}
                  pattern="[0-9]{4}[A-Z]{3}"
                  title="Formato boliviano: 4 dígitos seguidos de 3 letras (ej: 1825PHD)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato boliviano: 4 dígitos + 3 letras (ej: 1825PHD)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color del Vehículo
                </label>
                <select
                  required
                  className="input-field"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                >
                  <option value="">Selecciona un color</option>
                  <option value="Blanco">Blanco</option>
                  <option value="Negro">Negro</option>
                  <option value="Gris">Gris</option>
                  <option value="Plateado">Plateado</option>
                  <option value="Rojo">Rojo</option>
                  <option value="Azul">Azul</option>
                  <option value="Verde">Verde</option>
                  <option value="Amarillo">Amarillo</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Vehículo
                </label>
                <select
                  required
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'car' | 'motorcycle' })}
                >
                  <option value="car">🚗 Auto</option>
                  <option value="motorcycle">🏍️ Moto</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingVehicle ? 'Actualizar' : 'Agregar'} Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
