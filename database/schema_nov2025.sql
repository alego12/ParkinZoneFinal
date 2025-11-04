-- ParkingZoneUnivalle - Esquema completo actualizado (Nov 2025)
-- MySQL 8.0+
-- Charset/Collation: utf8mb4/utf8mb4_unicode_ci

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- -----------------
-- users
-- -----------------
CREATE TABLE users (
  id          INT NOT NULL AUTO_INCREMENT,
  email       VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  password    VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  firstName   VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  lastName    VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  phone       VARCHAR(20)  COLLATE utf8mb4_unicode_ci NOT NULL,
  role        ENUM('admin','security','cashier','client') COLLATE utf8mb4_unicode_ci DEFAULT 'client',
  isActive    TINYINT(1) DEFAULT 1,
  createdAt   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- vehicles
-- -----------------
CREATE TABLE vehicles (
  id        INT NOT NULL AUTO_INCREMENT,
  userId    INT NULL,
  model     VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  plate     VARCHAR(20)  COLLATE utf8mb4_unicode_ci NOT NULL,
  color     VARCHAR(50)  COLLATE utf8mb4_unicode_ci NOT NULL,
  type      ENUM('car','motorcycle') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'car',
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_vehicles_plate (plate),
  KEY idx_vehicles_userId (userId),
  CONSTRAINT fk_vehicles_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- schedules
-- -----------------
CREATE TABLE schedules (
  id            INT NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  description   TEXT COLLATE utf8mb4_unicode_ci,
  dayOfWeek     TINYINT NOT NULL,
  startTime     TIME NOT NULL,
  endTime       TIME NOT NULL,
  isActive      TINYINT(1) DEFAULT 1,
  overtimeRate  DECIMAL(10,2) DEFAULT 2.00,
  indefiniteRate DECIMAL(10,2) DEFAULT 5.00,
  createdAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_schedules_dayOfWeek (dayOfWeek),
  KEY idx_schedules_isActive (isActive),
  CONSTRAINT schedules_chk_1 CHECK (dayOfWeek >= 0 AND dayOfWeek <= 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- parking_spaces
-- -----------------
CREATE TABLE parking_spaces (
  id           INT NOT NULL AUTO_INCREMENT,
  spaceNumber  VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  zone         VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  status       ENUM('available','occupied','maintenance','reserved') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  positionX    FLOAT NOT NULL,
  positionY    FLOAT NOT NULL,
  isActive     TINYINT(1) DEFAULT 1,
  vehicleType  ENUM('car','motorcycle','both') COLLATE utf8mb4_unicode_ci DEFAULT 'both',
  scheduleId   INT NOT NULL,
  carRate      DECIMAL(10,2) DEFAULT 2.50,
  motorcycleRate DECIMAL(10,2) DEFAULT 1.50,
  createdAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_parking_spaceNumber (spaceNumber),
  KEY idx_parking_spaces_status (status),
  KEY idx_parking_spaces_zone (zone),
  KEY idx_parking_spaces_scheduleId (scheduleId),
  CONSTRAINT fk_parking_spaces_scheduleId FOREIGN KEY (scheduleId) REFERENCES schedules(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- reservations
-- -----------------
CREATE TABLE reservations (
  id             INT NOT NULL AUTO_INCREMENT,
  userId         INT NOT NULL,
  vehicleId      INT NOT NULL,
  parkingSpaceId INT NOT NULL,
  startTime      TIMESTAMP NOT NULL,           -- asignado por servidor
  endTime        DATETIME NULL,                -- puede ser NULL para indefinida hasta completar/cancelar
  status         ENUM('active','occupied','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  totalAmount    DECIMAL(10,2) DEFAULT 0.00,   -- monto calculado
  paymentStatus  ENUM('pending','paid','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  createdAt      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reservations_userId (userId),
  KEY idx_reservations_vehicleId (vehicleId),
  KEY idx_reservations_parkingSpaceId (parkingSpaceId),
  KEY idx_reservations_status (status),
  KEY idx_reservations_startTime (startTime),
  CONSTRAINT fk_reservations_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_vehicleId FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservations_parkingSpaceId FOREIGN KEY (parkingSpaceId) REFERENCES parking_spaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- lpr_records (MVP estable)
-- -----------------
CREATE TABLE lpr_records (
  id           INT NOT NULL AUTO_INCREMENT,
  plateNumber  VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  vehicleColor VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  detectedAt   TIMESTAMP NOT NULL,             -- asignado por servidor
  imagePath    VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  confidence   FLOAT DEFAULT 0,
  status       ENUM('pending','matched','no_match','processed','vehicle_created') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  reservationId INT NULL,
  vehicleId     INT NULL,
  userId        INT NULL,
  processedBy   INT NULL,
  processedAt   TIMESTAMP NULL DEFAULT NULL,
  notes        TEXT COLLATE utf8mb4_unicode_ci,
  createdAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lpr_records_detectedAt (detectedAt),
  KEY idx_lpr_records_status (status),
  KEY idx_lpr_records_plateNumber (plateNumber),
  CONSTRAINT fk_lpr_records_reservationId FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL,
  CONSTRAINT fk_lpr_records_vehicleId FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_lpr_records_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_lpr_records_processedBy FOREIGN KEY (processedBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- NUEVO MÓDULO: Caja / Pagos y Cierres
-- ===================================================================

-- -----------------
-- cash_closeouts (cierres de caja)
-- -----------------
CREATE TABLE cash_closeouts (
  id           INT NOT NULL AUTO_INCREMENT,
  fromAt       TIMESTAMP NOT NULL,
  toAt         TIMESTAMP NOT NULL,
  totalCash    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  totalQR      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  totalCard    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  totalOverall DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closedBy     INT NOT NULL,                   -- admin que realiza el cierre
  closedAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  notes        TEXT COLLATE utf8mb4_unicode_ci,
  createdAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_closeouts_closedBy (closedBy),
  KEY idx_closeouts_range (fromAt, toAt),
  CONSTRAINT fk_closeouts_closedBy FOREIGN KEY (closedBy) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------
-- payments (pagos con asignación opcional a cierre via closeoutId)
-- -----------------
CREATE TABLE payments (
  id            INT NOT NULL AUTO_INCREMENT,
  userId        INT NULL,                      -- cliente (opcional)
  reservationId INT NULL,                      -- puede asociar si aplica
  amount        DECIMAL(10,2) NOT NULL,
  method        ENUM('cash','qr','card') COLLATE utf8mb4_unicode_ci NOT NULL,
  reference     VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL,
  notes         TEXT COLLATE utf8mb4_unicode_ci NULL,
  recordedBy    INT NOT NULL,                  -- cajero
  closeoutId    INT NULL,                      -- si ya fue incluido en un cierre
  createdAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_createdAt (createdAt),
  KEY idx_payments_method (method),
  KEY idx_payments_recordedBy (recordedBy),
  KEY idx_payments_closeoutId (closeoutId),
  CONSTRAINT fk_payments_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_reservationId FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_recordedBy FOREIGN KEY (recordedBy) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_closeoutId FOREIGN KEY (closeoutId) REFERENCES cash_closeouts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- Vistas de apoyo
-- ===================================================================

-- Resumen de pagos por día y método
DROP VIEW IF EXISTS daily_payments;
CREATE VIEW daily_payments AS
SELECT 
  CAST(p.createdAt AS DATE) AS date,
  SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END) AS total_cash,
  SUM(CASE WHEN p.method = 'qr'   THEN p.amount ELSE 0 END) AS total_qr,
  SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END) AS total_card,
  SUM(p.amount) AS total_overall,
  COUNT(*) AS total_transactions
FROM payments p
GROUP BY CAST(p.createdAt AS DATE)
ORDER BY date DESC;

-- Ocupación por zona
DROP VIEW IF EXISTS parking_occupancy;
CREATE VIEW parking_occupancy AS
SELECT 
  ps.zone AS zone,
  COUNT(*) AS total_spaces,
  SUM(CASE WHEN ps.status = 'available' THEN 1 ELSE 0 END) AS available_spaces,
  SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_spaces,
  SUM(CASE WHEN ps.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_spaces,
  SUM(CASE WHEN ps.status = 'reserved' THEN 1 ELSE 0 END) AS reserved_spaces,
  ROUND((SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS occupancy_rate
FROM parking_spaces ps
WHERE ps.isActive = TRUE
GROUP BY ps.zone;

SET foreign_key_checks = 1;
