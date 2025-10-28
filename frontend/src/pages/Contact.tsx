import { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Mensaje enviado exitosamente. Te contactaremos pronto.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Error al enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contacto</h1>
      
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
                <p className="text-gray-600">parking@univalle.edu</p>
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Envíanos un Mensaje</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="input-field"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="input-field"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Asunto
              </label>
              <select
                id="subject"
                name="subject"
                required
                className="input-field"
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
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="input-field"
                placeholder="Escribe tu mensaje aquí..."
                value={formData.message}
                onChange={handleChange}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Mensaje'}
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
