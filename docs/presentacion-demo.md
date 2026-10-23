# Presentación y guion de demo · CRAISA Leads

Duración total: 15 minutos (8 de demo + 5 de presentación + 2 de preguntas)
Audiencia: gerencia comercial, jefaturas de línea, Mercadeo y TI de CRAISA

## 1. Objetivo de la sesión

Que CRAISA valide tres cosas:

1. La identidad visual y la experiencia de uso son propias de la marca.
2. El flujo comercial cubre el día a día de un vendedor y de la jefatura.
3. El alcance y la ruta de implementación son realistas.

## 2. Diapositivas sugeridas

### Diapositiva 1 · Portada

**Título:** Gestión y Seguimiento de Leads Comerciales
**Subtítulo:** Prototipo funcional · CRAISA 2026
**Visual:** logotipo horizontal sobre fondo blanco, línea azul corporativa.

> Nota: "Buenos días. Presentamos el prototipo del sistema que centraliza los leads de todos los canales de CRAISA."

### Diapositiva 2 · Situación actual

**Título:** El lead llega por muchos canales, pero se pierde en el camino

- Consultas por sitio web, WhatsApp, redes, ferias y visitas.
- Registro disperso en correos, hojas de cálculo y mensajes.
- Sin responsable claro ni próxima acción visible.
- Reportes armados manualmente y con criterios distintos.

**Mensaje clave:** el problema no es generar leads, es darles seguimiento.

### Diapositiva 3 · La propuesta

**Título:** Un solo lugar, un mismo proceso

- Registro único con canal, línea y responsable.
- Siete estados que reflejan la realidad comercial.
- Bitácora y próxima acción en cada lead.
- Tablero para decidir y CSV para analizar.

**Visual:** captura del listado con badges de estado.

### Diapositiva 4 · Identidad CRAISA

**Título:** Diseñado con la marca, no sobre la marca

- Azul corporativo `#143F7F` y paleta por línea de negocio.
- Tipografías Archivo e Inter.
- Tarjetas blancas, bordes finos y acentos de color.
- Sin elementos genéricos: cada color representa una línea.

**Visual:** paleta y componentes (badges, KPIs, botones).

### Diapositiva 5 · El tablero

**Título:** Decidir en segundos

- Cuatro indicadores: total, activos, ganados y requieren acción.
- Filtros que muestran resultados sin salir del tablero.
- Funnel de conversión y dona por línea de negocio.
- Rendimiento del equipo y motivos de pérdida.

**Visual:** captura del tablero completo.

### Diapositiva 6 · El día del vendedor

**Título:** Qué hacer ahora

- Revisar acciones vencidas y leads sin acción.
- Abrir el lead, registrar la nota y reprogramar.
- Cambiar de estado con motivo cuando corresponda.
- Exportar la cartera para seguimiento externo.

**Visual:** secuencia de tres capturas (tablero → ficha → bitácora).

### Diapositiva 7 · Lo que ya funciona

**Título:** Prototipo funcional, no maqueta

- Login con tres roles.
- Alta con validación y detección de duplicados.
- Listado con búsqueda, siete filtros y paginación.
- Ficha con bitácora, historial y notas internas.
- Exportación CSV compatible con Excel.

### Diapositiva 8 · Arquitectura

**Título:** Una base sólida para crecer

- Next.js 15 + TypeScript + Tailwind + shadcn/ui.
- Prisma con SQLite en desarrollo y PostgreSQL en producción.
- Auth.js v5 con roles ADMIN, VENDEDOR y MERCADEO.
- API y validación compartida; despliegue en Vercel.

**Visual:** diagrama de arquitectura.

### Diapositiva 9 · Ruta de implementación

**Título:** Seis fases, un piloto medible

| Fase | Semanas | Entregable |
| --- | --- | --- |
| Fundación | 1–2 | Layout, identidad y navegación |
| Datos | 3–4 | Modelo, API y migraciones |
| Autenticación | 5 | Roles y permisos |
| Tablero | 6–7 | Métricas reales y exportación |
| Calidad | 8 | Pruebas y accesibilidad |
| Piloto | 9–10 | Despliegue y capacitación |

### Diapositiva 10 · Decisiones que necesitamos

**Título:** Para avanzar necesitamos definir

- Dueño funcional del sistema y responsables por línea.
- Regla de duplicados (90 o 180 días).
- Política de retención y respaldo de datos.
- Prioridad de integraciones futuras (WhatsApp, ERP).
- Fecha y grupo del piloto.

### Diapositiva 11 · Cierre

**Título:** Menos leads perdidos, más decisiones con datos

- Un proceso común para las seis líneas.
- Visibilidad inmediata del pipeline.
- Base técnica lista para producción.

