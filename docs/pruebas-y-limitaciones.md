# Pruebas y limitaciones

## Entorno

| Elemento | Detalle |
|---|---|
| Sistema | Windows 11, Node.js 24, PostgreSQL 18 local |
| Base de pruebas | `craisa_test`, separada de la de desarrollo (se migra y se limpia en cada corrida) |
| Navegador e2e | Google Chrome de escritorio, configuracion regional es-CR |
| Fecha de la corrida | 26/11/2026 |

## Como ejecutarlas

```bash
npm run lint        # oxlint
npm run test:todo   # typecheck + pruebas unitarias y de API + e2e
npm run build       # compilacion de la web
```

## Resultados

| Suite | Pruebas | Resultado |
|---|---|---|
| Lint (oxlint) | Todo `apps/` y `packages/` | 0 errores, 0 avisos |
| Typecheck (tsc estricto) | shared, api y web | Sin errores |
| `packages/shared`: reglas de validacion | 13 | 13 aprobadas |
| `apps/api`: API contra PostgreSQL | 110 | 110 aprobadas |
| `apps/web`: e2e con Playwright | 12 | 12 aprobadas |
| Build de produccion | - | Correcto; chunk inicial de 240 KB (77 KB gzip) |

### Cobertura funcional

| Requisito | Pruebas que lo cubren |
|---|---|
| Registro con campos obligatorios y validacion | shared: obligatorios, telefono o correo, canal invalido. api: errores por campo, producto fuera de la linea. e2e: formulario vacio y registro completo |
| Codigo unico | api: secuencia `LEAD-2026-0001`, `0002` |
| Busqueda y filtros | api: texto, estado, canal, linea, fechas, paginacion y orden. e2e: filtro por canal reflejado en la URL |
| Seguimiento | api: cambio de estado con bitacora, motivo obligatorio al perder, la nota mueve la fecha de ultima actualizacion, proxima accion y reasignacion. e2e: cambio de estado con nota y perdido con motivo |
| Dashboard | api: conteos por estado, canal, linea y semana dentro del rango; sin periodo coincide con el listado; agrupacion semanal y mensual |
| Exportacion CSV | api: BOM, `;`, CRLF, filtros respetados, neutraliza formulas. e2e: descarga con el mismo numero de filas que el listado |
| Acceso por rol | api: vendedor solo ve lo suyo (404 en leads ajenos), no asigna a otros, solo ADMIN borra y gestiona usuarios, usuario desactivado pierde acceso. e2e: vendedor sin menu de administracion y con 403 en /api/users |
| Seguridad de sesion | api: cookie httpOnly, mismo mensaje con correo inexistente o contrasena mala, 401 sin sesion |

### Revision manual

- Pantallas revisadas en Chrome a 1440 px y en emulacion movil real a 375 px: login, dashboard, listado, detalle y formulario.
- Consola del navegador sin errores.
- Navegacion completa por teclado en dialogos, menus y filtros (componentes Radix).

## Limitaciones conocidas

- **Integraciones.** Los leads entran solos desde el correo info@craisa.com, Facebook e Instagram (mensajes y formularios Lead Ads), el sitio web y WhatsApp. Las llamadas, ferias y visitas se registran a mano, y no hay integracion con ERP ni inventarios. Los comentarios publicos en las publicaciones no crean leads.
- **Lineas y productos.** Son las secciones y equipos del sitio web de CRAISA. Si cambia el catalogo, Mercadeo los ajusta en **Productos**.
- **Duplicados.** Se avisa cuando el telefono o el correo ya existen, pero no se bloquea el registro: lo decide el vendedor. Solo el administrador puede fusionar dos leads, y la fusion no se puede deshacer.
- **Archivos adjuntos.** La bitacora acepta capturas (PNG, JPG o WebP); no hay adjuntos de otro tipo, como cotizaciones en PDF.
- **Importacion.** Solo archivos .xlsx, hasta 5 MB y 1000 filas. Los duplicados se avisan pero se importan igual.
- **Tablero.** Muestra hasta 50 leads por columna; el resto se ve en la tabla. En el celular no se arrastra: se usa el menu Mover a.
- **Contrasenas.** No hay recuperacion de contrasena por correo; la restablece un administrador. Tampoco hay inicio de sesion unico con las cuentas corporativas.
- **Graficos.** El dashboard cuenta leads por fecha de ingreso. No mide tiempos de respuesta ni conversion entre etapas.
- **Exportacion.** Limitada a 10 000 filas por archivo.
- **Validacion cruzada.** La regla "telefono o correo" se muestra solo cuando el resto del formulario ya es valido, por como evalua Zod las reglas que combinan campos.
- **Despliegue.** Respaldos, monitoreo y alojamiento no estan configurados: dependen de la aprobacion de TI.

## Mejoras futuras sugeridas

1. Confirmar con CRAISA si existe un CRM corporativo antes de seguir invirtiendo en este prototipo.
2. Recordatorios por correo de las proximas acciones vencidas.
3. Reportes de embudo: conversion por etapa, tiempo promedio de respuesta y resultados por vendedor.
4. Inicio de sesion unico con Microsoft 365 o Google Workspace, y recuperacion de contrasena por correo.
5. Plantillas de respuesta rapida para WhatsApp y correo.
6. Adjuntos en PDF en la bitacora y vinculo con las cotizaciones del ERP.
