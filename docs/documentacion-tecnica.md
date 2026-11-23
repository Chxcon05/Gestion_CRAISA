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
    notifications/ avisos de la campana y acciones vencidas
    dashboard/     agregados por estado, canal, linea y periodo
    catalogs/      lineas y productos
    users/         gestion de usuarios
    lib/           errores HTTP, prisma, auditoria, fechas
  test/            pruebas de API y servidor para e2e
apps/web/src/
  app/             router, layout, sesion y guardas por rol
  components/      UI base y componentes comunes
  features/        admin, auth, dashboard, leads, notifications
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
| GET /leads/export.xlsx | Todos | Excel con formato: mismos filtros, sin paginar (maximo 10 000 filas). Lo usa el boton Exportar. |
| GET /leads/export.csv | Todos | Mismas filas en CSV (separador ;), para integraciones. |
| POST /leads | Todos | Registrar lead. |
| GET /leads/:code | Todos | Detalle con bitacora y permisos (canEdit, canDelete). |
| PATCH /leads/:code | Editor del lead | Editar datos, proxima accion o responsable. |
| POST /leads/:code/status | Editor del lead | Cambiar estado con nota y motivo de perdida. |
| POST /leads/:code/notes | Editor del lead | Agregar nota a la bitacora. |
| DELETE /leads/:code | ADMIN | Eliminar. |
| GET /dashboard | Todos | from, to, granularity (day, week, month). |
| GET /catalogs | Todos | Lineas, productos y usuarios activos. |
| POST y PATCH /catalogs/lines, /catalogs/products | ADMIN | Mantener lineas y productos. |
| GET /notifications | Todos | Ultimos 20 avisos del usuario, cuantos sin leer y cuantas acciones vencidas ve. |
| POST /notifications/:id/read, /notifications/read-all | Todos | Marcar uno o todos los avisos propios como leidos. |
| GET, POST y PATCH /users | ADMIN | Gestion de usuarios. |

## Permisos

Hay dos roles. Mercadeo usa el rol Administrador.

| Accion | Administrador | Vendedor |
|---|---|---|
| Ver leads, dashboard y exportar | Todos | Solo asignados a el o registrados por el |
| Registrar lead | Asigna a cualquiera | Solo a si mismo |
| Editar, cambiar estado, notas | Todos | Los suyos |
| Eliminar lead | Si | No |
| Usuarios y productos | Si | No |

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
- **Correo:** el servidor revisa por IMAP el buzon `MAIL_IMAP_USER` (info@craisa.com, Google Workspace) cada `MAIL_POLL_SECONDS` segundos (`apps/api/src/ingest/email.ts`). No es una ruta: arranca con el servidor si estan `MAIL_IMAP_USER` y `MAIL_IMAP_PASSWORD`.
  - **Clave:** contrasena de aplicacion de Google (requiere verificacion en dos pasos en la cuenta). La clave normal no funciona por IMAP.
  - **Solo lectura:** la carpeta se abre con EXAMINE; no se marca nada como leido ni se mueve. Lo importado se reconoce por `externalRef = email:<Message-ID>`, que es unico.
  - **Ventana:** cada pasada mira los correos de las ultimas `MAIL_LOOKBACK_HOURS` horas (48 por defecto); al activarla la primera vez se importan esos correos.
  - **Filtros:** no generan lead los boletines (cabeceras List-*), las respuestas automaticas (Auto-Submitted, X-Autoreply), los remitentes no-reply o de sistema ni lo que envia el propio buzon.
  - **Lead:** canal Correo, nombre del remitente (o la parte antes de la arroba), correo, el primer telefono de Costa Rica que aparezca en el texto, y el asunto mas el cuerpo sin el hilo citado como descripcion.