**Llamado a la acción:** aprobar el piloto y nombrar contrapartes.

## 3. Guion de la demo (8 minutos)

### Antes de empezar (checklist)

- [ ] Servidor activo: `node server.js` y abrir `http://localhost:8081/`.
- [ ] Navegador en 100 % de zoom, ventana de 1440 px.
- [ ] Pestañas preabiertas: login, tablero, listado, ficha y formulario.
- [ ] Datos demo cargados; sin extensiones que tapen la pantalla.
- [ ] Plan B: capturas en `docs/` o video de respaldo.

### Minuto 0–1 · Acceso

1. Mostrar la pantalla de login.
2. Ingresar como `mrojas@craisa.com` / `demo123`.
3. Señalar la redirección al tablero y el nombre del usuario.

> "El acceso está diferenciado por rol. Un vendedor entra directo a su operación; Mercadeo ve analítica y Administración controla todo."

### Minuto 1–3 · Tablero

1. Recorrer los cuatro KPIs sin leer cada número.
2. Presionar **Vencidas** y mostrar la tabla en la misma página.
3. Cerrar con la **X**.
4. Señalar el funnel y la dona por línea.
5. Bajar a **Rendimiento del equipo** y **Motivos de pérdida**.

> "El tablero no es un adorno: cada bloque responde a una decisión. Vencidas para actuar hoy, motivos de pérdida para ajustar precio o producto."

### Minuto 3–4 · Listado

1. Ir a **Leads**.
2. Buscar "banacol" y mostrar el resultado.
3. Aplicar filtro **Canal: WhatsApp** y luego **Línea: Agrícola**.
4. Señalar los chips y usar **Limpiar**.
5. Exportar CSV y abrir el archivo en Excel.

> "Los filtros se combinan y el CSV respeta exactamente lo filtrado. El archivo abre bien en Excel, con tildes y eñes."

### Minuto 4–5 · Alta de lead

1. Ir a **Nuevo Lead**.
2. Intentar guardar vacío y mostrar los errores.
3. Completar nombre, teléfono y correo.
4. Provocar el aviso de duplicado con un teléfono existente.
5. Guardar y mostrar el código generado.

> "La validación ocurre antes de guardar y la detección de duplicados evita dos vendedores llamando al mismo cliente."

### Minuto 5–7 · Ficha y seguimiento

1. Abrir `LEAD-2026-0141` desde el listado.
2. Mostrar la tarjeta de próxima acción y **Marcar completada**.
3. Ir a **Bitácora**, agregar una nota.
4. Abrir **Cambiar estado**, pasar a **En seguimiento**.
5. Mostrar **Historial de Estados**.

> "Cada interacción queda registrada. Si mañana otra persona atiende al cliente, sabe exactamente qué pasó."

### Minuto 7–8 · Cierre y límites

1. Volver al tablero.
2. Resumir: registro, seguimiento, tablero, exportación.
3. Declarar con transparencia: datos ficticios, sin integraciones, sin persistencia todavía.

> "Lo que vieron es funcional en interfaz y flujos. La siguiente fase conecta la base de datos, los permisos reales y el despliegue."

## 4. Preguntas frecuentes y respuestas sugeridas

**¿Se puede usar ya con datos reales?**
No. Es un prototipo con datos ficticios y sin persistencia. La fase 2 conecta Prisma y la base de datos.

**¿Cuánto cuesta licenciar?**
El stack es de código abierto. El costo principal es implementación, hosting y soporte; se detalla en la propuesta económica.

**¿Se integra con WhatsApp?**
Está previsto, pero requiere la API oficial y consentimiento del cliente. No forma parte del piloto.

**¿Quién puede ver los leads de otra línea?**
Administración y Mercadeo ven todo. Un vendedor ve solo su cartera; la regla se aplica en el servidor.

**¿Qué pasa si dos personas editan el mismo lead?**
En producción se registra auditoría y se puede añadir bloqueo optimista por versión. En el prototipo no aplica.

**¿Se puede exportar todo el histórico?**
Sí, con los filtros activos. Para volúmenes altos se implementará exportación por streaming.

**¿Cómo se mide el éxito del piloto?**
Tres indicadores: leads sin acción reducidos, tiempo de primera respuesta y tasa de cierre por canal.

## 5. Material de apoyo

- `docs/manual-usuario.md` para entregar a los usuarios del piloto.
- `docs/pruebas-y-limitaciones.md` para TI y aseguramiento de calidad.
- `docs/documentacion-tecnica.md` para el equipo de desarrollo.
- `docs/modelo-datos.md` para revisión de datos y reportes.

---

CRAISA 2026 · Guion de presentación del prototipo.
