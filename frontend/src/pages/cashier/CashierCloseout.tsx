import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Preview {
  range: { fromAt: string | null; toAt: string };
  counts: { total: number };
  totals: { totalCash: number; totalQR: number; totalCard: number; totalOverall: number };
  payments: { id: number; amount: number; method: 'cash'|'qr'|'card'; createdAt: string }[];
}

const CashierCloseout: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [preview, setPreview] = useState<Preview | null>(null);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res = await api.closeouts.preview({ from: from || undefined, to: to || undefined });
      setPreview(res.data);
    } catch (e) {
      console.error('Preview closeout error', e);
    } finally {
      setLoading(false);
    }
  };

  const confirmCloseout = async () => {
    try {
      setConfirming(true);
      const res = await api.closeouts.confirm({ from: from || undefined, to: to || undefined, notes: notes || undefined });
      // Reset preview after confirming
      setPreview(null);
      setNotes('');
      setFrom('');
      setTo('');
      // Optionally refetch preview (should be empty now)
      await fetchPreview();
    } catch (e) {
      console.error('Confirm closeout error', e);
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = preview?.totals;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
        <div className="text-sm text-gray-600">Cajero: {user?.firstName} {user?.lastName}</div>
      </div>

      <div className="bg-white p-4 rounded-lg border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="input" />
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="input" />
          <input type="text" placeholder="Notas (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} className="input md:col-span-2" />
          <button onClick={fetchPreview} className="btn-secondary">Previsualizar</button>
          <button onClick={confirmCloseout} disabled={confirming || (preview?.counts.total ?? 0) === 0} className="btn-primary disabled:opacity-50">Confirmar Cierre</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Desde</p>
          <p className="text-sm font-medium">{preview?.range.fromAt ? new Date(preview!.range.fromAt).toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Hasta</p>
          <p className="text-sm font-medium">{preview ? new Date(preview.range.toAt).toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600"># Pagos</p>
          <p className="text-2xl font-bold">{preview?.counts.total ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total General</p>
          <p className="text-2xl font-bold text-green-600">${(totals?.totalOverall ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Efectivo</p>
          <p className="text-2xl font-bold">${(totals?.totalCash ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">QR</p>
          <p className="text-2xl font-bold">${(totals?.totalQR ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Tarjeta</p>
          <p className="text-2xl font-bold">${(totals?.totalCard ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">Cargando...</td></tr>
            ) : (preview?.payments?.length ?? 0) === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">No hay pagos pendientes de cierre</td></tr>
            ) : (
              preview!.payments.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm">{p.id}</td>
                  <td className="px-4 py-2 text-sm">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm">{p.method}</td>
                  <td className="px-4 py-2 text-sm font-semibold">${Number(p.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashierCloseout;
