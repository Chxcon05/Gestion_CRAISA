# Pruebas y limitaciones · CRAISA Leads

Versión evaluada: prototipo funcional con `prisma` + PostgreSQL (`craisa`) · Octubre 2026

## 1. Entorno de prueba

| Elemento | Detalle |
| --- | --- |
| Sistema operativo | Windows 11 |
| Node.js | 24.x |
| Navegador de referencia | Chrome / Edge actuales |
| Servidor | `node server.js` en `http://localhost:8081` |
| Automatización | jsdom sobre el DOM y los scripts de cada página |
| Datos | Base PostgreSQL `craisa` (`prisma` activo); datos reales sin nombres ficticios (`Admin CRAISA`, responsables mapeados); respaldo en `leads-db.json` |

La verificación automatizada carga cada página con sus scripts, ejecuta eventos reales (`change`, `input`, `submit`) y comprueba el DOM resultante. La revisión visual final debe realizarse con CRAISA en la demo.

## 2. Resumen de resultados

| Área | Casos | Aprobados | Observaciones |
| --- | --- | --- | --- |
| Acceso y sesión | 4 | 4 | Validación y sesión simulada |
| Tablero | 5 | 5 | Filtros en página y cierre de resultados |
| Listado de leads | 9 | 9 | Búsqueda, filtros, paginación, selección |
| Registro de lead | 5 | 5 | Validaciones y confirmación |
| Ficha del lead | 6 | 6 | Cambio de estado, bitácora, pestañas |
| Exportación CSV | 3 | 3 | BOM, escape y filtros |
| Calidad técnica | 4 | 4 | Sintaxis, codificación, consola |

Total: **36 casos ejecutados, 36 aprobados**.

## 3. Casos detallados

### 3.1 Acceso

| ID | Caso | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| AC-01 | Enviar formulario vacío | Mensajes en correo y contraseña; no navega | Aprobado |
| AC-02 | Correo con formato inválido | Mensaje "Ingrese un correo electrónico válido" | Aprobado |
| AC-03 | Credenciales incorrectas | Mensaje general "Correo o contraseña incorrectos" | Aprobado |
| AC-04 | Credenciales de vendedora | Guarda sesión con rol `VENDEDOR` y redirige | Aprobado (`sessionStorage` verificado) |

### 3.2 Tablero

| ID | Caso | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| DB-01 | Cargar tablero | Cuatro KPIs en una fila y secciones sin errores | Aprobado |
| DB-02 | Presionar "Nuevos" | Tabla de resultados en la misma página, sin navegar | Aprobado |
| DB-03 | Presionar "Vencidas" | Filtra leads con acción anterior a hoy | Aprobado |
| DB-04 | Cerrar resultados con la X | Oculta la tabla y conserva el tablero | Aprobado |
| DB-05 | Cambiar periodo | El selector actualiza la etiqueta del rango | Aprobado (datos demo estáticos) |

### 3.3 Listado de leads

| ID | Caso | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| LD-01 | Carga inicial | 10 filas y paginación "1–10 de 27" | Aprobado |
| LD-02 | Buscar "banacol" | 1 fila, código `LEAD-2026-0140` | Aprobado |
| LD-03 | Filtrar estado "ganado" | 3 filas | Aprobado |
| LD-04 | Filtrar canal "WhatsApp" | 4 filas y chip de filtro activo | Aprobado |
| LD-05 | Filtrar línea "Agrícola" | 6 filas | Aprobado |
| LD-06 | Filtrar responsable "M. Rojas" | 8 filas | Aprobado |
| LD-07 | Rango 18/10–19/10 | 4 filas y dos chips de fecha | Aprobado |
| LD-08 | Limpiar filtros | Vuelve a 10 filas y oculta chips | Aprobado |
| LD-09 | Seleccionar fila | Barra de acciones con el conteo | Aprobado |

### 3.4 Registro de lead

| ID | Caso | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| NL-01 | Enviar vacío | 7 errores visibles, sin excepciones | Aprobado |
| NL-02 | Teléfono con letras | Error de formato | Aprobado |
| NL-03 | Correo inválido | Error de formato | Aprobado |
| NL-04 | Duplicado por teléfono | Aviso con código y opción de continuar | Aprobado |
| NL-05 | Guardar válido | Modal de confirmación con código generado | Aprobado |

### 3.5 Ficha del lead

| ID | Caso | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| DT-01 | Abrir `?code=LEAD-2026-0141` | El título muestra el código solicitado | Aprobado |
| DT-02 | Cambiar pestaña | Solo el contenido seleccionado queda visible | Aprobado |
| DT-03 | Abrir modal de estado | Modal visible y foco en el primer control | Aprobado |
| DT-04 | Confirmar estado | Notificación y actualización de la etiqueta | Aprobado |
| DT-05 | Agregar nota | La nota aparece en la bitácora con fecha | Aprobado |
| DT-06 | Abrir un código distinto | Cliente, empresa, línea, estado y bitácora corresponden al lead | Aprobado (`LEAD-2026-0141` → Luis Miranda) |

