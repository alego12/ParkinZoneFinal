-- Limpieza de datos de prueba para ParkingZone
-- Elimina: lpr_records, reservations, vehicles, y usuarios que NO son admin
-- Conserva: usuarios con rol 'admin', espacios de parqueo, configuraciones, etc.

USE parking_zone_db;

-- Mostrar conteos antes
SELECT 'Before cleanup' AS info;
SELECT (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM vehicles) AS vehicles,
       (SELECT COUNT(*) FROM reservations) AS reservations,
       (SELECT COUNT(*) FROM lpr_records) AS lpr_records;

-- Deshabilitar restricciones para evitar conflictos por llaves foráneas
SET FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- 1) Borrar registros LPR (dependen de reservations/vehicles/users)
TRUNCATE TABLE lpr_records;

-- 2) Borrar reservaciones
TRUNCATE TABLE reservations;

-- 3) Borrar vehículos
TRUNCATE TABLE vehicles;

-- 4) Borrar usuarios que NO son administradores
DELETE FROM users WHERE role <> 'admin';

-- Rehabilitar restricciones
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
SET FOREIGN_KEY_CHECKS = 1;

-- Mostrar conteos después
SELECT 'After cleanup' AS info;
SELECT (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM vehicles) AS vehicles,
       (SELECT COUNT(*) FROM reservations) AS reservations,
       (SELECT COUNT(*) FROM lpr_records) AS lpr_records;
