import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import { Loader2, Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <p className="text-gray-600 font-medium mt-4">Verificando autenticación...</p>
          <p className="text-sm text-gray-500 mt-2">Por favor espera</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
