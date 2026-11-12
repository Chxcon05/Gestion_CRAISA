# Documentacion tecnica

## Arquitectura

```
apps/web (React + Vite)  --/api-->  apps/api (Express 5)  --Prisma-->  PostgreSQL
                \                        /
                 packages/shared (Zod, enums, tipos)
```

- **Desarrollo:** Vite sirve la web en el puerto 3000 y redirige `/api` al API en el 8081. Al ser el mismo origen, la cookie de sesion funciona sin configurar CORS.
- **Produccion:** `npm run build` y luego `npm start`. El proceso del API sirve tambien `apps/web/dist`.
- **`packages/shared`** contiene los esquemas de validacion, los enums y sus etiquetas. El formulario y el servidor validan con el mismo codigo, asi que los mensajes coinciden.

## Revision de tecnologias

El prototipo anterior era React 18 + Express 4 + Prisma 5 en JavaScript, con todo el API en un `server.js` de unas 300 lineas. Tenia estos problemas:

- estilos en linea por todas partes;
- contrasenas con SHA-256 sin sal;
- inicio de sesion automatico con credenciales fijas en el front;
- una exportacion CSV que devolvia siempre la misma fila.

La base (React + Express + PostgreSQL) es adecuada para una herramienta interna de registro y consulta, asi que se mantuvo y se completo:

| Decision | Motivo |
|---|---|
| TypeScript estricto | Detecta en compilacion errores que antes llegaban a ejecucion, como los campos inexistentes del antiguo GET /api/leads/:code. |
| Zod compartido | Una sola definicion de reglas para el formulario y el API. |
| Prisma 6 + enums nativos de PostgreSQL | La base de datos tambien rechaza estados o canales invalidos. Las migraciones quedan versionadas. |
| Express 5 modular | Captura los errores asincronos de forma nativa. Cada modulo tiene rutas y servicio separados. |
| Cookie httpOnly + bcrypt | El token no es accesible desde JavaScript y las contrasenas quedan con sal y costo. |
| Tailwind 4 + componentes sobre Radix | Interfaz consistente y accesible: foco, teclado y lectores de pantalla en dialogos, menus y popovers. |
| TanStack Query | Cache, estados de carga y error, y refresco del listado y del dashboard tras cada cambio. |
| Recharts, cargado solo en el dashboard | Cada pantalla se descarga al visitarla; el login y el listado no cargan graficos. |
| Vitest + Supertest + Playwright | Pruebas de reglas, de API contra una base real y de flujos en el navegador. |

Se descarto Next.js porque no hay paginas publicas, SEO ni renderizado en servidor que lo justifiquen. Usar un CRM comercial es una decision de CRAISA (ver Alcance en el README).

## Estructura

```
apps/api/
  prisma/          schema.prisma, migrations/, seed.ts
  src/
    app.ts         middleware y montaje de rutas
    server.ts      arranque y servido de la web compilada
    env.ts         variables de entorno validadas
    auth/          login, logout, me, requireAuth, requireRole
    leads/         rutas, servicio, permisos, filtros, CSV
    dashboard/     agregados por estado, canal, linea y periodo
    catalogs/      lineas y productos
    users/         gestion de usuarios
    lib/           errores HTTP, prisma, auditoria, fechas
  test/            pruebas de API y servidor para e2e
apps/web/src/
  app/             router, layout, sesion y guardas por rol
  components/      UI base y componentes comunes
  features/        auth, dashboard, leads, admin
  lib/             cliente HTTP y formatos es-CR
apps/web/e2e/      pruebas Playwright
packages/shared/   enums, esquemas y tipos de respuesta
```

## API

Todas las rutas usan el prefijo `/api` y, salvo login y health, requieren sesion. Los errores tienen la forma `{ error: { code, message, fields } }`.

| Metodo y ruta | Roles | Descripcion |
|---|---|---|
| POST /auth/login | Publico | Inicia sesion (cookie craisa_session, 8 h). Limite de 10 intentos cada 15 min. |
| POST /auth/logout | Publico | Cierra la sesion. |
| GET /auth/me | Todos | Usuario actual. |
| GET /leads | Todos | Listado paginado. Filtros: q, status, channel, businessLineId, assignedToId (none = sin asignar), from, to, overdue=1, sort, dir, page, pageSize. |
| GET /leads/export.csv | Todos | Mismos filtros, sin paginar (maximo 10 000 filas). |
| POST /leads | Todos | Registrar lead. |
| GET /leads/:code | Todos | Detalle con bitacora y permisos (canEdit, canDelete). |
| PATCH /leads/:code | Editor del lead | Editar datos, proxima accion o responsable. |
| POST /leads/:code/status | Editor del lead | Cambiar estado con nota y motivo de perdida. |
| POST /leads/:code/notes | Editor del lead | Agregar nota a la bitacora. |
| DELETE /leads/:code | ADMIN | Eliminar. |
| GET /dashboard | Todos | from, to, granularity (day, week, month). |
| GET /catalogs | Todos | Lineas, productos y usuarios activos. |
| POST y PATCH /catalogs/lines, /catalogs/products | ADMIN | Mantener catalogos. |
| GET, POST y PATCH /users | ADMIN | Gestion de usuarios. |

