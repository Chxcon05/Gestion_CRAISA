# Acta de verificacion de entrega

**Criterio de entrega:** el proyecto se considera entregado cuando sea posible registrar una consulta, localizarla, actualizar su estado, visualizar los datos en los indicadores, exportar registros autorizados y consultar la documentacion para continuar su mantenimiento.

Verificado el 11/11/2026 con datos ficticios. La prueba `apps/web/e2e/aceptacion.spec.ts` recorre en el navegador los pasos 1 a 5, en orden y sobre un mismo lead.

| # | Criterio | Como se cumple | Evidencia automatica |
|---|---|---|---|
| 1 | Registrar una consulta | **Nuevo lead**: fecha, nombre, empresa, telefono, correo, canal, linea y producto, descripcion y responsable. Valida los campos obligatorios y asigna el codigo LEAD-AAAA-####. | e2e `aceptacion` paso 1; `leads.spec` (validacion); api `registro de leads` (4 pruebas) |
| 2 | Localizarla | Buscador global y del listado (nombre, empresa, codigo, correo, telefono); pestanas por estado; filtros por canal, linea, responsable, fechas y seguimiento. | e2e `aceptacion` paso 2; api `busqueda y filtros` |
| 3 | Actualizar su estado | **Actualizar estado** o la linea de etapas, con nota en la bitacora. Perdido exige motivo. Se actualizan la fecha de ultima actualizacion y la proxima accion. | e2e `aceptacion` paso 3; `leads.spec` (perdido con motivo); api `seguimiento` (4 pruebas) |
| 4 | Visualizar los datos en los indicadores | **Inicio**: acciones del dia, totales, embudo por estado, canal, linea y evolucion por periodo. Con el periodo **Todo** coincide con el listado. | e2e `aceptacion` paso 4 (el total y el estado suben en 1); api `dashboard` (4 pruebas) |
| 5 | Exportar registros autorizados | **Exportar a Excel** descarga lo filtrado. Cada rol exporta solo lo que puede ver: un vendedor no recibe leads de otros. | e2e `aceptacion` paso 5; `leads.spec` (el CSV tiene las mismas filas que el listado); api `exportacion CSV` y `csv` |
| 6 | Consultar la documentacion para el mantenimiento | `README.md` (instalacion), `docs/documentacion-tecnica.md`, `docs/modelo-datos.md`, `docs/mantenimiento.md`, `docs/manual-usuario.md`, `docs/pruebas-y-limitaciones.md` y `docs/guion-demo.md`. | Revision manual |

## Resultado de la verificacion

| Comprobacion | Resultado |
|---|---|
| `npm run lint` | Sin errores ni avisos |
| `npm run typecheck` | Sin errores |
| Pruebas de reglas (`packages/shared`) | 9 de 9 |
| Pruebas de API contra PostgreSQL (`apps/api`) | 24 de 24 |
| Pruebas en navegador (`apps/web/e2e`) | 8 de 8, incluida la de aceptacion |
| `npm run build` | Correcto |

## Pendiente de CRAISA (fuera del alcance del prototipo)

- Confirmar que no existe un CRM corporativo que deba usarse.
- Aprobar el alojamiento, las credenciales, los respaldos y la revision de TI antes de usar datos reales.
- Definir con Mercadeo las lineas de negocio y los productos definitivos, que se cargan desde Productos.
