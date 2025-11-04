# Guía de Pruebas - ParkingZoneUnivalle

## Checklist de preparación

### 1. Base de datos
- [ ] Base de datos creada con `schema_nov2025.sql`
- [ ] Datos semilla cargados con `seed_nov2025.sql`
- [ ] Admin password actualizado (ejecutar `fix_admin_password.sql` si es necesario)

### 2. Backend
- [ ] `.env` configurado con credenciales correctas
- [ ] `npm install` ejecutado
- [ ] `npm run dev` corriendo sin errores
- [ ] Conexión a DB exitosa (✅ Database connection established)
- [ ] Tablas sincronizadas (✅ Database synchronized)

### 3. Frontend
- [ ] `npm install` ejecutado
- [ ] `VITE_API_URL` apuntando al backend
- [ ] `npm run dev` corriendo

## Pruebas de flujo completo

### Test 1: Login Admin ✅
**Objetivo**: Verificar autenticación

1. Ir a `http://localhost:5173/login`
2. Credenciales:
   - **Email**: `admin@parkingzone.com`
   - **Password**: `Admin123456`
3. **Resultado esperado**: Login exitoso, redirección al dashboard admin

---

### Test 2: Espacios de parqueo ✅
**Objetivo**: Verificar seed de 38 espacios

1. Login como admin
2. Ir a "Gestión de Espacios" o llamar API:
   ```bash
   curl http://localhost:5000/api/parking/spaces
   ```
3. **Resultado esperado**:
   - 16 espacios Zona A (car)
   - 12 espacios Zona B (motorcycle)
   - 10 espacios Zona C (both)
   - Total: 38 espacios, todos `available`

---

### Test 3: LPR - Placa desconocida (flujo completo) ⚠️ CORREGIDO
**Objetivo**: Verificar que reserva se crea como "occupied" (no "active")

**Pasos**:
1. Login como admin o seguridad
2. Ir a "Sistema LPR"
3. En "Entrada Manual", ingresar placa desconocida: `TEST999`
4. Click "Procesar"
5. Se abre modal "Nuevo Cliente"
6. Completar datos:
   - Nombre: Test
   - Apellido: Usuario
   - Email: test999@example.com
   - Teléfono: +591-99999999
   - Modelo vehículo: Toyota Corolla
   - Color: Blanco
7. Click "Crear Usuario y Dar Acceso"

**Resultado esperado**:
- ✅ Usuario creado con rol `client`
- ✅ Vehículo creado vinculado al usuario
- ✅ Reserva creada con status **`occupied`** (no `active`)
- ✅ Espacio asignado marcado como `occupied`
- ✅ LPR record creado con status `processed`
- ✅ Toast: "Usuario y vehículo creados. Vehículo TEST999 ingresó a plaza A1"

**Verificación en DB**:
```sql
-- Verificar reserva
SELECT id, vehicleId, parkingSpaceId, status, startTime, endTime 
FROM reservations 
WHERE vehicleId = (SELECT id FROM vehicles WHERE plate = 'TEST999')
ORDER BY createdAt DESC LIMIT 1;
-- Debe mostrar status = 'occupied', no 'active'

-- Verificar espacio
SELECT id, spaceNumber, status 
FROM parking_spaces 
WHERE id = (SELECT parkingSpaceId FROM reservations WHERE vehicleId = (SELECT id FROM vehicles WHERE plate = 'TEST999') ORDER BY createdAt DESC LIMIT 1);
-- Debe mostrar status = 'occupied'
```

---

### Test 4: LPR - Vehículo existente sin reserva ⚠️ CORREGIDO
**Objetivo**: Entrada automática de vehículo conocido

**Pasos**:
1. Crear un vehículo manualmente o usar uno del test anterior
2. Asegurarse que NO tiene reserva activa
3. En "Entrada Manual", ingresar placa existente: `TEST999`
4. Click "Procesar"

**Resultado esperado**:
- ✅ Vehículo reconocido
- ✅ Reserva creada automáticamente con status **`occupied`**
- ✅ Plaza asignada automáticamente
- ✅ Toast: "Vehículo TEST999 ingresó automáticamente a plaza XX"

---

### Test 5: LPR - Vehículo con reserva previa
**Objetivo**: Vincular entrada con reserva existente

