-- Migration: Add cash_closeouts table and FK from payments (Nov 3, 2025)
-- Safe to run after 2025_11_03_add_payments.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- Create cash_closeouts table if not exists
CREATE TABLE IF NOT EXISTS cash_closeouts (
  id           INT NOT NULL AUTO_INCREMENT,
  fromAt       TIMESTAMP NOT NULL,
  toAt         TIMESTAMP NOT NULL,
  totalCash    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  totalQR      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  totalCard    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  totalOverall DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closedBy     INT NOT NULL,
  closedAt     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  notes        TEXT COLLATE utf8mb4_unicode_ci,
  createdAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_closeouts_closedBy (closedBy),
  KEY idx_closeouts_range (fromAt, toAt),
  CONSTRAINT fk_closeouts_closedBy FOREIGN KEY (closedBy) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add closeoutId column to payments if missing, and add FK
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'payments'
     AND COLUMN_NAME = 'closeoutId'
);
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE payments ADD COLUMN closeoutId INT NULL, ADD KEY idx_payments_closeoutId (closeoutId);',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add FK (ignore if exists)
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_closeoutId FOREIGN KEY (closeoutId)
  REFERENCES cash_closeouts(id) ON DELETE SET NULL;

SET foreign_key_checks = 1;
