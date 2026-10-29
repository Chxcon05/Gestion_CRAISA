# Documentación técnica · CRAISA Leads

Versión actualizada · Octubre 2026

## Estado del proyecto (post-migración)
- **Base de datos activa**: PostgreSQL (`craisa`). `prisma` definitivo (`routes/api.js` usa `PrismaClient`).
- **Migración aplicada**: `20261027200935_init`; `prisma migrate deploy` recomendado en producción.
- **Frontend**: React (pages `Dashboard`, `Leads`, `LeadDetail`, `NewLead`, `Reports`, `Agenda`, `Profile`, `Login`).
- **Servidor**: `node server.js` (Express + Prisma). Proxy Vite en desarrollo (`localhost:3000` → `8081`).
- **Datos reales**: `leads` en PostgreSQL (`client`, `company`, `canal`, `linea`, `estado`, `responsable`, `valorEstimado`, `lossReason`, etc.). Sin datos ficticios en el panel (`Jorge Pérez`, `Sergio Mora`, etc. eliminados de `Reports.jsx` y `Dashboard.jsx`).
- **Detalle dinámico**: `Dashboard` y `Reports` usan datos reales (`responsable` mapeado desde email a nombre real, `valorEstimado` leído de `valorEstimado` / `estimatedValue`).
- **Autenticación**: JWT real (`authMiddleware` en `routes/api.js`) con `JWT_SECRET` en `.env`. Token almacenado en `sessionStorage`; debe limpiarse (`sessionStorage.clear()`) al cambiar configuraciones (`prisma`, base, etc.).

## Configuración de base de datos

### PostgreSQL (`prisma`)
- `prisma/schema.prisma`: `provider = postgresql`; `url = env("DATABASE_URL")`.
- `.env`: `DATABASE_URL="postgresql://usuario:clave@localhost:5432/craisa?schema=public"`.
- `pg_hba.conf`: actualizado a `trust` (local); PostgreSQL reiniciado tras cambios.
- Base creada: `craisa`; migraciones: `prisma/migrations/`.
- `leads-db.json`: respaldo mantenido; no reemplaza la base principal.

### Migración y arranque
```bash
npx prisma migrate deploy
node server.js
```
- `routes/api.js`: `authMiddleware`, `findMany`, `findUnique`, `post`, `patch`, `export`.

### Estructura clave (`routes/api.js`)
- `/api/auth/login` → JWT (`admin@craisa.com` / `demo123`).
- `/api/leads` → `findMany` con `where` según rol (`responsableId` para `VENDEDOR`).
- `/api/leads/:id` → `findUnique` por `code` (restaurado sin `include` para evitar crash de Prisma).
- `/api/leads/export` → CSV con `code, client, company, status, channel, businessLine, estimatedValue, lossReason, entryDate`.

## Componentes y páginas
- `Dashboard.jsx`: KPIs dinámicos (`pérdidas` por `lossReason`, `equipo` por `responsable` real, `perfil` con `responsable` convertido).
- `Leads.jsx`: listado con filtros por `estado` (`status`) y `canal` (`channel`).
- `LeadDetail.jsx`: formulario de edición (`description`, `estado`, `lossReason`, tareas, notas).
- `NewLead.jsx`: registro (`code` generado automáticamente, duplicados comparados por teléfono/correo normalizado).
- `Reports.jsx`: resumen ejecutivo, funnel (`status`), pipeline (`status`), canal (`channel`), equipo (`responsable` mapeado), pérdidas (`lossReason`), detalle por lead (panel modal con datos reales).

### Mapeo de responsable (real, sin ficticios)
```js
const mapa = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' }
```
Se aplica en `Dashboard.jsx`, `Reports.jsx` y `Leads.jsx`. No se usan nombres inventados ni correos visibles.

### Detalle del lead (`Reports.jsx`)
- Tabla con botón "Ver detalle".
- Modal con datos básicos (`code`, `client`, `status`, `channel`/`linea`, `responsable`, `valorEstimado`, `score`).
- Descripción (`description`), tareas (`tasks`), interacciones (`interactions`), auditoría (`auditLogs`) — mostradas cuando existen, con mensajes "Sin registros" si no.
- `detail` se pasa directamente desde el array `leads` (evita llamada a `/api/leads/:id` que generaba `ECONNRESET`).

## Notas técnicas
- `prisma` requiere `node server.js` corriendo; `vite` sirve el frontend con proxy a `8081`.
- `sessionStorage.clear()` + `F5` obligatorio tras cambios en `authMiddleware` o `prisma`.
- `leads-db.json` mantenido como respaldo; la fuente de verdad es PostgreSQL.
- Todos los datos en `Dashboard`, `Leads`, `Reports` y detalle provienen de `prisma.lead.findMany()` / `findUnique()`.
