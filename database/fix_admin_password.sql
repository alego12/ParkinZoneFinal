-- Fix admin password (ejecutar si el admin ya existe en la BD)
-- Email: admin@parkingzone.com
-- Password: Admin123456

UPDATE users 
SET password = '$2a$12$CA8pTpP3QuZ5qMrBB3Pb9.GpmRVV34CTskMEEDSzoJ/PJerDFahzO'
WHERE email = 'admin@parkingzone.com';

SELECT 'Admin password updated successfully' AS message;
