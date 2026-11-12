# Guia de mantenimiento

Lo necesario para que otra persona continue el desarrollo. Antes de empezar, conviene leer el [README](../README.md) y la [documentacion tecnica](documentacion-tecnica.md).

## Antes de entregar cualquier cambio

```bash
npm run lint        # oxlint, sin errores
npm run test:todo   # typecheck + pruebas de reglas y API + pruebas en navegador
npm run build       # compilacion de la web
```

Los tres deben pasar. Las pruebas usan la base `craisa_test`; nunca tocan la de desarrollo ni la de produccion.

## Donde vive cada cosa

| Quiero cambiar... | Archivo |
|---|---|
| Reglas de validacion del formulario y del API | `packages/shared/src/schemas.ts` |
| Estados, canales, roles y sus etiquetas | `packages/shared/src/enums.ts` y `apps/api/prisma/schema.prisma` |
| Quien ve o edita que | `apps/api/src/leads/permissions.ts` |
| Filtros del listado y de la exportacion | `apps/api/src/leads/query.ts` |
| Columnas del CSV | `apps/api/src/leads/csv.ts` |
| Indicadores del inicio | `apps/api/src/dashboard/service.ts` y `apps/web/src/features/dashboard/DashboardPage.tsx` |
| Pantallas | `apps/web/src/features/` (una carpeta por modulo) |
| Colores de marca | `apps/web/src/index.css` (bloque `@theme`) |
| Colores de cada estado | `apps/web/src/components/status.tsx` |
| Datos de demostracion | `apps/api/prisma/seed.ts` |

## Tareas frecuentes

### Agregar o quitar lineas de negocio y productos

No requiere programar: se hace desde **Administracion > Catalogos**, con un usuario Administrador.

### Agregar un canal de origen

1. Agregar el valor, en orden alfabetico, al `enum Channel` de `apps/api/prisma/schema.prisma`.
2. Ejecutar `npm run db:migrate`, ponerle un nombre a la migracion (por ejemplo `canal-tiktok`) y confirmar.
3. Agregar el valor a `CHANNELS` y su etiqueta a `CHANNEL_LABELS` en `packages/shared/src/enums.ts`.
4. Asignarle un icono en `CHANNEL_ICONS` (`apps/web/src/components/channel.tsx`).
5. Ejecutar `npm run typecheck`: TypeScript senala cualquier otro lugar que falte actualizar.

Agregar un estado sigue los mismos pasos con `LeadStatus` y `LEAD_STATUSES`. Ademas hay que darle un color en `STATUS_STYLES`.

### Agregar un campo al lead

1. Agregar el campo al `model Lead` en `schema.prisma` y ejecutar `npm run db:migrate`.
2. Agregarlo a `leadBaseSchema` en `packages/shared/src/schemas.ts` (validacion) y a `LeadListItem` o `LeadDetail` en `types.ts`.
3. Serializarlo en `apps/api/src/leads/serialize.ts`.
4. Mostrarlo en `LeadForm.tsx` y en `LeadDetailPage.tsx`; si debe exportarse, agregarlo a `csv.ts`.
5. Agregar o ajustar pruebas en `apps/api/test/leads.test.ts`.

### Crear usuarios o restablecer una contrasena

Desde **Administracion > Usuarios**. Para restablecer una contrasena, el API acepta `PATCH /api/users/:id` con el campo `password` (minimo 8 caracteres).

### Cambios en la base de datos

- **Desarrollo:** `npm run db:migrate`. Crea la migracion en `apps/api/prisma/migrations/`; hay que versionarla junto con el codigo.
- **Produccion:** `npm run db:deploy -w @craisa/api`. Solo aplica las migraciones existentes y nunca borra datos.
- **`npm run db:reset` y `npm run db:seed` borran todos los datos.** Usarlos solo en desarrollo.

## Problemas conocidos y solucion

| Sintoma | Causa y solucion |
|---|---|
| El API no arranca: "Variables de entorno invalidas" | Falta `.env` o `JWT_SECRET` tiene menos de 16 caracteres. Copiar `.env.example`. |
| El login dice "Correo o contrasena incorrectos" con los usuarios demo | Los usuarios demo terminan en `@craisa.test`. Si la base esta vacia, ejecutar `npm run db:seed`. |
| Error 500 o "No hay conexion con el servidor" al ingresar | La web esta abierta pero el API (puerto 8081) no. Ejecutar `npm run dev`, que levanta los dos, o `npm run dev -w @craisa/api` si la web ya esta corriendo. |
| "Demasiados intentos" al ingresar | Proteccion activa solo en produccion: 10 intentos fallidos cada 15 minutos por IP. Se libera sola o reiniciando el API. |
| Vite abre en el puerto 3001 y no en el 3000 | Ya hay otro proceso usando el 3000. Ambos funcionan; cerrar el sobrante si confunde. |
| Las pruebas e2e fallan con "port already used" | Quedo abierto un servidor de pruebas en el 3101 o el 8191. Cerrar ese proceso y repetir. |
| `prisma migrate reset` se niega a ejecutarse desde un asistente de IA | Proteccion de Prisma. Ejecutarlo a mano y solo sobre bases de desarrollo. |

## Convenciones del codigo

Estan en `AGENTS.md`. En resumen:

- Textos de interfaz y comentarios en espanol sin tildes.
- Listas visibles en orden alfabetico (los estados siguen el orden del embudo, a proposito).
- Los comentarios explican por que, no que hace el codigo.
- No se hace commit sin aprobacion.