- **WhatsApp:** Evolution API conectada por QR al celular de la empresa; su webhook llama a `POST /api/ingest/whatsapp` (`apps/api/src/ingest/whatsapp.ts`).
  - **No es oficial:** Evolution usa WhatsApp Web. WhatsApp puede bloquear el numero si detecta envios masivos; el sistema solo manda un aviso por asignacion.
  - **Clave:** header `x-ingest-key` (o `?key=` en la URL) igual a `EVOLUTION_WEBHOOK_SECRET`, comparado en tiempo constante. Clave mala: 401. Clave buena: siempre 200, para que Evolution no reintente. Sin el secreto la ruta responde 404.
  - **Que entra:** solo el evento `messages.upsert`. Se ignora lo que envia la empresa (`fromMe`), los grupos (`@g.us`), los estados (`@broadcast`), los canales (`@newsletter`), las reacciones y los mensajes borrados. Si el chat llega como `@lid`, el numero se toma de `remoteJidAlt` o `senderPn`; si no hay, se descarta.
  - **Texto:** `conversation`, `extendedTextMessage`, botones y listas usan su texto; imagenes, audios y documentos usan el pie o "Imagen sin texto". Los mensajes temporales y de una sola vista se desenvuelven.
  - **Un lead por cliente:** si el telefono (ultimos 8 digitos, como la deteccion de duplicados) tiene un lead que no esta Ganado ni Perdido, el mensaje entra a su bitacora como `MENSAJE` y el responsable recibe un aviso en la campana. Si no, se crea un lead nuevo asignado al administrador.
  - **Reintentos:** el id del mensaje se guarda en `leads.externalRef` o `interactions.externalRef` (los dos unicos); un reintento no duplica nada.
  - **Aviso al vendedor:** al asignar un lead a un usuario con WhatsApp (pantalla Usuarios), el API manda por Evolution (`POST /message/sendText/{EVOLUTION_INSTANCE}`) el codigo, el cliente, la consulta, el enlace `wa.me` del cliente y el enlace al lead en `APP_URL` (`apps/api/src/notifications/whatsapp.ts`). Sale despues de guardar y sin esperar: si Evolution falla, solo se registra en el log. Nadie recibe aviso de una asignacion que hizo el mismo.
  - **Puesta en marcha local:**
    1. En `.env`: `EVOLUTION_API_KEY` y `EVOLUTION_WEBHOOK_SECRET`.
    2. `docker compose --profile whatsapp up -d evolution` y abrir `http://localhost:8080/manager` con la `EVOLUTION_API_KEY`.
    3. Crear la instancia `atencion_cliente` y escanear el QR desde WhatsApp Business > Dispositivos vinculados.
    4. Configurar el webhook (reemplazar las claves):
       ```bash
       curl -X POST http://localhost:8080/webhook/set/atencion_cliente          -H "apikey: <EVOLUTION_API_KEY>" -H "Content-Type: application/json"          -d '{"webhook":{"enabled":true,"url":"http://host.docker.internal:8081/api/ingest/whatsapp","headers":{"x-ingest-key":"<EVOLUTION_WEBHOOK_SECRET>"},"events":["MESSAGES_UPSERT"]}}'
       ```
       Si la version de Evolution no reenvia `headers`, usar la URL con `?key=<EVOLUTION_WEBHOOK_SECRET>`.
- **Siguiente canal:** Facebook/Instagram (Messenger, Instagram Messaging y Lead Ads) en `/api/ingest/meta`, con la misma firma y `ingestLead()`.

## Exportacion CSV

- **Formato:** UTF-8 con BOM, separador punto y coma, fin de linea CRLF y fechas dd/mm/aaaa. Es lo que espera Excel con configuracion regional de Costa Rica (coma decimal): abre con doble clic, con acentos y columnas correctas.
- **Columnas:** codigo, fecha de ingreso, nombre, empresa, telefono, correo, canal, linea, producto, descripcion, estado, responsable, proxima accion, fecha de proxima accion y ultima actualizacion.

## Despliegue (cuando TI lo apruebe)

1. Base PostgreSQL administrada, con respaldos.
2. Variables DATABASE_URL, JWT_SECRET (32 caracteres o mas) y NODE_ENV=production. Node 22.9 o superior; el archivo .env es opcional en el servidor.
   Para la captura desde el sitio web, tambien INGEST_WEB_SECRET (32 caracteres o mas) y, si se quiere, INGEST_ASSIGNEE_EMAIL e INGEST_BUSINESS_LINE.
   Para WhatsApp, EVOLUTION_API_KEY, EVOLUTION_URL, EVOLUTION_WEBHOOK_SECRET y APP_URL, con Evolution desplegado aparte.
3. Ejecutar `npm ci`, `npm run build` y `npm run db:deploy -w @craisa/api`; despues, `npm start` detras de HTTPS.
4. Primer administrador: definir ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD (minimo 8 caracteres) y ejecutar `npm run db:admin -w @craisa/api`. Solo crea el usuario si no existe y nunca cambia uno existente, asi que puede quedar en el comando de arranque; despues de ingresar se borra ADMIN_PASSWORD.
5. Crear los demas usuarios reales desde la pantalla Usuarios. El seed se niega a correr con NODE_ENV=production.
