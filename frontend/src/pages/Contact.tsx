import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, Loader2, User, MessageSquare, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const Contact: React.FC = () => {
  const contactEmail = (import.meta as any).env?.VITE_CONTACT_EMAIL || 'parking@univalle.edu';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const downloadFile = (filename: string, base64Content: string, mimeType: string) => {
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.contact.send({ ...formData, devMode });
      
      // Si está en modo desarrollo, descargar los archivos
      if (devMode && response.data.devMode && response.data.files) {
        const { thankYou, notification } = response.data.files;
        downloadFile(thankYou.filename, thankYou.content, thankYou.mimeType);
        // Pequeño delay para que el navegador procese la primera descarga
        setTimeout(() => {
          downloadFile(notification.filename, notification.content, notification.mimeType);
        }, 300);
        toast.success('Archivos descargados en modo desarrollo.');
      } else {
        toast.success('Mensaje enviado exitosamente. Te contactaremos pronto.');
      }
      
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al enviar el mensaje. Inténtalo de nuevo.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacto</h1>
        <p className="text-gray-600 mt-2">Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos pronto.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Información de Contacto</h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <MapPin className="h-6 w-6 text-primary-600 mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Dirección</h3>
                <p className="text-gray-600">
                  Universidad Privada del Valle<br />
                  Campus Universitario<br />
                  Cochabamba, Bolivia
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-6 w-6 text-primary-600 mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Teléfono</h3>
                <p className="text-gray-600">+591 4 1234567</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Mail className="h-6 w-6 text-primary-600 mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Email</h3>
                <p className="text-gray-600">{contactEmail}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="h-6 w-6 text-primary-600 mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Horarios de Atención</h3>
                <p className="text-gray-600">
                  Lunes - Viernes: 7:00 AM - 10:00 PM<br />
                  Sábados: 8:00 AM - 6:00 PM<br />
                  Domingos: 9:00 AM - 5:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Envíanos un Mensaje
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="tu@correo.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Asunto
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="subject"
                  name="subject"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors appearance-none bg-white"
                  value={formData.subject}
                  onChange={handleChange}
                >
                  <option value="">Selecciona un asunto</option>
                  <option value="queja">Queja</option>
                  <option value="sugerencia">Sugerencia</option>
                  <option value="soporte">Soporte Técnico</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors resize-none"
                  placeholder="Escribe tu mensaje aquí..."
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex items-start">
              <input
                type="checkbox"
                id="devMode"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="devMode" className="ml-2 block text-sm text-gray-700">
                Modo desarrollo (descargar archivos en lugar de enviar correos)
              </label>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {devMode ? 'Generando archivos...' : 'Enviando...'}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Enviar Mensaje
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reglamento del Estacionamiento</h2>
        <div className="prose max-w-none text-gray-600">
          <ul className="list-disc list-inside space-y-2">
            <li>El estacionamiento está disponible las 24 horas del día, los 7 días de la semana.</li>
            <li>Los usuarios deben respetar los espacios asignados y no ocupar espacios reservados.</li>
            <li>Está prohibido dejar vehículos abandonados por más de 48 horas.</li>
            <li>Los usuarios son responsables de la seguridad de sus vehículos y pertenencias.</li>
            <li>En caso de emergencias, contactar inmediatamente al personal de seguridad.</li>
            <li>El no cumplimiento de las normas puede resultar en la pérdida del acceso al estacionamiento.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Contact;
