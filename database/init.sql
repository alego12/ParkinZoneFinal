-- ParkingZone Database Initialization Script
-- Universidad Privada del Valle

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS parking_zone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE parking_zone_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role ENUM('admin', 'security', 'client') DEFAULT 'client',
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    plate VARCHAR(20) UNIQUE NOT NULL,
    color VARCHAR(50) NOT NULL,
    type ENUM('car', 'motorcycle') NOT NULL DEFAULT 'car',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    dayOfWeek TINYINT NOT NULL CHECK (dayOfWeek >= 0 AND dayOfWeek <= 6),
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    overtimeRate DECIMAL(10,2) DEFAULT 2.00,
    indefiniteRate DECIMAL(10,2) DEFAULT 5.00,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Parking spaces table
CREATE TABLE IF NOT EXISTS parking_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spaceNumber VARCHAR(10) UNIQUE NOT NULL,
    zone VARCHAR(50) NOT NULL,
    status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
    positionX FLOAT NOT NULL,
    positionY FLOAT NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    vehicleType ENUM('car', 'motorcycle', 'both') DEFAULT 'both',
    scheduleId INT NOT NULL DEFAULT 1,
    carRate DECIMAL(10,2) DEFAULT 2.50,
    motorcycleRate DECIMAL(10,2) DEFAULT 1.50,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduleId) REFERENCES schedules(id) ON DELETE RESTRICT
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    vehicleId INT NOT NULL,
    parkingSpaceId INT NOT NULL,
    startTime TIMESTAMP NOT NULL,
    endTime TIMESTAMP NULL,
    status ENUM('active', 'occupied', 'completed', 'cancelled') DEFAULT 'active',
    totalAmount DECIMAL(10,2) DEFAULT 0.00,
    paymentStatus ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (parkingSpaceId) REFERENCES parking_spaces(id) ON DELETE CASCADE
);

