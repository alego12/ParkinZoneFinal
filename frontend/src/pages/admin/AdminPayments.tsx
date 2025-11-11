import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, DollarSign, CreditCard, QrCode, Banknote, Search, X, ChevronLeft, ChevronRight, User, Loader2, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type Method = 'cash' | 'qr' | 'card';

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

interface Payment {
  id: number;
  reservationId: number | null;
  userId: number | null;
  amount: number;
  method: Method;
  reference?: string | null;
  notes?: string | null;
  recordedBy: number;
  createdAt: string;
}

const AdminPayments: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [method, setMethod] = useState<Method | ''>('');
  const [recordedBy, setRecordedBy] = useState<string>('');

  const [users, setUsers] = useState<any[]>([]);

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
      const res = await api.admin.getUsers();
      setUsers(res.data.users || []);
    } catch (e) {
      console.error('Fetch users error', e);
    }
  };

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (from) params.from = from;
      if (to) params.to = to;
      if (method) params.method = method;
      if (recordedBy) params.recordedBy = Number(recordedBy);
      const res = await api.payments.list(params);
      setItems(res.data.payments || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (e: any) {
      console.error('Fetch payments error', e);
      toast.error(e.response?.data?.message || 'Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const totalAmount = useMemo(() => items.reduce((s, p) => s + Number(p.amount), 0), [items]);
  const byMethod = useMemo(() => {
    const acc: Record<string, number> = { cash: 0, qr: 0, card: 0 };
    items.forEach(p => { acc[p.method] += Number(p.amount); });
    return acc;
  }, [items]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pagos (Admin)</h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona y revisa todos los pagos del sistema</p>
          </div>
        </div>
        <div className="text-right bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border-2 border-green-200">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Administrador</div>
          <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-2">
            <User className="h-4 w-4" />
            {user?.firstName} {user?.lastName}
          </div>
        </div>
      </div>

      {/* Resumen de Pagos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Cobrado</p>
          </div>
          <p className="text-4xl font-bold text-green-700">${totalAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-2 font-medium">En esta página ({items.length} pagos)</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total de Pagos</p>
          </div>
          <p className="text-4xl font-bold text-blue-600">{items.length}</p>
          <p className="text-xs text-gray-600 mt-2 font-medium">en esta página</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl shadow-lg border-2 border-emerald-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md">
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Efectivo</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">${byMethod.cash.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-2 font-medium">
            {items.filter(p => p.method === 'cash').length} pagos
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-purple-200 hover:shadow-xl transition-all transform hover:scale-105">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">QR/Tarjeta</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">${(byMethod.qr + byMethod.card).toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-2 font-medium">
            {items.filter(p => p.method === 'qr' || p.method === 'card').length} pagos
          </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
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
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Método de Pago
            </label>
            <div className="grid grid-cols-4 gap-3">
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                method === ''
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value=""
                  checked={method === ''}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="sr-only"
                />
                <div className={`p-2 rounded-lg mb-2 ${
                  method === '' ? 'bg-gradient-to-br from-gray-500 to-gray-600' : 'bg-gray-200'
                }`}>
                  <DollarSign className={`h-5 w-5 ${method === '' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">Todos</span>
                {method === '' && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </label>
              
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                method === 'cash'
                  ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50 hover:shadow-sm'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={method === 'cash'}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="sr-only"
                />
                <div className={`p-2 rounded-lg mb-2 ${
                  method === 'cash' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-200'
                }`}>
                  <Banknote className={`h-5 w-5 ${method === 'cash' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">Efectivo</span>
                {method === 'cash' && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </label>
              
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                method === 'qr'
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="qr"
                  checked={method === 'qr'}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="sr-only"
                />
                <div className={`p-2 rounded-lg mb-2 ${
                  method === 'qr' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-200'
                }`}>
                  <QrCode className={`h-5 w-5 ${method === 'qr' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">QR</span>
                {method === 'qr' && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </label>
              
              <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                method === 'card'
                  ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 hover:shadow-sm'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={method === 'card'}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="sr-only"
                />
                <div className={`p-2 rounded-lg mb-2 ${
                  method === 'card' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gray-200'
                }`}>
                  <CreditCard className={`h-5 w-5 ${method === 'card' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <span className="text-xs font-bold text-gray-700 text-center">Tarjeta</span>
                {method === 'card' && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                )}
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cajero
            </label>
            <select 
              value={recordedBy} 
              onChange={e=>setRecordedBy(e.target.value)} 
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
              onClick={() => { setFrom(''); setTo(''); setMethod(''); setRecordedBy(''); setPage(1); fetchData(); }} 
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg hover:shadow-xl font-bold w-full justify-center transform hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            Detalle de Pagos
          </h2>
          <p className="text-sm text-gray-600 mt-1 font-medium">Lista de todos los pagos registrados en el sistema</p>
        </div>
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  # Transacción
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Fecha y Hora
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Reserva
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Método de Pago
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Cajero
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Monto
                </th>
            </tr>
          </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-gray-600">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="font-semibold">Cargando pagos...</span>
                    </div>
                  </td>
                </tr>
            ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <DollarSign className="h-12 w-12 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold">No se encontraron pagos</p>
                      <p className="text-xs font-medium">Ajusta los filtros para buscar pagos en otro rango</p>
                    </div>
                  </td>
                </tr>
            ) : (
                items.map((p, index) => (
                  <tr key={p.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                          <Shield className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">#{p.id}</div>
                          <div className="text-xs text-gray-500 font-medium">Transacción {index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {new Date(p.createdAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {new Date(p.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.reservationId ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm">
                          Reserva #{p.reservationId}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.userId ? (
                        userMap[p.userId] ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                              <User className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{userMap[p.userId]}</div>
                              <div className="text-xs text-gray-500 font-medium">ID: {p.userId}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 shadow-sm">
                            Cliente #{p.userId}
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getPaymentMethodColor(p.method)}`}>
                        {getPaymentMethodIcon(p.method)}
                        {translatePaymentMethod(p.method)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userMap[p.recordedBy] ? (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg">
                            <User className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{userMap[p.recordedBy]}</div>
                            <div className="text-xs text-gray-500 font-medium">ID: {p.recordedBy}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium">Cajero #{p.recordedBy}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div className="text-lg font-bold text-gray-900">${Number(p.amount).toFixed(2)}</div>
                      </div>
                    </td>
                </tr>
              ))
            )}
          </tbody>
            {items.length > 0 && (
              <tfoot className="bg-gradient-to-r from-gray-50 to-green-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    Total (página):
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
        </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-6 bg-white p-5 rounded-xl shadow-lg border-2 border-gray-200">
        <div className="text-sm text-gray-600 font-medium">
          Mostrando <span className="font-bold text-gray-900">{items.length}</span> de <span className="font-bold text-gray-900">{total}</span> pagos
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
  );
};

export default AdminPayments;
