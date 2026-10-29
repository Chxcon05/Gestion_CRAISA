# Manual de usuario · CRAISA Leads

## Estado actual
- Base de datos: **PostgreSQL** (`craisa`) con `prisma` activo (`routes/api.js` usa `PrismaClient`).
- Migration aplicada: `20261027200935_init`.
- Estación de trabajo: `node server.js` (puerto 8081); proxy Vite en desarrollo.
- Datos: `leads` reales de la base (`client`, `company`, `canal`, `linea`, `estado`, `responsable`, `valorEstimado`, `lossReason`, etc.); sin nombres ficticios (`Jorge Pérez`, `Sergio Mora` eliminados).
- `sessionStorage` debe limpiarse al cambiar de `prisma` para evitar `401` por token viejo.

## Flujo por rol

### Administrador (`admin@craisa.com` / `demo123`)
- Acceso total: Dashboard, Leads, Reportes, Usuarios, Perfil.
- Puede asignar responsables a cualquier lead y ver todo el equipo.
- Panel de detalle del lead muestra datos reales, descripción, notas de gestión (interacciones), tareas y auditoría.

### Vendedor (`VENDEDOR`)
- Solo ve sus leads (`responsableId` = su usuario).
- Puede editar leads asignados, registrar notas, crear tareas y cambiar estados.
- No ve datos de otros vendedores ni analítica agregada.

## Pantallas principales

### Dashboard (`/dashboard`)
- Títulos grandes (`2.5rem` / `1.25rem`).
- Pérdidas dinámicas por `lossReason`; colores por estado (`ganado`, `perdido`, `nuevo`, etc.).
- Equipo real desde `responsable` (correo convertido a nombre real: `Admin CRAISA`).
- Perfil del cliente usa `responsable` mapeado; sin ficticios.

### Leads (`/leads`)
- Filtros por estado y canal.
- Tabla con `responsable`, `valorEstimado`, `lossReason`.
- Link a detalle individual (`/leads/{code}`).

### Detalle del lead (`/leads/{code}`)
- Datos básicos, descripción, notas de interacción, tareas, auditoría.
- Estado editable; cambios registrados en `AuditLog`.

### Reportes (`/reportes`)
- Resumen ejecutivo, funnel, pipeline, canal, equipo y pérdidas.
- **Equipo dinámico**: cuenta por `responsable` real, sin datos inventados.
- **Detalle por lead**: tabla con botón "Ver detalle"; panel modal con información real (responsable y valor mostrados correctamente).

## Configuración rápida
- `prisma/schema.prisma`: `provider = postgresql`; `url = env("DATABASE_URL")`.
- `.env`: `DATABASE_URL="postgresql://.../craisa?schema=public"`; `JWT_SECRET` definido.
- Base `craisa` creada; `pg_hba.conf` en `trust` si es local; PostgreSQL reiniciado tras cambios.
- `leads-db.json` mantenido como respaldo, pero la fuente principal es PostgreSQL.

## Limpieza de sesiones
- Después de cualquier cambio a `prisma`, ejecutar `sessionStorage.clear()` y `F5` para renovar token JWT (`authMiddleware` valida con `JWT_SECRET`).
