import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, Loader2, X, Send, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
            <span className="text-3xl text-white">🅿</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accede a tu cuenta de ParkingZone
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar Sesión
                </>
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
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h3>
              <button
                onClick={() => {
                  setForgotOpen(false);
                  setRecoverStep(1);
                  setRecoverEmail('');
                  setRecoverCode('');
                  setNewPass('');
                  setNewPass2('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {recoverStep === 1 ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">Ingresa tu correo y te enviaremos un código de 6 dígitos. El código expira en 15 minutos.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      placeholder="tu@correo.com"
                      value={recoverEmail}
                      onChange={(e) => setRecoverEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {forgotSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar código
                      </>
                    )}
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
                    className="flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setRecoverStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resetSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        Actualizar contraseña
                      </>
                    )}
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
