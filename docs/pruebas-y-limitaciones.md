# Pruebas y limitaciones

## Entorno

| Elemento | Detalle |
|---|---|
| Sistema | Windows 11, Node.js 24, PostgreSQL 18 local |
| Base de pruebas | `craisa_test`, separada de la de desarrollo (se migra y se limpia en cada corrida) |
| Navegador e2e | Google Chrome de escritorio, configuracion regional es-CR |
| Fecha de la corrida | 11/11/2026 |

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
| `packages/shared`: reglas de validacion | 9 | 9 aprobadas |
| `apps/api`: API contra PostgreSQL | 24 | 24 aprobadas |
| `apps/web`: e2e con Playwright | 8 | 8 aprobadas |
| Build de produccion | - | Correcto; chunk inicial de 214 KB (69 KB gzip) |

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

- **Integraciones.** No hay integraciones automaticas con WhatsApp, Meta, correo, ERP ni inventarios: los leads se registran a mano. Esta fuera del alcance de esta version.
- **Lineas y productos.** Son de ejemplo. Mercadeo debe definir los definitivos en **Catalogos**.
- **Duplicados.** No se detectan duplicados: el mismo cliente puede registrarse dos veces.
- **Archivos adjuntos.** No hay adjuntos (cotizaciones, fotos) en la bitacora.
- **Contrasenas.** No hay recuperacion de contrasena por correo; la restablece un administrador. Tampoco hay inicio de sesion unico con las cuentas corporativas.
- **Graficos.** El dashboard cuenta leads por fecha de ingreso. No mide tiempos de respuesta ni conversion entre etapas.
- **Exportacion.** Limitada a 10 000 filas por archivo.
- **Validacion cruzada.** La regla "telefono o correo" se muestra solo cuando el resto del formulario ya es valido, por como evalua Zod las reglas que combinan campos.
- **Despliegue.** Respaldos, monitoreo y alojamiento no estan configurados: dependen de la aprobacion de TI.

## Mejoras futuras sugeridas

1. Confirmar con CRAISA si existe un CRM corporativo antes de seguir invirtiendo en este prototipo.
2. Formulario web publico o integracion con WhatsApp Business y Meta Lead Ads para crear leads automaticamente.
3. Deteccion de duplicados por telefono o correo al registrar.
4. Recordatorios por correo de las proximas acciones vencidas.
5. Reportes de embudo: conversion por etapa, tiempo promedio de respuesta y resultados por vendedor.
6. Inicio de sesion unico con Microsoft 365 o Google Workspace, y recuperacion de contrasena.
7. Adjuntos en la bitacora y vinculo con las cotizaciones del ERP.
