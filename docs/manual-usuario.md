# Manual de usuario · CRAISA Leads

Versión del prototipo: octubre 2026 · Datos ficticios

Este manual explica cómo usar el Sistema de Gestión y Seguimiento de Leads Comerciales de CRAISA. Está organizado por tareas, no por pantallas, para que cada persona encuentre rápido lo que necesita según su rol.

---

## 1. Antes de empezar

### 1.1 Requisitos

- Navegador actualizado: Chrome, Edge, Firefox o Safari.
- Resolución recomendada: 1366 × 768 o superior.
- Conexión local al equipo donde corre el prototipo (`http://localhost:8081`).

### 1.2 Acceso

1. Abrir `http://localhost:8081/`.
2. Ingresar el correo corporativo y la contraseña.
3. Presionar **Ingresar**.

Credenciales de demostración:

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@craisa.com` | `demo123` |
| Vendedora Agrícola | `mrojas@craisa.com` | `demo123` |
| Mercadeo | `rblandon@craisa.com` | `demo123` |

> El prototipo valida el formato del correo y muestra un mensaje claro si las credenciales no coinciden. No utilice contraseñas reales: la autenticación definitiva se implementa en la fase Next.js.

### 1.3 Roles y permisos

| Acción | Administrador | Vendedor | Mercadeo |
| --- | --- | --- | --- |
| Ver todos los leads | Sí | Solo los propios | Sí, solo lectura |
| Crear lead | Sí | Sí | Sí |
| Editar lead | Sí | Solo los propios | No |
| Asignar responsable | Sí | Tomar leads sin asignar | No |
| Cambiar estado | Sí | Sí | No |
| Exportar CSV | Sí | Sí, cartera propia | Sí |
| Ver tablero completo | Sí | Sí, métricas globales | Sí |

---

## 2. Tablero comercial

El tablero es la pantalla de entrada después del login. Resume la operación del periodo y prioriza el trabajo del día.

### 2.1 Leer los indicadores

La fila superior muestra cuatro indicadores:

- **Total de leads del periodo**: volumen recibido según el rango seleccionado.
- **En gestión activa**: leads en estado nuevo, asignado, contactado, seguimiento u oportunidad.
- **Leads ganados**: cierres del periodo y tasa de cierre.
- **Requieren acción**: suma de acciones vencidas y leads sin próxima acción.

Cada tarjeta indica su variación o participación respecto al total.

### 2.2 Filtrar sin salir del tablero

Los botones **Todos los leads**, **Nuevos**, **Sin asignar**, **Vencidas** y **Sin acción** despliegan una tabla de resultados en la misma página, debajo de los botones.

1. Presionar el botón del segmento deseado.
2. Revisar la tabla: código, cliente, empresa, línea, estado y próxima acción.
3. Usar la **X** del encabezado para cerrar los resultados y volver al tablero.
4. Seleccionar una fila para abrir la ficha completa del lead.

### 2.3 Cambiar el periodo

El selector de periodo (esquina superior derecha) ajusta los indicadores y gráficos. Las opciones previstas son últimos 7 días, 30 días, trimestre y año. En el prototipo los datos son de demostración y no cambian con la fecha del sistema.

### 2.4 Interpretar los gráficos

- **Estado de los leads**: barras horizontales con el volumen por estado; permite detectar acumulación en seguimiento.
- **Funnel de conversión**: embudo de siete etapas, desde nuevos hasta ganados, con el porcentaje que avanza en cada paso.
- **Por línea de negocio**: dona con la participación de Agrícola, Construcción, Movimiento de Carga, Agricultura de Precisión, Postventa y Administrativo.
- **Leads por canal**: tarjetas con volumen y conversión por canal (sitio web, WhatsApp, feria, etc.).
- **Rendimiento del equipo**: ranking por leads atendidos, ganados y tasa de cierre.
- **Actividad reciente**: últimas notas y cambios de estado registrados.
- **Motivos de pérdida**: razones más frecuentes para orientar acciones de producto y precio.

### 2.5 Qué hacer ahora

La lista **Qué hacer ahora** prioriza tres frentes: acciones vencidas, leads sin próxima acción y leads sin asignar. Al seleccionar un renglón se abre la tabla filtrada correspondiente. Es el punto de partida recomendado para el vendedor al inicio del día.

---

## 3. Listado de leads

Ruta: **Leads** en el menú superior.

### 3.1 Buscar

El buscador acepta nombre del cliente, empresa o código. La búsqueda se aplica mientras se escribe (con una pausa breve para no recargar en cada tecla) y no distingue mayúsculas.

### 3.2 Filtrar

Se puede combinar cualquier cantidad de filtros:

- **Estado**: los siete estados del flujo.
- **Canal**: los nueve canales de ingreso.
- **Línea**: las seis líneas de negocio.
- **Responsable**: vendedor asignado.
- **Desde / Hasta**: rango de fecha de ingreso.

Los filtros activos aparecen como etiquetas sobre la tabla. Cada etiqueta tiene una **×** para quitarla; **Limpiar** restablece todos los filtros.

Si no hay coincidencias, se muestra un estado vacío con la opción **Limpiar filtros**.

### 3.3 Leer la tabla

| Columna | Qué indica |
| --- | --- |
| Código | Identificador único del lead (`LEAD-2026-0142`) |
| Fecha | Fecha de ingreso |
| Cliente | Persona de contacto |
| Empresa | Organización asociada |
| Canal | Origen del lead |
| Línea | Línea de negocio, con punto de color de marca |
| Score | Prioridad de 1 a 5 estrellas |
| Valor est. | Monto potencial en colones |
| Estado | Etapa actual, con color |
| Responsable | Vendedor asignado |
| Próx. acción | Fecha o texto de la siguiente acción; en rojo si está vencida |
| Acciones | Abrir la ficha del lead |

La tabla muestra 10 registros por página. La paginación indica el rango visible y permite avanzar o retroceder.

### 3.4 Abrir un lead

- Clic en cualquier parte de la fila, o
- Clic en el icono del ojo al final de la fila.

Los clics sobre casillas y botones no abren la ficha, para evitar navegaciones accidentales.

### 3.5 Acciones masivas

1. Marcar una o varias casillas de la primera columna.
2. Aparece la barra de acciones con el conteo de seleccionados.
3. Elegir **Asignar**, **Cambiar estado**, **Exportar seleccionados** o **Eliminar**.
4. Confirmar la acción en el aviso del sistema.

La casilla del encabezado selecciona todos los registros de la página visible. **Limpiar** desmarca la selección.

> En el prototipo las acciones masivas confirman la operación con una notificación, pero no modifican datos de forma permanente.

### 3.6 Exportar a CSV

El botón **Exportar CSV** descarga un archivo con los leads que cumplen los filtros actuales:

- Codificación UTF-8 con BOM, para que Excel muestre correctamente tildes y eñes.
- Valores entre comillas y comillas internas escapadas.
- Nombre del archivo: `craisa_leads_AAAA-MM-DD.csv`.
- Columnas: código, fecha de ingreso, nombre, empresa, teléfono, correo, canal, línea, producto, descripción, estado, responsable, próxima acción y fecha de la próxima acción.

Se recomienda abrir el archivo con **Datos → Desde texto/CSV** en Excel si se desea controlar el separador.

---

## 4. Registrar un lead

Ruta: **Nuevo Lead**.

### 4.1 Completar el formulario

Los campos marcados con asterisco son obligatorios.

1. **Datos de contacto**: nombre, empresa, teléfono y correo.
2. **Origen**: canal, línea de negocio, producto de interés y fecha de ingreso.
3. **Calificación**: valor estimado y prioridad (1–5).
4. **Descripción**: detalle de la consulta.
5. **Responsable**: vendedor que atenderá el lead. Puede quedar sin asignar.

### 4.2 Validaciones

- Nombre: mínimo 2 caracteres.
- Empresa: obligatoria, mínimo 2 caracteres.
- Teléfono: 8 dígitos; se acepta el prefijo `+506` y guiones.
- Correo: formato válido; opcional en el formulario, obligatorio para canales sitio web y correo.
- Fecha de ingreso: no puede ser futura.
- Descripción: obligatoria, máximo 1 000 caracteres.
- Valor estimado: número positivo si se completa.

Los errores aparecen debajo del campo y el formulario desplaza el foco al primer problema.

### 4.3 Detección de duplicados

Al salir del campo teléfono o correo, el sistema busca coincidencias en los últimos 90 días. Si encuentra un lead parecido, muestra un aviso con código, nombre y fecha, y ofrece **Ver lead** o **Continuar de todos modos**. Si se continúa, se deja constancia en la bitácora.

### 4.4 Guardar

1. Presionar **Guardar lead**.
2. El sistema valida, genera el código consecutivo y muestra la confirmación con el código asignado.
3. Desde la confirmación se puede **Ver el lead** o **Registrar otro**.

Si se cancela con datos ingresados, el sistema pide confirmación antes de salir.

---

## 5. Ficha del lead

Ruta: clic en un lead del listado o del tablero.

### 5.1 Encabezado y próxima acción

El encabezado muestra código, cliente, empresa y línea. La tarjeta **Próxima Acción** resume qué hacer, para cuándo y con quién. Desde ahí:

- **Marcar completada**: cierra la tarea y registra el evento en la bitácora.
- **Reprogramar**: abre el formulario de nueva fecha y responsable.

### 5.2 Cambiar de estado

1. Presionar **Cambiar estado**.
2. Elegir el nuevo estado en el modal.
3. Agregar una nota obligatoria cuando el cambio sea a **Perdido** (motivo) o **Ganado** (valor final).
4. Confirmar. El cambio queda registrado con fecha, usuario y estado anterior.

El sistema solo permite transiciones válidas del flujo comercial. Si un salto no está permitido, explica el paso que falta.

### 5.3 Pestañas de la ficha

- **Bitácora**: cronología de notas, llamadas, correos, reuniones y cambios de estado.
- **Historial de Estados**: recorrido del lead por las siete etapas, con fecha y usuario.
- **Archivos**: documentos de cotización o referencia (el prototipo muestra el estado vacío).
- **Notas Internas**: observaciones del equipo que no se comparten con el cliente.

Los datos de contacto, origen, producto, valor, score y responsable se muestran en los bloques superiores de la ficha.

### 5.4 Agregar una nota

1. Ir a **Bitácora** o **Notas Internas**.
2. Escribir la nota y seleccionar el tipo (nota, llamada, correo, WhatsApp, reunión).
3. Presionar **Agregar**. La nota aparece de inmediato con autor y fecha.

Las notas no se eliminan: se corrigen con una nota nueva para conservar la trazabilidad.

### 5.5 Reabrir un lead perdido

El flujo de recontacto está previsto en el modelo de datos (`recontactAt`). En el prototipo, un lead perdido se reabre cambiando su estado a **En seguimiento** desde **Cambiar estado**; el sistema conserva el historial y solicita una nota explicativa.

---

## 6. Preguntas frecuentes

**¿Por qué no veo todos los leads?**
En la versión productiva, el rol Vendedor solo muestra la cartera propia y un Administrador ve el total. En el prototipo la tabla muestra los datos de demostración para poder recorrer todos los flujos.

**¿Puedo cambiar el responsable de un lead ganado?**
Sí, pero queda registrado en el historial. Se recomienda hacerlo solo para efectos de comisión o postventa.

**¿Qué significa el score?**
Es una prioridad sugerida de 1 a 5. Considera canal, valor estimado y si la empresa ya es cliente. El vendedor puede ajustarla.

**¿El CSV respeta los filtros?**
Sí. Exporta exactamente el conjunto filtrado, no solo la página visible.

**¿Los datos se guardan al cerrar el navegador?**
No en el prototipo. La persistencia llega con Prisma y la base de datos en la siguiente fase.

**¿Se puede usar en el celular?**
La interfaz es responsive; el listado exige desplazamiento horizontal en pantallas pequeñas. Para trabajo intensivo se recomienda escritorio.

---

## 7. Buenas prácticas

1. Asignar responsable el mismo día en que ingresa el lead.
2. Toda conversación relevante debe dejar una nota en la bitácora.
3. Nunca cerrar un lead como perdido sin motivo: alimenta el análisis de producto y precio.
4. Revisar **Qué hacer ahora** al iniciar y al cerrar la jornada.
5. Mantener el teléfono y el correo actualizados: son la base de la detección de duplicados.

---

CRAISA 2026 · Manual de usuario del prototipo. Para soporte, contactar al área de Mercadeo o al administrador del sistema.
