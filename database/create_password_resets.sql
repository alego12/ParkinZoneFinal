-- Tabla para códigos de recuperación de contraseña
USE parking_zone_db;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  code VARCHAR(12) NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_resets_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_code (userId, code),
  INDEX idx_expires (expiresAt)
);
