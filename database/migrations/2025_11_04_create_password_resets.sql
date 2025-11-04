-- Crear tabla password_resets para flujo de recuperación de contraseña
-- MySQL 8+

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS password_resets (
  id         INT NOT NULL AUTO_INCREMENT,
  userId     INT NOT NULL,
  code       VARCHAR(12) NOT NULL,
  expiresAt  DATETIME NOT NULL,
  usedAt     DATETIME NULL,
  createdAt  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_resets_userId (userId),
  KEY idx_password_resets_code (code),
  KEY idx_password_resets_expiresAt (expiresAt),
  CONSTRAINT fk_password_resets_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
