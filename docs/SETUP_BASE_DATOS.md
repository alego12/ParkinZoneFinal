# Setup Base de Datos (Nov 2025)

## Credenciales de acceso

### Admin por defecto
- **Email**: `admin@parkingzone.com`
- **Password**: `Admin123456`
- **Rol**: admin

## Archivos de base de datos

### Esquema y datos
- **Schema completo**: `database/schema_nov2025.sql`
- **Seed (datos iniciales)**: `database/seed_nov2025.sql`
- **Migraciones**: `database/migrations/`

### Contenido del seed
- 1 usuario admin
- 7 horarios (Lunes-Viernes 08:00-18:00, Sábado-Domingo 09:00-17:00)
- 38 espacios de parqueo:
  - **Zona A**: 16 espacios para autos (tarifa: $3.00 autos, $2.00 motos)
  - **Zona B**: 12 espacios para motos (tarifa: $2.50 autos, $1.50 motos)
  - **Zona C**: 10 espacios mixtos (tarifa: $3.50 autos, $2.50 motos)

## Cómo crear la base de datos

### Opción 1: Con MySQL CLI (recomendado)
```bash
# Crear base de datos
mysql -h <HOST> -u <USER> -p
CREATE DATABASE parking_zone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

# Importar esquema
mysql -h <HOST> -u <USER> -p parking_zone_db < database/schema_nov2025.sql

# Importar datos iniciales
mysql -h <HOST> -u <USER> -p parking_zone_db < database/seed_nov2025.sql
```

### Opción 2: Con Sequelize (backend genera tablas)
```bash
cd backend
npm install
npm run dev
# Sequelize sync creará las tablas automáticamente
```

## Estado del backend

### Modelos Sequelize alineados con schema ✅
- **User** - role ahora incluye 'cashier'
- **Vehicle** - userId nullable (SET NULL on delete)
- **Schedule** - overtimeRate, indefiniteRate
- **ParkingSpace** - scheduleId, carRate, motorcycleRate
- **Reservation** - startTime/endTime con timestamps server-side
- **LPRRecord** - detectedAt con timestamp server-side
- **Payment** ✨ NUEVO - registro de pagos (cash/qr/card)
- **CashCloseout** ✨ NUEVO - cierres de caja

### Asociaciones actualizadas
- User → Payment (recordedBy)
- User → CashCloseout (closedBy)
- Payment → Reservation (opcional)
- Payment → CashCloseout (closeoutId)
- Todas las FK con ON DELETE apropiadas

### Variables .env necesarias
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=parking_zone_db
DB_USER=root
DB_PASSWORD=tu_password

# Si usas DB remota con SSL
DB_SSL=true
# o si tu proveedor requiere URL
DB_URL=mysql://user:pass@host:3306/db

# JWT
JWT_SECRET=secreto_largo_y_aleatorio
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development

# CORS (ajusta al puerto de tu frontend)
CORS_ORIGIN=http://localhost:5173

# SMTP (recuperación de contraseña)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
```

## Próximos pasos

### Backend
1. ✅ Modelos alineados con schema
2. ⏳ Endpoints `/api/cashier` (payments, summary, closeouts)
3. ⏳ Ajustar timestamps server-side en endpoints de reservations/vehicles/lpr

### Frontend
1. ⏳ UI de módulo Caja (registrar pagos, ver resumen)
2. ⏳ UI de Cierre de caja (ejecutar cierre, historial)
3. ⏳ Actualizar display de fechas a zona local (America/La_Paz)

## Zona horaria

- **Almacenamiento**: UTC en la base de datos
- **Display**: America/La_Paz (UTC-04:00) en el frontend
- **Backend**: timestamps asignados por servidor, no aceptar del cliente

## Notas importantes

- La contraseña `Admin123456` es temporal. Cambiarla en producción.
- El hash bcrypt tiene 12 rounds (balance seguridad/performance).
- Todos los timestamps se guardan en UTC y se convierten a local en el cliente.
- Los pagos y cierres tienen auditoría completa (recordedBy/closedBy + timestamps).
