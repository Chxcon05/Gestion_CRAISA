# Manual de usuario

## Ingresar

Abra el sistema, escriba su correo y su contrasena, y pulse **Ingresar**. La sesion dura 8 horas. Para salir, use el menu con su nombre (arriba a la derecha) y elija **Cerrar sesion**.

Lo que puede ver y hacer depende de su rol:

- **Administrador (Mercadeo):** todos los leads, el dashboard, la exportacion y la administracion de usuarios y productos.
- **Vendedor:** solo los leads asignados a usted o registrados por usted.

## Registrar una consulta

1. Pulse **Nuevo lead** (boton azul de la barra lateral; en el celular, el boton **+** de arriba).
2. Complete los campos marcados con asterisco. Debe indicar al menos un telefono o un correo.
   - **Contacto:** nombre, empresa, telefono y correo.
   - **Origen e interes:** elija el canal tocando su ficha; luego la fecha de ingreso (por defecto, hoy), la linea de negocio, el producto (opcional, depende de la linea) y la descripcion.
   - **Asignacion y seguimiento:** responsable, estado inicial y, si ya la conoce, la proxima accion con su fecha.
3. Pulse **Registrar lead**. El sistema le asigna un codigo `LEAD-AAAA-####` y abre su detalle.

Si falta un dato o tiene un formato invalido, el campo se marca en rojo con el motivo.

- **Clientes repetidos:** al escribir el telefono o el correo, si ya existe un lead con ese dato aparece un aviso amarillo con su codigo, estado y responsable. El telefono se compara por sus ultimos 8 digitos, asi que +506 8888-1234 y 88881234 cuentan como el mismo. El aviso tambien se muestra en el detalle del lead.
- **Fusionar (solo Administrador):** en el aviso del detalle, **Fusionar** junto al lead repetido abre una comparacion de los dos. Elija cual se conserva y pulse **Fusionar**: la bitacora, las capturas y los avisos del otro pasan al conservado, que solo toma del otro los datos que le falten (correo, empresa, telefono). El otro lead se elimina y no se puede deshacer.

## Buscar y filtrar

En **Leads**:

- **Buscar:** escriba parte del nombre, la empresa, el codigo, el correo o el telefono. El buscador de la barra superior funciona desde cualquier pantalla.
- **Pestanas de estado:** arriba de la tabla, cada estado muestra cuantos leads tiene. Pulse uno para ver solo esos.
- **Filtrar:** por **Canal** o **Linea** (puede marcar varios valores), por responsable o por rango de fechas de ingreso.
- **Seguimiento:** los botones **Vencidas**, **Para hoy** y **Esta semana** muestran los leads abiertos segun la fecha de su proxima accion.
- **Ordenar:** pulse el titulo de una columna.
- **Prioridad:** cada lead abierto tiene un puntaje de 0 a 100 (Alta desde 80, Media desde 60) segun la etapa, el canal, si es una empresa, si tiene producto, si dejo telefono y correo y si la consulta es detallada. Ordene por **Prioridad** para atender primero los mas prometedores; en el detalle se explica de donde salio cada punto. Los ganados y perdidos no tienen prioridad.
- **Limpiar** quita todos los filtros.
- **Tabla, Tablero y Calendario:** el selector junto a los filtros cambia la forma de ver los mismos leads filtrados.
  - **Tablero:** una columna por estado. Arrastre una tarjeta a otra columna para cambiar su estado, o use el boton **...** de la tarjeta y **Mover a** (en el celular es la unica forma). Al moverla a Perdido se pide el motivo. Cada columna muestra hasta 50 leads; el enlace del final abre el resto en la tabla.
  - **Calendario:** las proximas acciones de los leads abiertos en su fecha. Las vencidas aparecen en rojo en el dia de hoy. Use las flechas para cambiar de mes y **Hoy** para volver; en el celular se ve como una lista por dia.

Los filtros quedan en la direccion de la pagina: puede guardarla en favoritos o enviarla a un companero.

## Dar seguimiento

En el detalle del lead:

- **Contactar:** los botones **Llamar**, **WhatsApp** y **Correo** abren la llamada, el chat o el correo con el cliente.

- **Actualizar estado:** elija el nuevo estado y, si quiere, escriba una nota. Para marcarlo como **Perdido** debe indicar el motivo. Tambien puede pulsar directamente una etapa en la linea de etapas, o **Marcar como perdido**.
- **Agregar nota:** registre llamadas, correos o acuerdos. Cada nota guarda el autor y la hora.
- **Proxima accion:** pulse **Definir** o **Cambiar**, describa la accion y la fecha. Si la fecha pasa y el lead sigue abierto, se marca como vencida en rojo.
- **Editar:** cambie los datos del contacto, la linea, el producto o el responsable. Las reasignaciones quedan en la bitacora.

