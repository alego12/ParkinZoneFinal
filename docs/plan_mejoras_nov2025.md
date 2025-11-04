# Plan de mejoras (Nov 2025)

Fecha: 2025-11-03
Alcance: Ajustes de timestamps de vehículos, Módulo de Caja (ingresos diarios y cierres), y MVP simplificado de Cámara/LPR. El flujo de recuperación de contraseña ya funciona y no forma parte de este alcance.

## Objetivos

- Corregir timestamps de registro/ingreso/salida de vehículos para que los asigne el servidor y se muestren coherentes.
- Implementar Módulo de Caja: pagos diarios con desglose por método, detalle por transacción y cierres (reset controlado del contador).
- Entregar un MVP estable de Cámara/LPR con flujo manual/semiautomático mientras se estabiliza la integración avanzada.

---

## 1) Timestamps de vehículos (server-driven)

- Problema: formatos/hora inconsistentes y dependientes del cliente.
- Lineamientos:
  - Generar y persistir timestamps únicamente en el backend (UTC). Ignorar timestamps del cliente.
  - Campos relevantes: `createdAt`, `updatedAt` (automáticos), y específicos como `entryAt`, `exitAt`, `paidAt` en reservas/LPR.
  - Serializar en ISO8601. El frontend presenta en zona local con formato uniforme.
- Cambios:
  - Backend: usar `new Date()` o `Sequelize.fn('NOW')` al crear/actualizar; validar que no se acepten fechas del cliente.
  - Frontend: remover envíos manuales de fecha/hora; usar `date-fns` solo para mostrar.
- Criterios de aceptación:
  - Las operaciones reflejan la hora exacta del momento de la acción.
  - No hay desfases de minutos/zonas. Muestra coherente en todas las vistas.

---

## 2) Módulo de Caja / Control de ingresos y cierres

### 2.1 Modelo de datos

- `payments`
  - `id`, `userId` (nullable), `reservationId` (nullable), `amount` DECIMAL(10,2), `method` ENUM(`cash`,`qr`,`card`), `reference` VARCHAR(100), `notes` TEXT, `recordedBy` (userId del cajero), `createdAt`.
- `cash_closeouts`
  - `id`, `fromAt`, `toAt`, `totalCash`, `totalQR`, `totalCard`, `totalOverall`, `closedBy` (adminId), `closedAt`, `notes`.
- Índices por `createdAt`, `method`, `recordedBy` y `closedAt`.

### 2.2 Endpoints Backend (prefijo sugerido `/api/cashier`)

- Pagos
  - `POST /payments` crear pago
  - `GET /payments` listar con filtros (fecha, método, usuario, reservationId, recordedBy)
  - `GET /summary/today` resumen del día (por método y total)
- Cierres
  - `POST /closeouts` ejecutar cierre (rol `admin` o `cashier` con permiso)
  - `GET /closeouts` listar cierres
  - `GET /closeouts/:id` detalle
- Seguridad y auditoría
  - Roles: `cashier`, `admin`.
  - Registrar `recordedBy`, `closedBy`, IP y timestamps.

### 2.3 UI Frontend

- Pantalla “Caja” (rol `cashier` y `admin` de solo lectura)
  - Registrar pago: monto, método (cash/qr/card), cliente (buscador), referencia/motivo, reserva (opcional), notas.
  - Tabla “Pagos del día” con filtros.
  - Resumen: Efectivo, QR, Card, Total.
- Pantalla “Cierre de caja” (rol `admin`)
  - Ver totales acumulados del rango (por defecto, día actual).
  - Botón “Cerrar caja / Retirar dinero”: crea registro de cierre; el siguiente pago inicia nuevo periodo.
  - Historial de cierres con detalle y export (CSV/PDF opcional).

### 2.4 Criterios de aceptación

- Totales diarios correctos por método y total general.
- Cierre registra correctamente el periodo y resetea el acumulado para el siguiente rango.
- Permisos aplicados; auditoría completa.

---

## 3) Cámara / LPR — MVP simplificado

- Estrategia: mantener estable una versión manual/semiautomática mientras se refina la integración avanzada.
- Frontend:
  - Captura manual/carga de imagen.
  - OCR con `tesseract.js` en el cliente; el operador puede corregir la placa antes de enviar.
- Backend:
  - Persistir `LPRRecord` con `plate`, `detectedText`, `confidence` (si aplica), `processedBy`, y timestamp server-side.
  - Reutilizar endpoints montados bajo `/api/lpr` (`/records`, `/:id`, `/:id/process`, etc.).
- Criterios de aceptación:
  - Flujo estable para registrar y consultar detecciones de placas, sin dependencias externas pesadas.

---

## 4) Migraciones/SQL y modelos

- Crear scripts:
  - `database/add_payments.sql`
  - `database/add_cash_closeouts.sql`
- Backend:
  - Modelos Sequelize `Payment` y `CashCloseout` + asociaciones (User/Reservation).
  - Exponer en `models/index.ts` y sincronizar.

---

## 5) Pruebas

- Unitarias (backend): pagos (sumas, filtros), cierres (rangos), serialización de timestamps.
- Integración: endpoints de caja con DB real.
- E2E: registrar pagos (cash/qr/card), ver resumen, cerrar caja y validar nuevo periodo; timestamps correctos en vehículos y LPR.

---

## 6) Configuración y documentación

- `.env` backend: revisar `CORS_ORIGINS` (puerto Vite), y variables existentes.
- Frontend: definir `VITE_API_URL` si backend no está en `http://localhost:5000/api`.
- README: agregar secciones de Caja (uso y permisos) y lineamientos de timestamps.

---

## 7) Cronograma estimado

- Día 1–2: Timestamps server-side (BE/FE) + pruebas.
- Día 2–5: Módulo de Caja (modelado, endpoints, UI, pruebas).
- Día 5–6: MVP LPR y pruebas E2E.
- Día 6–7: Documentación, ajustes finales y despliegue.

---

## 8) Riesgos y mitigación

- Conciliación de cierres: definir claramente periodo (`fromAt`/`toAt` por cierre) para evitar doble conteo.
- Zonas horarias: guardar en UTC, mostrar en local y probar husos distintos.
- Permisos: validar rutas con roles; registrar `recordedBy`/`closedBy` sistemáticamente.
