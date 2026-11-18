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

## Buscar y filtrar

En **Leads**:

- **Buscar:** escriba parte del nombre, la empresa, el codigo, el correo o el telefono. El buscador de la barra superior funciona desde cualquier pantalla.
- **Pestanas de estado:** arriba de la tabla, cada estado muestra cuantos leads tiene. Pulse uno para ver solo esos.
- **Filtrar:** por **Canal** o **Linea** (puede marcar varios valores), por responsable o por rango de fechas de ingreso.
- **Seguimiento:** los botones **Vencidas**, **Para hoy** y **Esta semana** muestran los leads abiertos segun la fecha de su proxima accion.
- **Ordenar:** pulse el titulo de una columna.
- **Limpiar** quita todos los filtros.

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
- **Ir al detalle:** pulse una barra para abrir el listado con ese filtro aplicado.

## Notificaciones

La campana de la barra superior muestra un numero rojo con los avisos sin leer. Pulse la campana para ver los ultimos 20:

- **Le asignaron un lead:** alguien lo registro o lo reasigno a su nombre.
- **Lead nuevo desde Sitio web o WhatsApp:** entro solo por un canal digital y quedo a su cargo.
- **Actividad en sus leads:** otra persona cambio el estado o agrego una nota en un lead que usted atiende.

Pulse un aviso para abrir el lead; queda marcado como leido. **Marcar todas como leidas** limpia el contador. Si tiene acciones vencidas, arriba aparece un aviso rojo que abre el listado con esos leads. La campana se actualiza sola cada minuto.

## Exportar a Excel

En **Leads**, aplique los filtros que necesite y pulse **Exportar a Excel**. El archivo es un Excel (.xlsx) con exactamente los registros filtrados: arriba indica cuantos son, con que filtros y quien lo genero; los encabezados quedan fijos, cada columna trae filtro, el estado va con su color y las acciones vencidas en rojo.

## Administracion (solo Administrador)

- **Usuarios:** crear usuarios con rol y contrasena inicial, cambiar el rol, y desactivar o reactivar el acceso. Un usuario desactivado no puede ingresar, pero sus leads se conservan.
- **Productos:** agregar lineas de negocio y productos, y activarlos o desactivarlos. Una opcion desactivada deja de aparecer en el formulario sin afectar los leads que ya la usan.
- **Leads automaticos:** las consultas del formulario Contactenos del sitio web y los mensajes de WhatsApp entran solos (un lead por mensaje), asignadas al administrador y con la etiqueta "Automatico" junto al canal. El administrador abre el lead, elige la linea de negocio correcta y lo asigna al responsable desde Editar.