-- LPR Records table
CREATE TABLE IF NOT EXISTS lpr_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plateNumber VARCHAR(20) NOT NULL,
    vehicleColor VARCHAR(50) NOT NULL,
    detectedAt TIMESTAMP NOT NULL,
    imagePath VARCHAR(500) NOT NULL,
    confidence FLOAT DEFAULT 0.0,
    status ENUM('pending', 'matched', 'no_match', 'processed', 'vehicle_created') DEFAULT 'pending',
    reservationId INT NULL,
    vehicleId INT NULL,
    userId INT NULL,
    processedBy INT NULL,
    processedAt TIMESTAMP NULL,
    notes TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE SET NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (processedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin user
INSERT IGNORE INTO users (email, password, firstName, lastName, phone, role) VALUES
('admin@parkingzone.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/9K4QKbK', 'Administrador', 'Sistema', '+591-12345678', 'admin');

-- Insert default schedules
INSERT IGNORE INTO schedules (name, description, dayOfWeek, startTime, endTime, isActive, overtimeRate, indefiniteRate) VALUES
('Lunes a Viernes', 'Horario de lunes a viernes', 1, '08:00:00', '18:00:00', TRUE, 2.00, 5.00),
('Lunes a Viernes', 'Horario de lunes a viernes', 2, '08:00:00', '18:00:00', TRUE, 2.00, 5.00),
('Lunes a Viernes', 'Horario de lunes a viernes', 3, '08:00:00', '18:00:00', TRUE, 2.00, 5.00),
('Lunes a Viernes', 'Horario de lunes a viernes', 4, '08:00:00', '18:00:00', TRUE, 2.00, 5.00),
('Lunes a Viernes', 'Horario de lunes a viernes', 5, '08:00:00', '18:00:00', TRUE, 2.00, 5.00),
('Fin de Semana', 'Horario de fin de semana', 6, '09:00:00', '17:00:00', TRUE, 3.00, 7.00),
('Fin de Semana', 'Horario de fin de semana', 0, '09:00:00', '17:00:00', TRUE, 3.00, 7.00);

-- Insert sample parking spaces
INSERT IGNORE INTO parking_spaces (spaceNumber, zone, positionX, positionY, vehicleType, carRate, motorcycleRate) VALUES
('A1', 'Zona A', 1, 1, 'car', 3.00, 2.00), ('A2', 'Zona A', 2, 1, 'car', 3.00, 2.00), ('A3', 'Zona A', 3, 1, 'car', 3.00, 2.00), ('A4', 'Zona A', 4, 1, 'car', 3.00, 2.00),
('A5', 'Zona A', 5, 1, 'car', 3.00, 2.00), ('A6', 'Zona A', 6, 1, 'car', 3.00, 2.00), ('A7', 'Zona A', 7, 1, 'car', 3.00, 2.00), ('A8', 'Zona A', 8, 1, 'car', 3.00, 2.00),
('B1', 'Zona B', 1, 2, 'motorcycle', 2.50, 1.50), ('B2', 'Zona B', 2, 2, 'motorcycle', 2.50, 1.50), ('B3', 'Zona B', 3, 2, 'motorcycle', 2.50, 1.50), ('B4', 'Zona B', 4, 2, 'motorcycle', 2.50, 1.50),
('B5', 'Zona B', 5, 2, 'motorcycle', 2.50, 1.50), ('B6', 'Zona B', 6, 2, 'motorcycle', 2.50, 1.50), ('B7', 'Zona B', 7, 2, 'motorcycle', 2.50, 1.50), ('B8', 'Zona B', 8, 2, 'motorcycle', 2.50, 1.50),
('C1', 'Zona C', 1, 3, 'both', 3.50, 2.50), ('C2', 'Zona C', 2, 3, 'both', 3.50, 2.50), ('C3', 'Zona C', 3, 3, 'both', 3.50, 2.50), ('C4', 'Zona C', 4, 3, 'both', 3.50, 2.50),
('C5', 'Zona C', 5, 3, 'both', 3.50, 2.50), ('C6', 'Zona C', 6, 3, 'both', 3.50, 2.50), ('C7', 'Zona C', 7, 3, 'both', 3.50, 2.50), ('C8', 'Zona C', 8, 3, 'both', 3.50, 2.50),
('D1', 'Zona D', 1, 4, 'both', 3.50, 2.50), ('D2', 'Zona D', 2, 4, 'both', 3.50, 2.50), ('D3', 'Zona D', 3, 4, 'both', 3.50, 2.50), ('D4', 'Zona D', 4, 4, 'both', 3.50, 2.50),
('D5', 'Zona D', 5, 4, 'both', 3.50, 2.50), ('D6', 'Zona D', 6, 4, 'both', 3.50, 2.50), ('D7', 'Zona D', 7, 4, 'both', 3.50, 2.50), ('D8', 'Zona D', 8, 4, 'both', 3.50, 2.50);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_vehicles_userId ON vehicles(userId);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_parking_spaces_status ON parking_spaces(status);
CREATE INDEX idx_parking_spaces_zone ON parking_spaces(zone);
CREATE INDEX idx_reservations_userId ON reservations(userId);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_startTime ON reservations(startTime);
CREATE INDEX idx_lpr_records_detectedAt ON lpr_records(detectedAt);
CREATE INDEX idx_lpr_records_status ON lpr_records(status);
CREATE INDEX idx_lpr_records_plateNumber ON lpr_records(plateNumber);
CREATE INDEX idx_schedules_dayOfWeek ON schedules(dayOfWeek);
CREATE INDEX idx_schedules_isActive ON schedules(isActive);

-- Create views for common queries
CREATE OR REPLACE VIEW parking_occupancy AS
SELECT 
    zone,
    COUNT(*) as total_spaces,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_spaces,
    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_spaces,
    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_spaces,
    SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved_spaces,
    ROUND((SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as occupancy_rate
FROM parking_spaces 
WHERE isActive = TRUE
GROUP BY zone;

CREATE OR REPLACE VIEW daily_revenue AS
SELECT 
    DATE(createdAt) as date,
    COUNT(*) as total_reservations,
    SUM(totalAmount) as total_revenue,
    AVG(totalAmount) as average_amount
FROM reservations 
WHERE status = 'completed'
GROUP BY DATE(createdAt)
ORDER BY date DESC;
