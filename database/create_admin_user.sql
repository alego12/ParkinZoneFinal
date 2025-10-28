-- Crear usuario ADMIN por defecto
-- Credenciales entregadas al final

USE parking_zone_db;

-- Mostrar admins existentes
SELECT 'Admins existentes antes:' AS info;
SELECT id, email, firstName, lastName, role, isActive FROM users WHERE role = 'admin';

-- Borrar admin previo con el mismo email (si existe)
DELETE FROM users WHERE email = 'admin@test.com';

-- Insertar usuario ADMIN
-- NOTA: password hash corresponde a la contraseña: cliente123
-- Si deseas otra contraseña, reemplaza el hash por el adecuado.
INSERT INTO users (email, password, firstName, lastName, phone, role, isActive, createdAt, updatedAt) VALUES
('admin@test.com', '$2a$12$qqJI5elEgWx5S0fVlw/k8Ode7l/XfMUpjXeaZmBZ.hw8MRNCCX39O', 'Admin', 'Principal', '+591-70000000', 'admin', true, NOW(), NOW());

-- Verificar creación
SELECT 'ADMIN CREADO:' AS resultado;
SELECT id, email, firstName, lastName, role, isActive FROM users WHERE email = 'admin@test.com';

-- Credenciales
SELECT 'CREDENCIALES ADMIN:' AS info;
SELECT 'Email: admin@test.com' AS credencial_1;
SELECT 'Password: cliente123' AS credencial_2;
