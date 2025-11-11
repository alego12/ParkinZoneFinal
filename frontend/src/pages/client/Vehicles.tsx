import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Vehicle } from '../../types';
import { Plus, Edit, Trash2, Car, RefreshCw, Loader2, X, Save, Bike, CheckCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    model: '',
    plate: '',
    color: '',
    type: 'car' as 'car' | 'motorcycle',
  });

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
      setSaving(true);
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
    } finally {
      setSaving(false);
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
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-semibold text-gray-600">Cargando vehículos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Vehículos</h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona tus vehículos registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchVehicles}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg font-bold transform hover:scale-105 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            onClick={openCreateModal}
            disabled={vehicles.length >= 3}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
          >
            <Plus className="h-4 w-4" />
            Agregar Vehículo
          </button>
        </div>
      </div>

      {vehicles.length >= 3 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5 mb-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-800">
                Has alcanzado el límite máximo de 3 vehículos. Elimina un vehículo para agregar uno nuevo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <Car className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No tienes vehículos registrados
            </h3>
            <p className="text-gray-600 mb-6 font-medium">
              Agrega tu primer vehículo para poder hacer reservas
            </p>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold transform hover:scale-105 active:scale-95 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Agregar Primer Vehículo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Vehículo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Placa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Color
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Fecha de Registro
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                          {vehicle.type === 'motorcycle' ? (
                            <Bike className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Car className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {vehicle.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 font-mono text-lg">
                        {vehicle.plate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-md flex-shrink-0"
                          style={{ backgroundColor: getColorFromName(vehicle.color) }}
                          title={vehicle.color}
                        />
                        <span className="text-sm font-bold text-gray-900 capitalize">
                          {vehicle.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                        vehicle.type === 'motorcycle' 
                          ? 'bg-gradient-to-r from-orange-100 to-amber-200 text-orange-800 border border-orange-300' 
                          : 'bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-300'
                      }`}>
                        {vehicle.type === 'motorcycle' ? (
                          <>
                            <Bike className="h-4 w-4" />
                            Moto
                          </>
                        ) : (
                          <>
                            <Car className="h-4 w-4" />
                            Auto
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(vehicle.createdAt).toLocaleDateString('es-CO', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(vehicle)}
                          className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95 border border-blue-200"
                          title="Editar vehículo"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="p-2.5 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 hover:from-red-100 hover:to-pink-100 rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95 border border-red-200"
                          title="Eliminar vehículo"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b-2 border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                  <Car className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingVehicle ? 'Editar Vehículo' : 'Agregar Nuevo Vehículo'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all transform hover:scale-110 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Modelo del Vehículo
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 font-medium"
                  placeholder="Ej: Toyota Corolla"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Número de Placa
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 font-mono text-lg font-bold"
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
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  Formato boliviano: 4 dígitos + 3 letras (ej: 1825PHD)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Color del Vehículo
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {[
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
                  ].map((color) => (
                    <label
                      key={color.name}
                      className={`relative flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
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
                        className="w-8 h-8 rounded-full border-2 border-gray-300 mb-2 shadow-sm"
                        style={{ backgroundColor: color.value }}
                      ></div>
                      <span className="text-xs font-bold text-gray-700 text-center">
                        {color.name}
                      </span>
                      {formData.color === color.name && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                {!formData.color && (
                  <p className="text-xs text-gray-600 mt-2 font-medium">Selecciona un color</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Tipo de Vehículo
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`relative flex items-center justify-center p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.type === 'car'
                        ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vehicleType"
                      value="car"
                      checked={formData.type === 'car'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'car' | 'motorcycle' })}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center">
                      <div className={`p-3 rounded-xl mb-3 shadow-sm ${
                        formData.type === 'car' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-200'
                      }`}>
                        <Car className={`h-8 w-8 ${formData.type === 'car' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span className={`text-sm font-bold ${
                        formData.type === 'car' ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        Auto
                      </span>
                    </div>
                    {formData.type === 'car' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </label>
                  
                  <label
                    className={`relative flex items-center justify-center p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.type === 'motorcycle'
                        ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md scale-[1.02]'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vehicleType"
                      value="motorcycle"
                      checked={formData.type === 'motorcycle'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'car' | 'motorcycle' })}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center">
                      <div className={`p-3 rounded-xl mb-3 shadow-sm ${
                        formData.type === 'motorcycle' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gray-200'
                      }`}>
                        <Bike className={`h-8 w-8 ${formData.type === 'motorcycle' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span className={`text-sm font-bold ${
                        formData.type === 'motorcycle' ? 'text-orange-700' : 'text-gray-700'
                      }`}>
                        Motocicleta
                      </span>
                    </div>
                    {formData.type === 'motorcycle' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-orange-600" />
                      </div>
                    )}
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingVehicle ? 'Actualizando...' : 'Agregando...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {editingVehicle ? 'Actualizar' : 'Agregar'} Vehículo
                    </>
                  )}
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
