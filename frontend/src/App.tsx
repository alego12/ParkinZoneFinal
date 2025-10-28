import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import SecurityDashboard from './pages/security/SecurityDashboard';
import LPRManagement from './pages/security/LPRManagement';
import ClientDashboard from './pages/client/ClientDashboard';
import Vehicles from './pages/client/Vehicles';
import Reservations from './pages/client/Reservations';
import ParkingMap from './pages/ParkingMap';
import UserManagement from './pages/admin/UserManagement';
import Contact from './pages/Contact';
import CashierDashboard from './pages/cashier/CashierDashboard';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="map" element={<ParkingMap />} />
                <Route path="contact" element={<Contact />} />
                
                {/* Admin routes */}
                <Route path="admin/*" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Routes>
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<UserManagement />} />
                    </Routes>
                  </ProtectedRoute>
                } />
                
                {/* Security routes */}
                <Route path="security/*" element={
                  <ProtectedRoute allowedRoles={['admin', 'security']}>
                    <Routes>
                      <Route index element={<SecurityDashboard />} />
                      <Route path="lpr" element={<LPRManagement />} />
                    </Routes>
                  </ProtectedRoute>
                } />

                {/* Cashier routes */}
                <Route path="cashier/*" element={
                  <ProtectedRoute allowedRoles={['cashier', 'admin']}>
                    <Routes>
                      <Route index element={<CashierDashboard />} />
                    </Routes>
                  </ProtectedRoute>
                } />
                
                {/* Client routes */}
                <Route path="client/*" element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <Routes>
                      <Route index element={<ClientDashboard />} />
                      <Route path="vehicles" element={<Vehicles />} />
                      <Route path="reservations" element={<Reservations />} />
                    </Routes>
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster position="top-right" />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