**Pasos**:
1. Como cliente, crear una reserva futura (status `active`)
2. Como seguridad, ingresar la placa del vehículo reservado
3. Click "Procesar"

**Resultado esperado**:
- ✅ Reserva cambia de `active` a `occupied`
- ✅ Plaza cambia de `reserved` a `occupied`
- ✅ Toast: "Vehículo XXX ingresó a su reserva (espacio YY)"

---

### Test 6: Salida de vehículo
**Objetivo**: Completar reserva y liberar espacio

**Pasos**:
1. Ir a "Reservas Activas"
2. Seleccionar una reserva con status `occupied`
3. Click "Marcar Salida" o "Completar"

**Resultado esperado**:
- ✅ Reserva cambia a status `completed`
- ✅ `endTime` se asigna con timestamp actual
- ✅ Plaza cambia a `available`
- ✅ Toast: "Vehículo XXX salió. Plaza YY liberada"

---

### Test 7: Módulo de Caja (pendiente implementación)
**Objetivo**: Registrar pagos y realizar cierre

**Pasos** (cuando esté implementado):
1. Login como admin o cashier
2. Ir a "Caja"
3. Registrar pago:
   - Monto: 50.00
   - Método: cash
   - Referencia: (opcional)
4. Ver resumen del día
5. Ejecutar cierre de caja
6. Verificar historial de cierres

**Resultado esperado**:
- ✅ Pago registrado en `payments`
- ✅ Resumen muestra totales por método
- ✅ Cierre crea registro en `cash_closeouts`
- ✅ Pagos vinculados a `closeoutId`

---

## Pruebas de API (con curl/Postman)

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@parkingzone.com","password":"Admin123456"}'
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Espacios disponibles
```bash
curl http://localhost:5000/api/parking/spaces \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Crear vehículo (como admin)
```bash
curl -X POST http://localhost:5000/api/security/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "plate": "TEST123",
    "model": "Toyota Corolla",
    "color": "Blanco",
    "type": "car"
  }'
```

---

## Casos de error comunes

### Login falla
- **Causa**: Hash de password incorrecto
- **Solución**: Ejecutar `database/fix_admin_password.sql`

### SSL certificate error
- **Causa**: DB remota con certificado autofirmado
- **Solución**: Verificar `DB_SSL=true` en `.env` y que `database.ts` tenga `rejectUnauthorized: false`

### Reserva creada como "active" en lugar de "occupied"
- **Causa**: Bug corregido en LPRManagement.tsx líneas 193 y 288
- **Solución**: Verificar que el código tenga `status: 'occupied'` en esas líneas

### No hay espacios disponibles
- **Causa**: Todos ocupados o no se cargó el seed
- **Solución**: Ejecutar `seed_nov2025.sql` de nuevo o liberar espacios manualmente

---

## Checklist de estados correctos

### Estados de Reservation
- `active`: Reserva futura confirmada, espacio `reserved`, vehículo aún no ha llegado
- `occupied`: Vehículo físicamente en el estacionamiento, espacio `occupied`
- `completed`: Vehículo salió, espacio `available`, `endTime` asignado
- `cancelled`: Reserva cancelada antes de uso

### Estados de ParkingSpace
- `available`: Libre para reservar o asignar
- `reserved`: Reserva futura confirmada (status `active`)
- `occupied`: Vehículo actualmente estacionado (status `occupied`)
- `maintenance`: Fuera de servicio

### Estados de LPRRecord
- `pending`: Esperando procesamiento manual
- `matched`: Vehículo/reserva encontrada
- `no_match`: No se encontró coincidencia
- `processed`: Procesado exitosamente
- `vehicle_created`: Vehículo nuevo creado

---

## Reporte de bugs

Si encuentras un bug durante las pruebas:

1. Anotar el paso exacto donde falló
2. Capturar log del backend (terminal)
3. Capturar error del frontend (consola del navegador F12)
4. Verificar estado en DB con queries SQL
5. Reportar con toda la información anterior

---

## Próximos pasos de desarrollo

- [ ] Implementar módulo de Caja (endpoints + UI)
- [ ] Ajustar timestamps server-side en todos los endpoints
- [ ] Implementar zona horaria La Paz en frontend
- [ ] E2E tests automatizados
- [ ] Despliegue a producción
