# 🅿️ ParkingZoneUnivalle - Sistema de Gestión de Estacionamiento

## 📋 Descripción General

**ParkingZoneUnivalle** es un sistema completo de gestión de estacionamiento universitario que incluye:
- 🎥 **Sistema LPR (License Plate Recognition)** con OCR avanzado
- 🚗 **Gestión de vehículos y reservas**
- 👥 **Múltiples roles de usuario** (Admin, Cliente, Seguridad)
- 📊 **Dashboard en tiempo real**
- 🔐 **Autenticación JWT**

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React + TS    │◄──►│   Node.js       │◄──►│   MySQL         │
│   Tailwind CSS  │    │   Express       │    │   Sequelize     │
│   Tesseract.js  │    │   Socket.io     │    │   JWT Auth      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- npm o yarn

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd ParkingZoneUnivalle
```

### 2. Instalar Dependencias
```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### 3. Configurar Base de Datos
```bash
# Crear base de datos MySQL
mysql -u root -p
CREATE DATABASE parking_zone_db;

# Ejecutar scripts de inicialización (mínimo requerido)
mysql -u root -p parking_zone_db < database/init.sql
  
# Habilitar recuperación de contraseña (tabla de códigos)
mysql -u root -p parking_zone_db < database/create_password_resets.sql
  
# (Opcional) Limpiar datos de prueba existentes
# mysql -u root -p < database/cleanup_reset_data.sql
  
# (Opcional) Crear usuario admin por defecto
# Esto insertará un admin con email admin@test.com y password Admin1234*
mysql -u root -p parking_zone_db < database/create_admin_user.sql
```

### 4. Configurar Variables de Entorno
```bash
# Backend
cd backend
cp env.example .env
```

Editar `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=parking_zone_db
JWT_SECRET=tu_jwt_secret_muy_seguro
```

### 5. Ejecutar el Sistema
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 👥 Roles de Usuario

### 🔑 Administrador
- **Usuario**: `admin@test.com`
- **Contraseña**: `Admin1234*`
- **Permisos**: Gestión completa del sistema

### 👤 Cliente
- Permisos: Reservas y gestión de vehículos

### 🛡️ Seguridad
- Permisos: Sistema LPR y control de acceso

### 💼 Caja (Cashier)
- Permisos: Operaciones de caja y monitoreo general

## 🎥 Sistema LPR (License Plate Recognition)

### Características Principales
- **🎥 Cámara en tiempo real** con acceso a dispositivos
- **🔍 OCR avanzado** con Tesseract.js
- **🐍 Python OCR** integrado para mayor precisión
- **✂️ Recorte inteligente** de caracteres
- **📊 Detección automática** de placas bolivianas

### Flujo de Trabajo LPR
```
1. 📹 Iniciar Cámara → 2. ⏸️ Pausar y Capturar → 3. 🔍 Detectar Placa → 4. ✅ Procesar Resultado
```

### Formatos de Placa Soportados
- **Boliviano**: `1852PHD` (4 dígitos + 3 letras)
- **Internacional**: `ABC1234`, `123ABC`, etc.

### Configuración Avanzada
- **Región de Interés**: Detección automática del área de la placa
- **Preprocesamiento**: Filtros específicos para placas bolivianas
- **Múltiples Intentos**: 4 configuraciones OCR diferentes
- **Confianza Mínima**: 5% para aceptar detecciones

## 🚗 Gestión de Vehículos y Reservas

### Tipos de Reserva
- **🕐 Reserva Definida**: Con hora de entrada y salida específicas
- **♾️ Reserva Indefinida**: Sin hora de salida (hasta cancelación manual)

### Estados de Espacio
- **🟢 Disponible**: Espacio libre para reservar
- **🟡 Reservado**: Espacio asignado pero no ocupado
- **🔴 Ocupado**: Vehículo presente en el espacio
- **⚫ Inactivo**: Espacio fuera de servicio

### Cálculo de Tarifas
```javascript
// Reserva Definida
totalAmount = baseRate + (horas_extra * overtimeRate)

// Reserva Indefinida  
totalAmount = baseRate + indefiniteRate
```

## 📊 Dashboard y Monitoreo

### Panel de Administrador
- **📈 Estadísticas** de ocupación en tiempo real
- **👥 Gestión de usuarios** y roles
- **🚗 Registro de vehículos** y placas
- **📋 Historial completo** de reservas

### Panel de Cliente
- **🗺️ Mapa interactivo** de espacios disponibles
- **📅 Mis reservas** activas y históricas
- **🚙 Mis vehículos** registrados
- **⏰ Notificaciones** de vencimiento

### Panel de Seguridad
- **🎥 Sistema LPR** en tiempo real
- **🔍 Detección automática** de placas
- **📋 Registro de accesos** y salidas
- **🚨 Alertas** de vehículos no autorizados

## 🔧 API Endpoints Principales

### Autenticación
```http
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
```

