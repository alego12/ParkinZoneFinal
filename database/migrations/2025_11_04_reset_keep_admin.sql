-- ParkingZoneUnivalle - Reset de datos operativos conservando usuario admin@parkingzone.com
-- Base de datos: MySQL 8+
-- IMPORTANTE: Hacer BACKUP antes de ejecutar.

START TRANSACTION;

-- Guardar estado de llaves foráneas y desactivarlas temporalmente
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- Manejar modo seguro de MySQL Workbench (safe updates)
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- 1) Eliminar datos en tablas hijas/operativas (orden seguro por FKs)
-- Si alguna tabla no existe en tu instancia, elimina la línea correspondiente.

-- Pagos y cierres
DELETE FROM payments WHERE id > 0;
DELETE FROM cash_closeouts WHERE id > 0;

-- Registros LPR
DELETE FROM lpr_records WHERE id > 0;

-- Reservas y vehículos
DELETE FROM reservations WHERE id > 0;
DELETE FROM vehicles WHERE id > 0;

-- (Opcional) Si tienes tablas adicionales de operaciones/auditoría, agrégalas aquí
-- DELETE FROM audit_logs;
-- DELETE FROM notifications;
-- DELETE FROM user_sessions;

-- 2) Usuarios: conservar únicamente el admin principal
DELETE FROM users WHERE email <> 'admin@parkingzone.com';

-- 3) Normalización de estado en espacios de parqueo (no se eliminan filas de configuración)
-- Coloca todos los espacios como disponibles y activos.
UPDATE parking_spaces SET status = 'available', isActive = 1;

-- 4) (Opcional) Reiniciar vistas si aplica (no obligatorio para limpieza)
-- Las vistas se definen en schema_nov2025.sql; no es necesario tocarlas aquí.

-- Reactivar llaves foráneas
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- Restaurar modo seguro
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

COMMIT;
