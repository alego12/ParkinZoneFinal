import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, DollarSign, CreditCard, QrCode, Banknote, Search, X, Eye, Clock, User, ChevronLeft, ChevronRight, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const translatePaymentMethod = (method: 'cash'|'qr'|'card'): string => {
  const methods: { [key: string]: string } = {
    'cash': 'Efectivo',
    'qr': 'QR',
    'card': 'Tarjeta',
  };
  return methods[method] || method;
};

const getPaymentMethodIcon = (method: 'cash'|'qr'|'card') => {
  switch (method) {
    case 'cash':
      return <Banknote className="h-4 w-4" />;
    case 'qr':
      return <QrCode className="h-4 w-4" />;
    case 'card':
      return <CreditCard className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const getPaymentMethodColor = (method: 'cash'|'qr'|'card'): string => {
  switch (method) {
    case 'cash':
      return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
    case 'qr':
      return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
    case 'card':
      return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
    default:
      return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
  }
};

interface Closeout {
  id: number;
  fromAt: string;
  toAt: string;
  totalCash: number;
  totalQR: number;
  totalCard: number;
  totalOverall: number;
  closedBy: number;
  closedAt: string | null;
  notes?: string | null;
  createdAt: string;
}

const AdminCloseouts: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Closeout[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [cashierId, setCashierId] = useState<string>('');

  const [detail, setDetail] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Mapa de IDs de usuario a nombres
  const userMap = useMemo(() => {
    const map: { [key: number]: string } = {};
    users.forEach(u => {
      map[u.id] = `${u.firstName} ${u.lastName}`;
    });
    return map;
  }, [users]);

  // Filtrar solo cajeros
  const cashiers = useMemo(() => {
    return users.filter(u => u.role === 'cashier' && u.isActive !== false);
  }, [users]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.admin.getUsers();
      setUsers(res.data.users || []);
    } catch (e) {
      console.error('Fetch users error', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (from) params.from = from;
      if (to) params.to = to;
      if (cashierId) params.cashierId = Number(cashierId);
      const res = await api.closeouts.list(params);
      setItems(res.data.closeouts || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e: any) {
      console.error('Fetch closeouts error', e);
      toast.error(e.response?.data?.message || 'Error al cargar los reportes de caja');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    try {
      setLoading(true);
      const res = await api.closeouts.get(id);
      setDetail(res.data);
    } catch (e) {
      console.error('Get closeout details error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes de Caja</h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona y revisa todos los cierres de caja del sistema</p>
          </div>
        </div>
        <div className="text-right bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 rounded-xl border-2 border-indigo-200">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Administrador</div>
          <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-2">
            <User className="h-4 w-4" />
            {user?.firstName} {user?.lastName}
          </div>
        </div>
      </div>

      {/* Filtros mejorados */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          Filtros de Búsqueda
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input 
              type="datetime-local" 
              value={from} 
              onChange={e=>setFrom(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input 
              type="datetime-local" 
              value={to} 
              onChange={e=>setTo(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cajero
            </label>
            <select 
              value={cashierId} 
              onChange={e=>setCashierId(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            >
              <option value="">Todos los cajeros</option>
              {cashiers.map(cashier => (
                <option key={cashier.id} value={cashier.id}>
                  {cashier.firstName} {cashier.lastName} (ID: {cashier.id})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button 
              onClick={() => { setPage(1); fetchData(); }} 
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold w-full justify-center transform hover:scale-105 active:scale-95"
            >
              <Search className="h-4 w-4" />
              Filtrar
            </button>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => { setFrom(''); setTo(''); setCashierId(''); setPage(1); fetchData(); }} 
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold w-full justify-center transform hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              Lista de Cierres de Caja
            </h2>
            <p className="text-sm text-gray-600 mt-1 font-medium">Todos los cierres registrados en el sistema</p>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    # Cierre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Desde
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Hasta
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Cajero
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Total
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Acción
                  </th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3 text-gray-600">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="font-semibold">Cargando cierres...</span>
                      </div>
                    </td>
                  </tr>
              ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <DollarSign className="h-12 w-12 text-gray-400" />
                        </div>
                        <p className="text-sm font-bold">No se encontraron cierres de caja</p>
                        <p className="text-xs font-medium">Ajusta los filtros para buscar en otro rango</p>
                      </div>
                    </td>
                  </tr>
              ) : (
                items.map(c => (
                    <tr key={c.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 transition-all border-b border-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg">
                            <Shield className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div className="text-sm font-bold text-gray-900">#{c.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {new Date(c.fromAt).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              {new Date(c.fromAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {new Date(c.toAt).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              {new Date(c.toAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userMap[c.closedBy] ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                              <User className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{userMap[c.closedBy]}</div>
                              <div className="text-xs text-gray-500 font-medium">ID: {c.closedBy}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 font-medium">Cajero #{c.closedBy}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <div className="text-lg font-bold text-green-600">${Number(c.totalOverall).toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => fetchDetail(c.id)} 
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-bold transform hover:scale-105 active:scale-95"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </button>
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between px-6 py-5 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
            <div className="text-sm text-gray-600 font-medium">
              Mostrando <span className="font-bold text-gray-900">{items.length}</span> de <span className="font-bold text-gray-900">{total}</span> cierres
            </div>
            <div className="flex items-center gap-3">
              <button 
                disabled={page<=1} 
                onClick={()=>setPage(p=>p-1)} 
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="text-sm font-bold text-gray-700 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl border border-gray-300">Página {page} de {pages}</span>
              <button 
                disabled={page>=pages} 
                onClick={()=>setPage(p=>p+1)} 
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
              <Eye className="h-4 w-4 text-white" />
            </div>
            Detalle del Cierre
          </h2>
          {!detail ? (
            <div className="text-center py-12 text-gray-500">
              <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                <Eye className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-sm font-bold">Selecciona un cierre</p>
              <p className="text-xs mt-2 font-medium">Haz clic en "Ver" para ver los detalles</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border-2 border-gray-200">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2"># Cierre</p>
                  <p className="text-lg font-bold text-gray-900">#{detail.closeout.id}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Cajero</p>
                  {userMap[detail.closeout.closedBy] ? (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                        <User className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{userMap[detail.closeout.closedBy]}</p>
                        <p className="text-xs text-gray-500 font-medium">ID: {detail.closeout.closedBy}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-gray-900">Cajero #{detail.closeout.closedBy}</p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border-2 border-gray-200">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Desde
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(detail.closeout.fromAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {new Date(detail.closeout.fromAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border-2 border-gray-200">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Hasta
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(detail.closeout.toAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {new Date(detail.closeout.toAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                      <Banknote className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Efectivo</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">${Number(detail.closeout.totalCash).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <QrCode className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">QR</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">${Number(detail.closeout.totalQR).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Tarjeta</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">${Number(detail.closeout.totalCard).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Total General</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">${Number(detail.closeout.totalOverall).toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pagos ({detail.payments?.length || 0})
                </h3>
                <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Fecha</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Método</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detail.payments?.map((p: any, index: number) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">#{p.id}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {new Date(p.createdAt).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric'
                            })}
                            <span className="text-xs text-gray-500 ml-1">
                              {new Date(p.createdAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(p.method)}`}>
                              {getPaymentMethodIcon(p.method)}
                              {translatePaymentMethod(p.method)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900">${Number(p.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCloseouts;
