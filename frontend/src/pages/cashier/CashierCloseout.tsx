import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, DollarSign, CreditCard, QrCode, Banknote, Search, CheckCircle, Clock, User, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface Preview {
  range: { fromAt: string | null; toAt: string };
  counts: { total: number };
  totals: { totalCash: number; totalQR: number; totalCard: number; totalOverall: number };
  payments: { id: number; amount: number; method: 'cash'|'qr'|'card'; createdAt: string; userId?: number | null }[];
}

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

const CashierCloseout: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [paymentsWithUsers, setPaymentsWithUsers] = useState<any[]>([]);

  // Mapa de IDs de usuario a nombres
  const userMap = useMemo(() => {
    const map: { [key: number]: string } = {};
    users.forEach(u => {
      map[u.id] = `${u.firstName} ${u.lastName}`;
    });
    return map;
  }, [users]);

  const fetchUsers = async () => {
    try {
      const res = await api.admin.getUsers();
      const usersList = res.data.users || [];
      setUsers(usersList);
      console.log('Users loaded:', usersList.length);
    } catch (e) {
      console.error('Fetch users error', e);
    }
  };

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res = await api.closeouts.preview({ from: from || undefined, to: to || undefined });
      setPreview(res.data);
      
      // Obtener detalles completos de los pagos para tener userId
      if (res.data.payments && res.data.payments.length > 0) {
        const paymentIds = res.data.payments.map((p: any) => p.id);
        
        // Obtener todos los pagos del cajero (sin filtros de fecha para asegurar que encontremos todos)
        // Usar un límite alto para obtener todos los pagos
        let allPayments: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
          const response = await api.payments.mine({ page, limit: 100 });
          const payments = response.data.payments || [];
          allPayments = [...allPayments, ...payments];
          
          // Si hay menos pagos que el límite, hemos llegado al final
          if (payments.length < 100) {
            hasMore = false;
          } else {
            page++;
            // Limitar a 10 páginas máximo (1000 pagos) para evitar bucles infinitos
            if (page > 10) {
              hasMore = false;
            }
          }
        }
        
        // Crear un mapa de pagos por ID
        const paymentsMap = new Map(allPayments.map((p: any) => [p.id, p]));
        
        console.log('Total payments fetched:', allPayments.length);
        console.log('Preview payments:', res.data.payments.length);
        console.log('Payment IDs in preview:', paymentIds);
        
        // Enriquecer los pagos del preview con userId
        const enrichedPayments = res.data.payments.map((p: any) => {
          const fullPayment = paymentsMap.get(p.id);
          const userId = fullPayment?.userId || null;
          console.log(`Payment ${p.id}: userId = ${userId}`);
          return {
            ...p,
            userId: userId
          };
        });
        
        console.log('Enriched payments:', enrichedPayments);
        setPaymentsWithUsers(enrichedPayments);
      } else {
        setPaymentsWithUsers([]);
      }
      
      if (res.data.counts.total === 0) {
        toast.success('No hay pagos pendientes de cierre en el rango seleccionado');
      }
    } catch (e: any) {
      console.error('Preview closeout error', e);
      toast.error(e.response?.data?.message || 'Error al cargar la previsualización');
    } finally {
      setLoading(false);
    }
  };

  const confirmCloseout = async () => {
    try {
      setConfirming(true);
      await api.closeouts.confirm({ from: from || undefined, to: to || undefined, notes: notes || undefined });
      toast.success('Cierre de caja confirmado exitosamente');
      // Reset preview after confirming
      setPreview(null);
      setNotes('');
      setFrom('');
      setTo('');
      // Optionally refetch preview (should be empty now)
      await fetchPreview();
    } catch (e: any) {
      console.error('Confirm closeout error', e);
      toast.error(e.response?.data?.message || 'Error al confirmar el cierre de caja');
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = preview?.totals;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cierre de Caja</h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona y confirma los cierres de caja de tus pagos</p>
          </div>
        </div>
        <div className="text-right bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border-2 border-green-200">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Cajero</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <input 
              type="text" 
              placeholder="Agregar notas sobre este cierre..." 
              value={notes} 
              onChange={e=>setNotes(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchPreview} 
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Previsualizar</span>
              </>
            )}
          </button>
          <button 
            onClick={confirmCloseout} 
            disabled={confirming || (preview?.counts.total ?? 0) === 0 || loading} 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Confirmando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Confirmar Cierre</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resumen del Rango */}
      {preview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Desde</p>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {preview.range.fromAt ? new Date(preview.range.fromAt).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Inicio del turno'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Hasta</p>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {new Date(preview.range.toAt).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total de Pagos</p>
            </div>
            <p className="text-4xl font-bold text-blue-600">{preview.counts.total}</p>
            <p className="text-xs text-gray-600 mt-2 font-medium">transacciones</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total General</p>
            </div>
            <p className="text-4xl font-bold text-green-700">${(totals?.totalOverall ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-2 font-medium">suma de todos los métodos</p>
          </div>
        </div>
      )}

      {/* Totales por Método */}
      {preview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl shadow-lg border-2 border-emerald-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md">
                <Banknote className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Efectivo</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">${(totals?.totalCash ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {preview.payments.filter(p => p.method === 'cash').length} pagos
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">QR</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">${(totals?.totalQR ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {preview.payments.filter(p => p.method === 'qr').length} pagos
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-purple-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Tarjeta</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">${(totals?.totalCard ?? 0).toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {preview.payments.filter(p => p.method === 'card').length} pagos
            </p>
          </div>
        </div>
      )}

      {/* Tabla de Pagos */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            Detalle de Pagos
          </h2>
          <p className="text-sm text-gray-600 mt-1 font-medium">Lista de todos los pagos incluidos en este cierre</p>
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
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Método de Pago
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-gray-600">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="font-semibold">Cargando pagos...</span>
                    </div>
                  </td>
                </tr>
              ) : (preview?.payments?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <DollarSign className="h-12 w-12 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold">No hay pagos pendientes de cierre</p>
                      <p className="text-xs font-medium">Ajusta los filtros de fecha para buscar pagos en otro rango</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (paymentsWithUsers.length > 0 ? paymentsWithUsers : preview!.payments).map((p, index) => (
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
                      {(() => {
                        const userId = p.userId;
                        if (!userId) {
                          return <span className="text-sm text-gray-400 font-medium">—</span>;
                        }
                        
                        const userName = userMap[userId];
                        if (userName) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                                <User className="h-3.5 w-3.5 text-purple-600" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">{userName}</div>
                                <div className="text-xs text-gray-500 font-medium">ID: {userId}</div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Si no encontramos el nombre, mostrar el ID temporalmente mientras se carga
                        return (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 shadow-sm">
                            Cliente #{userId}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getPaymentMethodColor(p.method)}`}>
                        {getPaymentMethodIcon(p.method)}
                        {translatePaymentMethod(p.method)}
                      </span>
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
            {preview && preview.payments.length > 0 && (
              <tfoot className="bg-gradient-to-r from-gray-50 to-green-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    Total:
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">${(totals?.totalOverall ?? 0).toFixed(2)}</div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashierCloseout;
