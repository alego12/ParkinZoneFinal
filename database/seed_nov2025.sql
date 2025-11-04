-- ParkingZoneUnivalle - Datos semilla mínimos (Nov 2025)
-- Objetivo: crear un admin, horarios básicos y algunos espacios de parqueo

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- Admin por defecto
-- Email: admin@parkingzone.com
-- Password: Admin123456
-- Hash bcrypt generado con rounds=12
INSERT INTO users (email, password, firstName, lastName, phone, role, isActive)
VALUES ('admin@parkingzone.com', '$2a$12$CA8pTpP3QuZ5qMrBB3Pb9.GpmRVV34CTskMEEDSzoJ/PJerDFahzO', 'Admin', 'Sistema', '+591-12345678', 'admin', 1)
ON DUPLICATE KEY UPDATE password = '$2a$12$CA8pTpP3QuZ5qMrBB3Pb9.GpmRVV34CTskMEEDSzoJ/PJerDFahzO';

-- Horarios
INSERT INTO schedules (name, description, dayOfWeek, startTime, endTime, isActive, overtimeRate, indefiniteRate)
VALUES
 ('Lunes a Viernes', 'Horario de lunes a viernes', 1, '08:00:00', '18:00:00', 1, 2.00, 5.00),
 ('Lunes a Viernes', 'Horario de lunes a viernes', 2, '08:00:00', '18:00:00', 1, 2.00, 5.00),
 ('Lunes a Viernes', 'Horario de lunes a viernes', 3, '08:00:00', '18:00:00', 1, 2.00, 5.00),
 ('Lunes a Viernes', 'Horario de lunes a viernes', 4, '08:00:00', '18:00:00', 1, 2.00, 5.00),
 ('Lunes a Viernes', 'Horario de lunes a viernes', 5, '08:00:00', '18:00:00', 1, 2.00, 5.00),
 ('Fin de Semana', 'Horario de fin de semana', 6, '09:00:00', '17:00:00', 1, 3.00, 7.00),
 ('Fin de Semana', 'Horario de fin de semana', 0, '09:00:00', '17:00:00', 1, 3.00, 7.00);

-- Espacios de parqueo (Zona A: autos, Zona B: motos, Zona C: mixta)
INSERT INTO parking_spaces (spaceNumber, zone, status, positionX, positionY, isActive, vehicleType, scheduleId, carRate, motorcycleRate)
VALUES
 -- Zona A: Autos (16 espacios)
 ('A1','Zona A','available',1,1,1,'car',1,3.00,2.00),
 ('A2','Zona A','available',2,1,1,'car',1,3.00,2.00),
 ('A3','Zona A','available',3,1,1,'car',1,3.00,2.00),
 ('A4','Zona A','available',4,1,1,'car',1,3.00,2.00),
 ('A5','Zona A','available',5,1,1,'car',1,3.00,2.00),
 ('A6','Zona A','available',6,1,1,'car',1,3.00,2.00),
 ('A7','Zona A','available',7,1,1,'car',1,3.00,2.00),
 ('A8','Zona A','available',8,1,1,'car',1,3.00,2.00),
 ('A9','Zona A','available',1,2,1,'car',1,3.00,2.00),
 ('A10','Zona A','available',2,2,1,'car',1,3.00,2.00),
 ('A11','Zona A','available',3,2,1,'car',1,3.00,2.00),
 ('A12','Zona A','available',4,2,1,'car',1,3.00,2.00),
 ('A13','Zona A','available',5,2,1,'car',1,3.00,2.00),
 ('A14','Zona A','available',6,2,1,'car',1,3.00,2.00),
 ('A15','Zona A','available',7,2,1,'car',1,3.00,2.00),
 ('A16','Zona A','available',8,2,1,'car',1,3.00,2.00),
 
 -- Zona B: Motos (12 espacios)
 ('B1','Zona B','available',1,3,1,'motorcycle',1,2.50,1.50),
 ('B2','Zona B','available',2,3,1,'motorcycle',1,2.50,1.50),
 ('B3','Zona B','available',3,3,1,'motorcycle',1,2.50,1.50),
 ('B4','Zona B','available',4,3,1,'motorcycle',1,2.50,1.50),
 ('B5','Zona B','available',5,3,1,'motorcycle',1,2.50,1.50),
 ('B6','Zona B','available',6,3,1,'motorcycle',1,2.50,1.50),
 ('B7','Zona B','available',7,3,1,'motorcycle',1,2.50,1.50),
 ('B8','Zona B','available',8,3,1,'motorcycle',1,2.50,1.50),
 ('B9','Zona B','available',1,4,1,'motorcycle',1,2.50,1.50),
 ('B10','Zona B','available',2,4,1,'motorcycle',1,2.50,1.50),
 ('B11','Zona B','available',3,4,1,'motorcycle',1,2.50,1.50),
 ('B12','Zona B','available',4,4,1,'motorcycle',1,2.50,1.50),
 
 -- Zona C: Mixta (10 espacios)
 ('C1','Zona C','available',1,5,1,'both',1,3.50,2.50),
 ('C2','Zona C','available',2,5,1,'both',1,3.50,2.50),
 ('C3','Zona C','available',3,5,1,'both',1,3.50,2.50),
 ('C4','Zona C','available',4,5,1,'both',1,3.50,2.50),
 ('C5','Zona C','available',5,5,1,'both',1,3.50,2.50),
 ('C6','Zona C','available',6,5,1,'both',1,3.50,2.50),
 ('C7','Zona C','available',7,5,1,'both',1,3.50,2.50),
 ('C8','Zona C','available',8,5,1,'both',1,3.50,2.50),
 ('C9','Zona C','available',1,6,1,'both',1,3.50,2.50),
 ('C10','Zona C','available',2,6,1,'both',1,3.50,2.50);

SET foreign_key_checks = 1;
