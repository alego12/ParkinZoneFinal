import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { Plus, Edit, Trash2, Loader2, X, Save, Users, Mail, Phone, Shield, UserCheck, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'security' as 'admin' | 'security' | 'cashier',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.createUser(formData);
      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'security',
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSaving(true);
      const { password, ...updateData } = formData;
      const dataToSend = password ? { ...updateData, password } : updateData;
      
      await api.admin.updateUser(selectedUser.id, dataToSend);
      toast.success('Usuario actualizado exitosamente');
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'security',
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      await api.admin.deleteUser(userId);
      toast.success('Usuario eliminado exitosamente');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      password: '',
      role: user.role as 'admin' | 'security' | 'cashier',
    });
    setShowEditModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
      security: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
      client: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
      cashier: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300',
    };
    const labels = {
      admin: 'Administrador',
      security: 'Seguridad',
      client: 'Cliente',
      cashier: 'Caja',
    };
    
    return (
      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${colors[role as keyof typeof colors]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-600 mt-1">Administra los usuarios del sistema</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center gap-2 transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md ring-2 ring-blue-200">
                          <span className="text-sm font-bold text-white">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{user.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                      user.isActive 
                        ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' 
                        : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                    }`}>
                      <UserCheck className="h-3.5 w-3.5" />
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95"
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2.5 text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-110 active:scale-95"
                        title="Eliminar usuario"
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
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl">
                    <UserCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Crear Nuevo Usuario</h3>
                    <p className="text-sm text-gray-600 mt-0.5">Completa los datos del nuevo usuario</p>
                  </div>
                </div>
              <button
                onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110 active:scale-95"
              >
                  <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                      placeholder="Ingresa el nombre"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Apellido</label>
                  <input
                    type="text"
                    required
                      placeholder="Ingresa el apellido"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email
                  </label>
                <input
                  type="email"
                  required
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-indigo-600" />
                    Teléfono
                  </label>
                <input
                  type="tel"
                  required
                    placeholder="300 123 4567"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Contraseña</label>
                <input
                  type="password"
                  required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    Rol
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === 'security'
                        ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50 hover:shadow-md'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="security"
                        checked={formData.role === 'security'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'security' | 'cashier' })}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full">
                        <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                          <Shield className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">Seguridad</div>
                          <div className="text-xs text-gray-600">Control de acceso</div>
                        </div>
                        {formData.role === 'security' && (
                          <div className="p-1.5 bg-yellow-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === 'admin'
                        ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 hover:shadow-md'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={formData.role === 'admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'security' | 'cashier' })}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full">
                        <div className="p-2 bg-red-100 rounded-lg mr-3">
                          <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">Administrador</div>
                          <div className="text-xs text-gray-600">Acceso completo</div>
                        </div>
                        {formData.role === 'admin' && (
                          <div className="p-1.5 bg-red-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === 'cashier'
                        ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 hover:shadow-md'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="cashier"
                        checked={formData.role === 'cashier'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'security' | 'cashier' })}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full">
                        <div className="p-2 bg-purple-100 rounded-lg mr-3">
                          <Shield className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">Caja</div>
                          <div className="text-xs text-gray-600">Gestión de pagos</div>
                        </div>
                        {formData.role === 'cashier' && (
                          <div className="p-1.5 bg-purple-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
              </div>
              
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:via-green-800 hover:to-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                  Crear Usuario
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                    <Edit className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Editar Usuario</h3>
                    <p className="text-sm text-gray-600 mt-0.5">Modifica los datos del usuario</p>
                  </div>
                </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110 active:scale-95"
              >
                  <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                      placeholder="Ingresa el nombre"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Apellido</label>
                  <input
                    type="text"
                    required
                      placeholder="Ingresa el apellido"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email
                  </label>
                <input
                  type="email"
                  required
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-indigo-600" />
                    Teléfono
                  </label>
                <input
                  type="tel"
                  required
                    placeholder="300 123 4567"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                  Nueva Contraseña (opcional)
                </label>
                <input
                  type="password"
                    placeholder="Dejar vacío para mantener la actual"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    Rol
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === 'security'
                        ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50 hover:shadow-md'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="security"
                        checked={formData.role === 'security'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'security' | 'cashier' })}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full">
                        <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                          <Shield className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">Seguridad</div>
                          <div className="text-xs text-gray-600">Control de acceso</div>
                        </div>
                        {formData.role === 'security' && (
                          <div className="p-1.5 bg-yellow-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === 'admin'
                        ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 hover:shadow-md'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={formData.role === 'admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'security' | 'cashier' })}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full">
                        <div className="p-2 bg-red-100 rounded-lg mr-3">
                          <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">Administrador</div>
                          <div className="text-xs text-gray-600">Acceso completo</div>
                        </div>
                        {formData.role === 'admin' && (
                          <div className="p-1.5 bg-red-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === 'cashier'
                        ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 hover:shadow-md'
                    }`}>
                      <input
                        type="radio"
                        name="role"
                        value="cashier"
                        checked={formData.role === 'cashier'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'security' | 'cashier' })}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full">
                        <div className="p-2 bg-purple-100 rounded-lg mr-3">
                          <Shield className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">Caja</div>
                          <div className="text-xs text-gray-600">Gestión de pagos</div>
                        </div>
                        {formData.role === 'cashier' && (
                          <div className="p-1.5 bg-purple-600 rounded-full">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
              </div>
              
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  disabled={saving}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                  Actualizar Usuario
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
