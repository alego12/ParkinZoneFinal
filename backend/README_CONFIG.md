# Configuración del Backend

## Error SSL resuelto ✅

El error `self-signed certificate in certificate chain` ha sido corregido.

### Qué se cambió
- `src/config/database.ts` ahora acepta certificados autofirmados cuando `DB_SSL=true`
- Se agregó `rejectUnauthorized: false` para proveedores con SSL autofirmado

## Configurar tu .env

### Opción 1: Base de datos LOCAL (desarrollo)

```bash
# Copia el ejemplo local
cp .env.local.example .env
```

Edita `.env` y ajusta la contraseña si es necesaria:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_SSL=false
```

### Opción 2: Base de datos REMOTA (producción)

```bash
# Copia el ejemplo de producción
cp .env.production.example .env
```

Las credenciales remotas ya están configuradas:
```env
DB_HOST=db30842.public.databaseasp.net
DB_NAME=db30842
DB_USER=db30842
DB_PASSWORD=3d+PcK6=Z2-z
DB_SSL=true
```

## Crear la base de datos

### Opción A: MySQL local
```bash
mysql -u root -p
CREATE DATABASE parking_zone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

mysql -u root -p parking_zone_db < ../database/schema_nov2025.sql
mysql -u root -p parking_zone_db < ../database/seed_nov2025.sql
```

### Opción B: MySQL remoto
```bash
mysql -h db30842.public.databaseasp.net -u db30842 -p db30842 < ../database/schema_nov2025.sql
mysql -h db30842.public.databaseasp.net -u db30842 -p db30842 < ../database/seed_nov2025.sql
```

### Opción C: Sequelize (automático)
El backend creará las tablas al arrancar si no existen:
```bash
npm run dev
```

## Arrancar el servidor

```bash
npm install
npm run dev
```

Deberías ver:
```
✅ Database connection established successfully.
✅ Database synchronized successfully.
🚀 Server running on port 5000
```

## Probar la API

### Health check
```bash
curl http://localhost:5000/api/health
```

### Login admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@parkingzone.com","password":"Admin123456"}'
```

Deberías recibir un token JWT.

## Troubleshooting

### Error: "Access denied for user"
- Verifica usuario y contraseña en `.env`
- Para MySQL local, asegúrate de que el usuario tenga permisos:
  ```sql
  GRANT ALL PRIVILEGES ON parking_zone_db.* TO 'root'@'localhost';
  FLUSH PRIVILEGES;
  ```

### Error: "Unknown database"
- La base no existe. Créala primero:
  ```sql
  CREATE DATABASE parking_zone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

### Error: "ECONNREFUSED"
- MySQL no está corriendo
- Windows: inicia desde Services o XAMPP
- Linux/Mac: `sudo systemctl start mysql`

### SSL issues con DB remota
- Asegúrate de tener `DB_SSL=true` en `.env`
- El código ya acepta certificados autofirmados

## Próximos pasos

1. ✅ Backend conectado a la base
2. ⏳ Implementar endpoints `/api/cashier`
3. ⏳ Ajustar timestamps server-side
4. ⏳ UI de Caja en frontend
