-- Migration: Add payments table and daily_payments view (Nov 3, 2025)
-- Safe for existing DB created from Dump20251021.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- Ensure role 'cashier' exists in users.role enum (if created via Sequelize this may already be present)
-- NOTE: MySQL ENUM alter requires full list. Adjust according to current enum values.
SET @has_cashier := (
  SELECT IF(
    FIND_IN_SET('cashier', REPLACE(COLUMN_TYPE, "enum(", "")) > 0,
    1,
    0
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
);

-- If not present, alter enum to include 'cashier'
SET @ddl := IF(@has_cashier = 0,
  'ALTER TABLE users MODIFY COLUMN role ENUM("admin","security","cashier","client") COLLATE utf8mb4_unicode_ci DEFAULT "client";',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create payments table if not exists
CREATE TABLE IF NOT EXISTS payments (
  id            INT NOT NULL AUTO_INCREMENT,
  userId        INT NULL,
  reservationId INT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  method        ENUM('cash','qr','card') COLLATE utf8mb4_unicode_ci NOT NULL,
  reference     VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL,
  notes         TEXT COLLATE utf8mb4_unicode_ci NULL,
  recordedBy    INT NOT NULL,
  closeoutId    INT NULL,
  createdAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_createdAt (createdAt),
  KEY idx_payments_method (method),
  KEY idx_payments_recordedBy (recordedBy),
  KEY idx_payments_closeoutId (closeoutId),
  CONSTRAINT fk_payments_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_reservationId FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_recordedBy FOREIGN KEY (recordedBy) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create daily_payments view (drop if exists)
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

SET foreign_key_checks = 1;
