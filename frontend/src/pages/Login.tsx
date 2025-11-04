import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverStep, setRecoverStep] = useState<1 | 2>(1);
  const [recoverCode, setRecoverCode] = useState('');
  const [resetDebug, setResetDebug] = useState<any>(null);
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail) {
      toast.error('Ingresa tu correo');
      return;
    }
    try {
      setForgotSubmitting(true);
      const res = await api.auth.forgotPassword(recoverEmail);
      const dbg = (res as any)?.data?.debug;
      if (dbg) {
        console.log('[ForgotPassword][DEV] Código:', dbg.code, 'TXT:', dbg.infoFilePath);
        setResetDebug(dbg);
        // Autocompleta el código y muéstralo en un toast para pruebas
        setRecoverCode(String(dbg.code || ''));
        try { toast.success(`Código de verificación: ${dbg.code}`); } catch {}
      } else {
        setResetDebug(null);
      }
      toast.success('Si el correo existe, se envió un código (vigente 15 minutos)');
      setRecoverStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo enviar el código');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPass !== newPass2) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (recoverCode.trim().length !== 6) {
      toast.error('El código debe tener 6 dígitos');
      return;
    }
    try {
      setResetSubmitting(true);
      await api.auth.resetPassword({ email: recoverEmail, code: recoverCode.trim(), newPassword: newPass });
      toast.success('Contraseña actualizada. Inicia sesión');
      setForgotOpen(false);
      // Prefill email
      setEmail(recoverEmail);
      setPassword('');
      setRecoverEmail('');
      setRecoverCode('');
      setNewPass('');
      setNewPass2('');
      setRecoverStep(1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <span className="text-2xl">🅿</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accede a tu cuenta de ParkingZone
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Regístrate aquí
              </Link>
            </span>
            <div className="mt-3">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-500"
                onClick={() => {
                  setRecoverEmail(email);
                  setForgotOpen(true);
                  setRecoverStep(1);
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recuperar contraseña</h3>
              <button
                onClick={() => {
                  setForgotOpen(false);
                  setRecoverStep(1);
                  setRecoverEmail('');
                  setRecoverCode('');
                  setNewPass('');
                  setNewPass2('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {recoverStep === 1 ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <p className="text-sm text-gray-600">Ingresa tu correo y te enviaremos un código de 6 dígitos. El código expira en 15 minutos.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {forgotSubmitting ? 'Enviando…' : 'Enviar código'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetDebug && (
                  <div className="p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
                    <div className="mb-2">Modo dev: se generó un TXT local con el código.</div>
                    <div className="mb-2">Código: <span className="font-mono tracking-widest">{resetDebug.code}</span></div>
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-blue-600 text-white"
                      onClick={() => {
                        const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
                        const url = `${base}/auth/forgot-password/latest-export?email=${encodeURIComponent(recoverEmail)}`;
                        window.open(url, '_blank');
                      }}
                    >
                      Descargar TXT
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de 6 dígitos</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tracking-widest"
                    value={recoverCode}
                    onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newPass2}
                    onChange={(e) => setNewPass2(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-between">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    onClick={() => setRecoverStep(1)}
                  >
                    ← Volver
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {resetSubmitting ? 'Actualizando…' : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
