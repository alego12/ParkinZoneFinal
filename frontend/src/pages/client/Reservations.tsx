import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Reservation } from '../../types';
import { Calendar, Clock, MapPin, Car, CheckCircle, XCircle, AlertCircle, RefreshCw, DollarSign, Loader2, Bike } from 'lucide-react';
import toast from 'react-hot-toast';

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await api.reservations.getAll();
      setReservations(response.data.reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Error al cargar las reservas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-300',
      completed: 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border border-green-300',
      cancelled: 'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 border border-red-300',
      occupied: 'bg-gradient-to-r from-orange-100 to-amber-200 text-orange-800 border border-orange-300',
    };
    
    const labels = {
      active: 'Activa',
      completed: 'Completada',
      cancelled: 'Cancelada',
      occupied: 'Ocupada',
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${colors[status as keyof typeof colors] || 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'}`}>
        {getStatusIcon(status)}
        <span>{labels[status as keyof typeof labels] || status}</span>
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const colors = {
      paid: 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border border-green-300',
      pending: 'bg-gradient-to-r from-yellow-100 to-amber-200 text-yellow-800 border border-yellow-300',
      refunded: 'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 border border-red-300',
    };
    
    const labels = {
      paid: 'Pagado',
      pending: 'Pendiente',
      refunded: 'Reembolsado',
    };
    
    return (
      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${colors[status as keyof typeof colors] || 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-semibold text-gray-600">Cargando reservas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Reservas</h1>
            <p className="text-sm text-gray-600 mt-1">Historial de todas tus reservas</p>
          </div>
        </div>
        <button
          onClick={() => fetchReservations(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        {reservations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No tienes reservas
            </h3>
            <p className="text-gray-600 mb-6 font-medium">
              Crea tu primera reserva desde el mapa de parqueo
            </p>
            <button
              onClick={() => window.location.href = '/map'}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold transform hover:scale-105 active:scale-95 mx-auto"
            >
              <MapPin className="h-4 w-4" />
              Crear Reserva
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Reserva
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Vehículo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Espacio
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Período
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Monto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                    Pago
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            Reserva #{reservation.id}
                          </div>
                          <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservation.createdAt).toLocaleDateString('es-CO', { 
                              day: '2-digit', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg">
                          {reservation.vehicle?.type === 'motorcycle' ? (
                            <Bike className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Car className="h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {reservation.vehicle?.model}
                          </div>
                          <div className="text-xs text-gray-500 font-mono font-medium">
                            {reservation.vehicle?.plate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {reservation.parkingSpace?.spaceNumber}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Zona {reservation.parkingSpace?.zone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-gray-900">
                          {new Date(reservation.startTime).toLocaleDateString('es-CO', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(reservation.startTime).toLocaleTimeString('es-CO', { 
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {reservation.endTime && (
                            <>
                              <span className="mx-1">-</span>
                              <span>
                                {new Date(reservation.endTime).toLocaleTimeString('es-CO', { 
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </>
                          )}
                          {!reservation.endTime && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-300">
                              En curso
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-bold text-gray-900">
                          ${typeof reservation.totalAmount === 'number' ? reservation.totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : reservation.totalAmount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reservation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(reservation.paymentStatus || 'pending')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics */}
      {reservations.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Total Reservas</p>
                <p className="text-4xl font-bold text-blue-600 mt-1">{reservations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Completadas</p>
                <p className="text-4xl font-bold text-green-600 mt-1">
                  {reservations.filter(r => r.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-indigo-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Activas</p>
                <p className="text-4xl font-bold text-indigo-600 mt-1">
                  {reservations.filter(r => r.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl shadow-lg border-2 border-red-200 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-md">
                <XCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Canceladas</p>
                <p className="text-4xl font-bold text-red-600 mt-1">
                  {reservations.filter(r => r.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservations;
