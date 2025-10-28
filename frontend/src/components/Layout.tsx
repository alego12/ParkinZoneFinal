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
  X
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
  ];

  const securityNavigation = [
    { name: 'Panel Seguridad', href: '/security', icon: Shield, roles: ['security', 'admin'] },
    { name: 'LPR - Gestión Placas', href: '/security/lpr', icon: Shield, roles: ['security', 'admin'] },
  ];

  const cashierNavigation = [
    { name: 'Panel Caja', href: '/cashier', icon: Shield, roles: ['cashier'] },
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
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900">🅿 ParkingZone</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
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
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-gray-900">🅿 ParkingZone</h1>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              Bienvenido, <span className="font-medium">{user?.firstName} {user?.lastName}</span>
              <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'security' ? 'Seguridad' :
                 user?.role === 'cashier' ? 'Caja' : 'Cliente'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-400 hover:text-gray-600"
            >
              <LogOut className="h-5 w-5" />
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