## Permisos

| Accion | Admin | Mercadeo | Vendedor |
|---|---|---|---|
| Ver leads, dashboard y exportar | Todos | Todos | Solo asignados a el o registrados por el |
| Registrar lead | Asigna a cualquiera | Asigna a cualquiera | Solo a si mismo |
| Editar, cambiar estado, notas | Todos | Todos | Los suyos |
| Eliminar lead | Si | No | No |
| Usuarios y catalogos | Si | No | No |

El alcance se aplica en el servidor (`apps/api/src/leads/permissions.ts`) en todas las consultas, incluidas la exportacion y el dashboard. Un lead fuera del alcance responde 404, para no confirmar que existe.

## Seguridad

- **Contrasenas:** bcrypt (costo 10). El login responde igual y tarda lo mismo exista o no el correo.
- **Sesion:** JWT en cookie httpOnly, SameSite=Lax y Secure en produccion. El usuario se consulta en cada peticion, asi que desactivarlo o cambiar su rol surte efecto de inmediato.
- **Arranque:** el API no arranca sin JWT_SECRET (minimo 32 caracteres en produccion).
- **Cabeceras y cuerpo:** helmet para las cabeceras HTTP y limite de 100 KB en el cuerpo JSON.
- **Exportacion:** el CSV neutraliza la inyeccion de formulas en celdas que empiezan con igual, mas, menos o arroba.
- **Auditoria:** ingresos, exportaciones, borrados y cambios de usuarios quedan en audit_logs.

## Captura automatica de leads

Los canales digitales crean el lead sin intervencion de una persona. Cada canal tiene su ruta bajo `/api/ingest`, fuera de la sesion, y todos pasan por `ingestLead()` (`apps/api/src/ingest/service.ts`).

- **Sitio web:** `POST /api/ingest/web` con la cabecera `X-Ingest-Key` igual a `INGEST_WEB_SECRET`. Cuerpo JSON: `contactName`, `email` y/o `phone`, `company` (opcional), `businessLine` (opcional: nombre de la linea, se compara sin tildes ni mayusculas; si no coincide se usa la de por defecto), `message` y `website` (campo trampa que debe llegar vacio). Responde `201 { code }`.
- **Quien lo llama:** la funcion de servidor del sitio en Vercel, nunca el navegador, para que la clave no quede expuesta.
- **Resultado:** lead en estado Asignado, con `autoCaptured = true`, asignado a `INGEST_ASSIGNEE_EMAIL` (o al primer administrador activo) y en la linea `INGEST_BUSINESS_LINE` (por defecto "Sin clasificar", que se crea sola). Cada envio crea un lead nuevo, sin deduplicacion.
- **Seguridad:** clave comparada en tiempo constante; sin `INGEST_WEB_SECRET` la ruta responde 404. Limite global de 60 solicitudes por minuto en produccion.
- **Siguientes canales:** WhatsApp (Cloud API de Meta) y Facebook/Instagram (Messenger, Instagram Messaging y Lead Ads) se agregan como `/api/ingest/whatsapp` y `/api/ingest/meta`, validando la firma `X-Hub-Signature-256` y reutilizando `ingestLead()`.

## Exportacion CSV

- **Formato:** UTF-8 con BOM, separador punto y coma, fin de linea CRLF y fechas dd/mm/aaaa. Es lo que espera Excel con configuracion regional de Costa Rica (coma decimal): abre con doble clic, con acentos y columnas correctas.
- **Columnas:** codigo, fecha de ingreso, nombre, empresa, telefono, correo, canal, linea, producto, descripcion, estado, responsable, proxima accion, fecha de proxima accion y ultima actualizacion.

## Despliegue (cuando TI lo apruebe)

1. Base PostgreSQL administrada, con respaldos.
2. Variables DATABASE_URL, JWT_SECRET (32 caracteres o mas) y NODE_ENV=production. Node 22.9 o superior; el archivo .env es opcional en el servidor.
   Para la captura desde el sitio web, tambien INGEST_WEB_SECRET (32 caracteres o mas) y, si se quiere, INGEST_ASSIGNEE_EMAIL e INGEST_BUSINESS_LINE.
3. Ejecutar `npm ci`, `npm run build` y `npm run db:deploy -w @craisa/api`; despues, `npm start` detras de HTTPS.
4. Primer administrador: definir ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD (minimo 8 caracteres) y ejecutar `npm run db:admin -w @craisa/api`. Solo crea el usuario si no existe y nunca cambia uno existente, asi que puede quedar en el comando de arranque; despues de ingresar se borra ADMIN_PASSWORD.
5. Crear los demas usuarios reales desde la pantalla Usuarios. El seed se niega a correr con NODE_ENV=production.
