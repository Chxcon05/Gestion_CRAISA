# Instrucciones de la sesión CRAISA

## Objetivo
Corregir Dashboard, Reports, Leads, Bitácora y Agenda con datos reales, colores corporativos exactos y diseño limpio.

## Regla de datos
- Siempre usar datos reales (DB/Prisma). No usar datos ficticios.

## Colores corporativos exactos
- `#0044BB` (primary)
- `#FFB800` (accent)
- `#00AA44` (success)
- `#9933FF` (secondary)
- `#FF6600` (warning)
- `#555555` (text)
- `#CC0000` (error)

## Bitácora (LeadDetail.jsx / server.js)
- Automática por cambio de apartado (estado, proxAccion, linea, canal, etc.).
- Mensaje específico por apartado (ej. "Estado actualizado: ...").
- Eliminar registros antiguos (`deleteMany`) excepto el más reciente.
- Usar `originalLeadRef` / `initialLeadRef` para comparar cambios reales.

## Leads / Leads.jsx
- Botón `Borrar` funcional (`DELETE` en server.js).
- Datos grandes, sin bordes rojos.
- `Agricola` (sin acento rotos) en DB y frontend.

## Agenda / Agenda.jsx / AgendaAction.jsx
- Datos reales (`api`).
- Filtros: Todos / Urgente / Cercano / Lejano.
- Botón `Asignar acción` con página `/agenda/action/:code`.
- Múltiples acciones por lead (modelo `LeadAction`).
- No permitir fecha anterior a hoy (`min={todayStr}`).
- No guardar acción vacía (`trim()` + alerta).
- Diseño limpio: sombra suave, botón oscuro.

## Reports / Reports.jsx
- Funnel 7 estados con colores exactos.
- Modal limpio, filtro de auditoría limpia (`personalizado` oculto).
- `bitacora` limpia en modal.

## Dashboard / Dashboard.jsx
- Donut interactivo (`radius: 110`), tooltip al hover, leyenda debajo.
- Sin caché.

## Codificación / símbolos
- Nunca usar `·` rotos ni guiones ocultos (`—`).
- Usar ` - ` como separador si es necesario.
- Restaurar acentos (`Agrícola`, `Teléfono`, etc.).

## Producción / despliegue
- Base de datos: PostgreSQL (`prisma/schema.prisma` con `provider = "postgresql"`).
- Pasos: `.env` con `DATABASE_URL`, `npx prisma migrate deploy`, `npx prisma generate`, `node server.js`.
- Para pasar proyecto: `pg_dump` + `.env.example` + `README.md` (no copiar `.env` real).

## Git / repo
- Commit y push a `https://github.com/Chxcon05/Gestion_CRAISA`.
- No incluir archivos temporales (`fix_db.js`, `delete_audit.js`) en commits.