### 3.6 Exportación y calidad

| ID | Caso | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| EX-01 | Exportar sin filtros | Archivo con 27 filas más encabezado | Aprobado |
| EX-02 | Exportar con filtro | Solo las filas filtradas | Aprobado |
| EX-03 | Abrir en Excel | Tildes y eñes correctas por BOM UTF-8 | Aprobado |
| QA-01 | `node --check` en scripts | Sin errores de sintaxis | Aprobado |
| QA-02 | Detección de U+FFFD / mojibake | 0 caracteres corruptos | Aprobado |
| QA-03 | Carga de las cinco páginas en jsdom | Sin errores de consola | Aprobado |
| QA-04 | Enlaces y rutas con query string | `server.js` resuelve sin 404 | Aprobado |

## 4. Defectos encontrados y corregidos

| # | Defecto | Causa | Corrección |
| --- | --- | --- | --- |
| 1 | La tabla de leads aparecía vacía | Selector `.card:last-child > .card-body > div:last-child` devolvía `null` y detenía el render | Se agregó `#paginationBar` y se usó un ID estable |
| 2 | Filtros de canal, línea y responsable no devolvían filas | Los `value` eran claves (`whatsapp`) y los datos etiquetas (`WhatsApp`) | Mapas inversos `CANAL_KEYS`, `LINEA_KEYS`, `RESPONSABLE_KEYS` |
| 3 | El clic en una casilla abría la ficha | El manejador de fila solo excluía enlaces y botones | Se excluyen `input` y `label` con `closest()` |
| 4 | Fechas "Desde/Hasta" no filtraban | Controles sin ID ni manejador | IDs `dateFrom`/`dateTo`, parseo `DD/MM/AAAA` y chips |
| 5 | Acentos corruptos y BOM en archivos editados | Lectura/escritura con codificación ANSI de PowerShell | Reescritura UTF-8 sin BOM y verificación con Node |
| 6 | Chips de filtro mostraban "undefined" | Se indexaba la etiqueta con la clave | Normalización previa a la búsqueda en el mapa |

## 5. Limitaciones conocidas

1. **Sin persistencia.** Al recargar, los cambios vuelven al estado inicial. Las acciones masivas y los cambios de estado solo confirman con una notificación.
2. **Datos duplicados.** El tablero (`DASH_LEADS`) mantiene su propio arreglo agregado de 184 registros. El listado y la ficha ya comparten `js/leads-data.js`, pero el tablero puede desincronizarse. En producción habrá una sola fuente.
3. **Autenticación simulada.** Las credenciales viven en el JavaScript del cliente y no hay sesión de servidor.
4. **Permisos visuales.** El rol se muestra en la interfaz, pero el filtrado por cartera se aplicará en el servidor en la fase Next.js.
5. **Fechas relativas.** El tablero usa fechas fijas de octubre de 2026; no recalcula "hoy" al cambiar el día.
6. **Sin integraciones.** No hay conexión con WhatsApp, Meta, correo ni ERP.
7. **Adjuntos.** La pestaña Archivos existe, pero no permite cargar documentos.
8. **Recontacto.** El campo `recontactAt` está modelado; la acción dedicada se implementará en la fase productiva.
9. **Accesibilidad.** Hay etiquetas y foco básico, pero no se ha ejecutado una auditoría completa con lector de pantalla.
10. **Rendimiento.** El prototipo maneja 27 filas; no se evaluó con volúmenes de producción.

## 6. Plan de pruebas para la fase Next.js

| Tipo | Herramienta | Cobertura mínima |
| --- | --- | --- |
| Unitarias | Vitest | Validaciones Zod, generación de código, CSV |
| Integración | Vitest + Prisma | CRUD, permisos por rol, transacciones |
| End-to-end | Playwright | Login, alta, seguimiento, cierre, exportación |
| Accesibilidad | axe-core | Formularios, modales, tablas |
| Carga | k6 | 50 usuarios concurrentes y 50 000 leads |
| Seguridad | OWASP ZAP baseline | XSS, inyección, sesión |

Criterios de aceptación del piloto:

- 0 defectos críticos abiertos.
- Cobertura de pruebas mayor o igual a 70 % en lógica de negocio.
- Exportación de 10 000 filas en menos de 5 segundos.
- Aprobación funcional de los tres roles por parte de CRAISA.

---

CRAISA 2026 · Resultados de prueba del prototipo. Los datos utilizados son ficticios.