### Vehículos
```http
GET    /api/vehicles
POST   /api/vehicles
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
```

### Reservas
```http
GET    /api/reservations
POST   /api/reservations
PUT    /api/reservations/:id
DELETE /api/reservations/:id
```

### Espacios de Estacionamiento
```http
GET  /api/parking/spaces
PUT  /api/parking/spaces/:id
```

### Sistema LPR
```http
GET /api/lpr/records
POST /api/lpr/detect
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **Tailwind CSS** para estilos
- **React Router** para navegación
- **Axios** para peticiones HTTP
- **Tesseract.js** para OCR
- **Socket.io Client** para tiempo real
- **React Hot Toast** para notificaciones

### Backend
- **Node.js** con Express
- **TypeScript** para tipado
- **Sequelize** como ORM
- **MySQL** como base de datos
- **JWT** para autenticación
- **Socket.io** para comunicación en tiempo real
- **Bcrypt** para hash de contraseñas
- **Express Validator** para validación

### Base de Datos
- **MySQL 8.0+**
- **Tablas principales**: users, vehicles, reservations, parking_spaces, lpr_records
- **Relaciones**: Foreign keys y asociaciones Sequelize
- **Índices**: Optimización para consultas frecuentes

## 🔒 Seguridad

### Autenticación
- **JWT Tokens** con expiración
- **Roles y permisos** granulares
- **Hash de contraseñas** con bcrypt
- **Validación de entrada** en todas las rutas

### Autorización
- **Middleware de autenticación** en rutas protegidas
- **Verificación de roles** para operaciones sensibles
- **Validación de datos** con express-validator

## 📱 Características Responsive

### Desktop (1024px+)
- **Layout de dos columnas** para LPR
- **Dashboard completo** con todas las funciones
- **Mapa interactivo** de espacios

### Tablet (768px - 1023px)
- **Layout adaptativo** con sidebar colapsable
- **Botones optimizados** para touch
- **Vista simplificada** del mapa

### Mobile (< 768px)
- **Layout de una columna** optimizado
- **Navegación por tabs** en lugar de sidebar
- **Botones grandes** para fácil interacción

## 🐛 Solución de Problemas

### Problemas Comunes

#### 1. Error de Conexión a Base de Datos
```bash
# Verificar que MySQL esté ejecutándose
mysql -u root -p

# Verificar configuración en .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=parking_zone_db
```

#### 2. Error de Permisos de Cámara
- **Chrome**: Configurar permisos en `chrome://settings/content/camera`
- **Firefox**: Configurar permisos en `about:preferences#privacy`
- **HTTPS**: Requerido para acceso a cámara en producción

#### 3. Error de Puerto en Uso
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

#### 4. Problemas de OCR
- **Iluminación**: Asegurar buena iluminación en la placa
- **Distancia**: Mantener distancia óptima (1-2 metros)
- **Ángulo**: Evitar ángulos extremos
- **Calidad**: Usar cámara de al menos 720p

## 🚀 Despliegue en Producción

### Docker (Recomendado)
```bash
# Construir y ejecutar con Docker Compose
docker-compose up -d
```

### Manual
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Servir con nginx o similar
```

### Variables de Entorno de Producción
```env
NODE_ENV=production
PORT=5000
DB_HOST=tu_host_mysql
DB_USER=tu_usuario
DB_PASSWORD=tu_password_seguro
DB_NAME=parking_zone_db
JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro
```

## 📈 Próximas Mejoras

### Funcionalidades Planificadas
- **📱 App móvil** nativa (React Native)
- **🔔 Notificaciones push** para vencimientos
- **📊 Analytics avanzados** de ocupación
- **🤖 IA mejorada** para detección de placas
- **💳 Integración de pagos** online
- **🌐 Multi-idioma** (ES/EN)

### Optimizaciones Técnicas
- **⚡ Caché Redis** para consultas frecuentes
- **📦 Microservicios** para escalabilidad
- **🔍 Elasticsearch** para búsquedas avanzadas
- **📊 Grafana** para monitoreo de sistema

## 🤝 Contribución

### Cómo Contribuir
1. **Fork** el repositorio
2. **Crear branch** para nueva funcionalidad
3. **Commit** cambios con mensajes descriptivos
4. **Push** al branch
5. **Crear Pull Request**

### Estándares de Código
- **ESLint** para JavaScript/TypeScript
- **Prettier** para formato de código
- **Conventional Commits** para mensajes
- **Tests** para nuevas funcionalidades

## 📞 Soporte

### Contacto
- **Email**: soporte@parkingzone.univalle.edu
- **Documentación**: [Wiki del Proyecto]
- **Issues**: [GitHub Issues]

### Horarios de Soporte
- **Lunes a Viernes**: 8:00 AM - 6:00 PM
- **Sábados**: 9:00 AM - 1:00 PM
- **Emergencias**: 24/7 para problemas críticos

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

**Desarrollado con ❤️ para la Universidad Privada del Valle**