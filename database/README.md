# Base de datos — Estructura (Nov 2025)

Archivos vigentes:
- schema_nov2025.sql: Esquema completo (crear base desde cero)
- seed_nov2025.sql: Datos semilla mínimos (admin, horarios, espacios)
- migrations/: Migraciones incrementales (pagos, cierres)

Archivos legacy (se moverán a database/legacy/):
- Dump20251021.sql
- Parking.sql
- init.sql
- create_password_resets.sql
- create_admin_user.sql
- cleanup_reset_data.sql

Uso recomendado:
1) DB nueva
   - Ejecutar schema_nov2025.sql y luego seed_nov2025.sql
2) DB existente
   - Ejecutar migraciones en migrations/

Zona horaria: los timestamps se almacenan en UTC. El frontend presenta en hora local.
