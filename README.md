# CRAISA · Sistema de Gestión y Seguimiento de Leads Comerciales

Estado actual: prototipo funcional con `prisma` + PostgreSQL (`craisa`) y datos reales. No se usan nombres ficticios (`Jorge Pérez`, `Sergio Mora`, etc. eliminados); todos los datos (`responsable`, `valorEstimado`, `pérdidas`) provienen de la base. El frontend usa React (`Dashboard`, `Leads`, `LeadDetail`, `NewLead`, `Reports`, `Agenda`). El detalle de cada lead muestra datos reales, notas de gestión (interacciones), tareas y auditoría.

## Contenido del repositorio

```
.
├── src/pages/            Páginas React (Dashboard, Leads, LeadDetail, Reports, etc.)
├── routes/api.js         API con PrismaClient (auth, leads, detalle, exportación CSV)
├── server.js             Express + Prisma (puerto 8081); proxy Vite en desarrollo
├── prisma/               Schema (`postgresql`), migraciones (`20261027200935_init`)
├── docs/                 Manual actualizado, documentación técnica, modelo de datos, pruebas
├── docs/manual-usuario.md    Guía de uso actualizada (responsable real, detalle dinámico)
├── .env                  DATABASE_URL, JWT_SECRET, PORT
├── leads-db.json         Respaldo de datos (no reemplaza PostgreSQL)
└── README.md            Este archivo (actualizado con configuración real)
```

## Ejecutar con base real (`prisma`)

Requisitos: Node.js 18+, PostgreSQL corriendo, base `craisa` creada.

```bash
# Configurar base y secreto
cp .env.example .env   # editar DATABASE_URL y JWT_SECRET

# Aplicar migraciones
npx prisma migrate deploy

# Iniciar servidor
node server.js
```

Abrir `http://localhost:8081/` (o el proxy Vite). La autenticación es real con JWT (`authMiddleware`); el token se guarda en `sessionStorage`. Si aparece `401` tras cambios, limpiar con `sessionStorage.clear()` + `F5`.

## Usuarios de demostración

| Correo | Contraseña | Rol | Alcance |
| --- | --- | --- | --- |
| `admin@craisa.com` | `demo123` | Administrador (`ADMIN`) | Todos los leads, analítica, exportación, detalle real |

- El responsable (`responsable`) se convierte de email a nombre real (`Admin CRAISA`) en todos los paneles (`Dashboard`, `Leads`, `Reports`).
- No existen datos ficticios. `Reports.jsx` usa datos reales para equipo, pérdidas (`lossReason`) y detalle por lead.

## Documentación (actualizada)

| Documento | Contenido actualizado |
| --- | --- |
| `docs/manual-usuario.md` | Configuración (`prisma` + PostgreSQL `craisa`), flujo por rol, detalle dinámico, responsable real, limpieza de token (`sessionStorage.clear()` + `F5`) |
| `docs/documentacion-tecnica.md` | Estado funcional (`prisma` + PostgreSQL activo), `routes/api.js`, `Dashboard.jsx`, `Reports.jsx` (equipo real, pérdidas dinámicas), `Leads.jsx` |
| `docs/modelo-datos.md` | Modelo `prisma` con `postgresql`; índices; vistas derivadas; nota técnica de `prisma` (`migrate deploy`) |
| `docs/pruebas-y-limitaciones.md` | Datos reales (`PostgreSQL`); resultados con datos reales; configuración y limpieza de sesiones |

## Estado actual vs prototipo anterior

- **Base**: de datos ficticios en memoria (`leads-db.json`) a PostgreSQL (`prisma`) con datos reales (`leads` en base `craisa`).
- **Dashboard**: títulos grandes (`2.5rem` / `1.25rem`), pérdidas dinámicas (`lossReason`), colores por estado, equipo real (`responsable` convertido).
- **Detalle del lead**: panel/modal con datos básicos (`responsable` real, `valorEstimado` limpio), descripción, interacciones, tareas, auditoría. Sin datos inventados.
- **Equipo**: `Reports.jsx` calcula por `responsable` real; sin `Jorge Pérez`, `Sergio Mora` ni estadísticas inventadas.
- **Responsable**: leído del campo `responsable` / `responsableId`; convertido si es email (`admin@craisa.com` → `Admin CRAISA`).
- **Valor estimado**: leído de `valorEstimado` / `estimatedValue`; muestra `₡...` sin descartar valores por `||`.

## Próxima fase
- Consolidar `prisma` en producción (`prisma migrate deploy` con respaldo).
- Considerar `AuditLog` con `include` una vez verificado que no genere `ECONNRESET` (actualmente `routes/api.js` usa `findUnique` básico para estabilidad).
- Integración real con canales externos (WhatsApp, Meta, ERP) pendiente.

---

CRAISA 2026 · Datos reales, sin ficticios. `prisma` + PostgreSQL (`craisa`).