La **Bitacora de gestion** muestra todo el historial, del mas reciente al mas antiguo. La fecha de **Ultima actualizacion** cambia con cada gestion.

## Inicio (dashboard)

- **Tu dia:** tres tarjetas con las acciones vencidas, las de hoy y las de los proximos 7 dias. Pulse una para ver esos leads.

- **Periodo:** por defecto **Todo**, que cuenta los mismos leads que el listado sin filtros. Tambien puede elegir 7, 30 o 90 dias, el anio en curso o un rango personalizado; en ese caso se cuentan los leads por su fecha de ingreso.
- **Indicadores:** leads registrados, nuevos sin atender, oportunidades y tasa de cierre (ganados entre ganados y perdidos).
- **Embudo comercial:** cuantos leads hay en cada etapa y que porcentaje representan.
- **Graficos:** leads ingresados por dia, semana o mes; canal de origen y linea de negocio.
- **Tiempo de respuesta:** promedio desde que entra un lead hasta que se marca Contactado, el porcentaje atendido en menos de 24 horas y cuantos siguen sin contactar. Se puede ver por vendedor (solo el administrador) o por canal. Los leads registrados ya contactados no cuentan, porque no hubo espera que medir.
- **Ir al detalle:** pulse una barra para abrir el listado con ese filtro aplicado.

## Notificaciones

La campana de la barra superior muestra un numero rojo con los avisos sin leer. Pulse la campana para ver los ultimos 20:

- **Le asignaron un lead:** alguien lo registro o lo reasigno a su nombre.
- **Lead nuevo desde Sitio web o WhatsApp:** entro solo por un canal digital y quedo a su cargo.
- **Actividad en sus leads:** otra persona cambio el estado o agrego una nota en un lead que usted atiende.

Pulse un aviso para abrir el lead; queda marcado como leido. **Marcar todas como leidas** limpia el contador. Si tiene acciones vencidas, arriba aparece un aviso rojo que abre el listado con esos leads. La campana se actualiza sola cada minuto.

## Exportar a Excel

En **Leads**, aplique los filtros que necesite y pulse **Exportar a Excel**. El archivo es un Excel (.xlsx) con exactamente los registros filtrados: arriba indica cuantos son, con que filtros y quien lo genero; los encabezados quedan fijos, cada columna trae filtro, el estado va con su color y las acciones vencidas en rojo.

## Importar desde Excel (solo Administrador)

En **Leads**, pulse **Importar** y luego **Descargar plantilla**. Llene una fila por cliente: Nombre, Canal, Linea y Descripcion son obligatorios, y hace falta telefono o correo. La fecha va como dd/mm/aaaa (vacia es hoy) y el Responsable es el correo del vendedor (vacio queda Nuevo, sin asignar). Suba el archivo: el sistema revisa cada fila y muestra los errores y los clientes que ya existen, sin crear nada. Pulse **Importar** para crear solo las filas sin errores. Hasta 1000 filas por archivo.

## Administracion (solo Administrador)

- **Auditoria:** lista de ingresos, exportaciones, importaciones, fusiones, borrados y cambios de usuarios, con fecha, usuario y detalle. Se filtra por accion, usuario y fechas.

- **Usuarios:** crear usuarios con rol y contrasena inicial, cambiar el rol, y desactivar o reactivar el acceso. Un usuario desactivado no puede ingresar, pero sus leads se conservan.
- **WhatsApp del vendedor:** en la columna WhatsApp de Usuarios se escribe su numero (8 digitos, o con codigo de pais si es de otro pais). Cada vez que se le asigne un lead le llega un WhatsApp desde el numero de la empresa con los datos del cliente, un enlace para escribirle y otro para abrir el lead. Sin numero, solo ve el aviso en la campana.
- **Productos:** agregar lineas de negocio y productos, y activarlos o desactivarlos. Una opcion desactivada deja de aparecer en el formulario sin afectar los leads que ya la usan.
- **Leads automaticos:** las consultas del formulario Contactenos del sitio web, los mensajes de WhatsApp y los correos que llegan a info@craisa.com entran solos, asignadas al administrador y con la etiqueta "Automatico" junto al canal. El administrador abre el lead, elige la linea de negocio correcta y lo asigna al responsable desde Editar. Si un cliente manda varios WhatsApp seguidos no se crean varios leads: los mensajes siguientes aparecen en la bitacora de su lead como "Cliente escribio", hasta que ese lead se cierre como Ganado o Perdido.
