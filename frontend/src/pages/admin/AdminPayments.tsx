import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

type Method = 'cash' | 'qr' | 'card';

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
    } catch (e) {
      console.error('Fetch payments error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagos (Admin)</h1>
        <div className="text-sm text-gray-600">Usuario: {user?.firstName} {user?.lastName}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total Cobrado (página)</p>
          <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600"># Pagos (página)</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Efectivo (página)</p>
          <p className="text-2xl font-bold">${byMethod.cash.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">QR/Tarjeta (página)</p>
          <p className="text-2xl font-bold">${(byMethod.qr + byMethod.card).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="input" />
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="input" />
          <select value={method} onChange={e=>setMethod(e.target.value as any)} className="input">
            <option value="">Método (todos)</option>
            <option value="cash">Efectivo</option>
            <option value="qr">QR</option>
            <option value="card">Tarjeta</option>
          </select>
          <input type="number" placeholder="ID Cajero" value={recordedBy} onChange={e=>setRecordedBy(e.target.value)} className="input" />
          <button onClick={() => { setPage(1); fetchData(); }} className="btn-primary">Filtrar</button>
          <button onClick={() => { setFrom(''); setTo(''); setMethod(''); setRecordedBy(''); setPage(1); fetchData(); }} className="btn-secondary">Limpiar</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reserva</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cajero</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">Sin resultados</td></tr>
            ) : (
              items.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm">{p.id}</td>
                  <td className="px-4 py-2 text-sm">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm">{p.reservationId ?? '-'}</td>
                  <td className="px-4 py-2 text-sm">{p.userId ?? '-'}</td>
                  <td className="px-4 py-2 text-sm font-semibold">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm">{p.method}</td>
                  <td className="px-4 py-2 text-sm">{p.recordedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="space-x-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="btn-secondary disabled:opacity-50">Anterior</button>
          <span className="text-sm">Página {page} de {pages}</span>
          <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="btn-secondary disabled:opacity-50">Siguiente</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
