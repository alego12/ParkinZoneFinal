import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Map, 
  Users, 
  Shield, 
  Car, 
  Calendar,
  MessageCircle,
  LogOut,
  Menu,
  X,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'security', 'cashier', 'client'] },
    { name: 'Mapa de Parqueo', href: '/map', icon: Map, roles: ['admin', 'security', 'cashier', 'client'] },
    { name: 'Contacto', href: '/contact', icon: MessageCircle, roles: ['admin', 'security', 'cashier', 'client'] },
  ];

  const adminNavigation = [
    { name: 'Panel Admin', href: '/admin', icon: Shield, roles: ['admin'] },
    { name: 'Gestión de Usuarios', href: '/admin/users', icon: Users, roles: ['admin'] },
    { name: 'Pagos', href: '/admin/payments', icon: DollarSign, roles: ['admin'] },
    { name: 'Reportes de Caja', href: '/admin/closeouts', icon: DollarSign, roles: ['admin'] },
  ];

  const securityNavigation = [
    { name: 'Panel Seguridad', href: '/security', icon: Shield, roles: ['security', 'admin'] },
    { name: 'LPR - Gestión Placas', href: '/security/lpr', icon: Shield, roles: ['security', 'admin'] },
  ];

  const cashierNavigation = [
    { name: 'Panel Caja', href: '/cashier', icon: Shield, roles: ['cashier'] },
    { name: 'Mis Pagos', href: '/cashier/payments', icon: DollarSign, roles: ['cashier'] },
    { name: 'Cierre de Caja', href: '/cashier/closeout', icon: DollarSign, roles: ['cashier'] },
  ];

  const clientNavigation = [
    { name: 'Panel Cliente', href: '/client', icon: Car, roles: ['client'] },
    { name: 'Mis Vehículos', href: '/client/vehicles', icon: Car, roles: ['client'] },
    { name: 'Mis Reservas', href: '/client/reservations', icon: Calendar, roles: ['client'] },
  ];

  const allNavigation = [...navigation, ...adminNavigation, ...securityNavigation, ...cashierNavigation, ...clientNavigation];

  const filteredNavigation = allNavigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity ${sidebarOpen ? 'block opacity-100' : 'hidden opacity-0'}`}>
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-2xl">
          <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🅿</span>
              <span>ParkingZone</span>
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    {item.name}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🅿</span>
              <span>ParkingZone</span>
            </h1>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    {item.name}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-4 ml-auto">
            <div className="text-sm text-gray-700 flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">Bienvenido</p>
              </div>
              <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                user?.role === 'admin' 
                  ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' 
                  : user?.role === 'security'
                  ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
                  : user?.role === 'cashier'
                  ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300'
                  : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
              }`}>
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'security' ? 'Seguridad' :
                 user?.role === 'cashier' ? 'Caja' : 'Cliente'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
