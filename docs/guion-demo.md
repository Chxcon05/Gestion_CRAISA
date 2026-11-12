# Guion de la demostracion (unos 10 minutos)

**Preparacion:** ejecute `npm run db:seed` para tener datos ficticios frescos (180 leads de los ultimos 6 meses) y `npm run dev`. Abra http://localhost:3000.

1. **Acceso por rol (1 min).** Ingrese como `mercadeo@craisa.test`. Explique los tres roles y que el sistema limita la informacion segun la funcion autorizada.
2. **Inicio (2 min).** Muestre el bloque **Tu dia** (vencidas, hoy, semana) y el embudo comercial. Cambie el periodo a **Este anio**. Pulse *WhatsApp* en Canal de origen para pasar al listado filtrado.
3. **Busqueda y filtros (1 min).** Pulse la pestana *En seguimiento* y busque una empresa. Copie la direccion para mostrar que los filtros se comparten.
4. **Exportacion (1 min).** Pulse **Exportar a Excel** y abra el archivo en Excel: solo vienen las filas filtradas, con acentos correctos.
5. **Registro (2 min).** Pulse **Nuevo lead** e intente guardar vacio para mostrar la validacion. Complete los datos: la ficha de canal *Feria*, linea *Agricola*, producto, responsable *Carlos Mora* y una proxima accion. Guarde.
6. **Seguimiento (2 min).** En el detalle, use **Actualizar estado** para pasar a *Contactado* con una nota. Agregue otra nota. Muestre la bitacora y la fecha de ultima actualizacion.
7. **Vista del vendedor (1 min).** Cierre sesion e ingrese como `carlos.mora@craisa.test`. El lead recien creado aparece; los de otros vendedores no. No tiene acceso a Usuarios ni Catalogos.
8. **Cierre.** Repase las limitaciones y los siguientes pasos (`docs/pruebas-y-limitaciones.md`).
