import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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
    } catch (e) {
      console.error('Fetch closeouts error', e);
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
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes de Caja</h1>
        <div className="text-sm text-gray-600">Usuario: {user?.firstName} {user?.lastName}</div>
      </div>

      <div className="bg-white p-4 rounded-lg border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="input" />
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="input" />
          <input type="number" placeholder="ID Cajero" value={cashierId} onChange={e=>setCashierId(e.target.value)} className="input" />
          <button onClick={() => { setPage(1); fetchData(); }} className="btn-primary">Filtrar</button>
          <button onClick={() => { setFrom(''); setTo(''); setCashierId(''); setPage(1); fetchData(); }} className="btn-secondary">Limpiar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hasta</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cajero</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Sin resultados</td></tr>
              ) : (
                items.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm">{c.id}</td>
                    <td className="px-4 py-2 text-sm">{new Date(c.fromAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{new Date(c.toAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{c.closedBy}</td>
                    <td className="px-4 py-2 text-sm font-semibold">${Number(c.totalOverall).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right"><button onClick={() => fetchDetail(c.id)} className="btn-secondary">Ver</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between m-4">
            <div className="text-sm text-gray-600">Total: {total}</div>
            <div className="space-x-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="btn-secondary disabled:opacity-50">Anterior</button>
              <span className="text-sm">Página {page} de {Math.max(1, Math.ceil(total / limit))}</span>
              <button disabled={(page)>=Math.max(1, Math.ceil(total / limit))} onClick={()=>setPage(p=>p+1)} className="btn-secondary disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">Detalle</h2>
          {!detail ? (
            <div className="text-gray-500 text-sm">Selecciona un cierre para ver sus pagos y totales.</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Cierre</p>
                  <p className="font-medium">#{detail.closeout.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cajero</p>
                  <p className="font-medium">{detail.closeout.closedBy}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Desde</p>
                  <p className="font-medium">{new Date(detail.closeout.fromAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hasta</p>
                  <p className="font-medium">{new Date(detail.closeout.toAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Efectivo</p>
                  <p className="font-semibold">${Number(detail.closeout.totalCash).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">QR</p>
                  <p className="font-semibold">${Number(detail.closeout.totalQR).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Tarjeta</p>
                  <p className="font-semibold">${Number(detail.closeout.totalCard).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="font-semibold text-green-600">${Number(detail.closeout.totalOverall).toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Pagos</h3>
                <div className="max-h-64 overflow-auto border rounded">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detail.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-sm">{p.id}</td>
                          <td className="px-3 py-2 text-sm">{new Date(p.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">{p.method}</td>
                          <td className="px-3 py-2 text-sm font-semibold">${Number(p.amount).toFixed(2)}</td>
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
