# Modelo de datos · CRAISA Leads

Documento de referencia del modelo relacional implementado en `prisma/schema.prisma`. Se mantiene portable entre SQLite (desarrollo y demo) y PostgreSQL (producción): los campos enumerados usan `String` y se validan en la aplicación.

## 1. Diagrama de entidades

```mermaid
erDiagram
    USER ||--o{ LEAD : "responsable"
    USER ||--o{ INTERACTION : "registra"
    USER ||--o{ TASK : "ejecuta"
    USER ||--o{ AUDITLOG : "genera"
    LEAD ||--o{ INTERACTION : "bitacora"
    LEAD ||--o{ TASK : "proxima accion"
    LEAD ||--o{ LEADTAG : "etiquetas"
    TAG  ||--o{ LEADTAG : "clasifica"
    LEAD ||--o{ AUDITLOG : "historial"

    USER {
        string id PK
        string name
        string email UK
        string passwordHash
        string role
        string line
        boolean active
    }
    LEAD {
        string id PK
        string code UK
        datetime entryDate
        string firstName
        string company
        string phone
        string email
        string channel
        string businessLine
        string product
        string description
        string status
        int score
        int estimatedValue
        string lossReason
        datetime recontactAt
        string responsableId FK
    }
    INTERACTION {
        string id PK
        string leadId FK
        string userId FK
        string type
        string content
        string previousStatus
        string newStatus
        datetime createdAt
    }
    TASK {
        string id PK
        string leadId FK
        string assignedToId FK
        string title
        datetime dueDate
        boolean completed
    }
    TAG {
        string id PK
        string name UK
        string color
    }
    LEADTAG {
        string leadId PK
        string tagId PK
    }
    AUDITLOG {
        string id PK
        string userId FK
        string leadId FK
        string action
        string detail
        datetime createdAt
    }
```

## 2. Diccionario de datos · `Lead`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `id` | cuid | Sí | Clave interna, nunca visible al usuario |
| `code` | string | Sí | `LEAD-AAAA-####`, único, consecutivo por año |
| `entryDate` | datetime | Sí | Fecha de ingreso; por defecto hoy, no puede ser futura |
| `firstName` | string | Sí | 2–80 caracteres, letras y espacios |
| `company` | string | No | 2–120 caracteres |
| `phone` | string | Sí | Formato costarricense: 8 dígitos, `+506` opcional |
| `email` | string | Condicional | Obligatorio si el canal es `web` o `correo`; formato válido |
| `channel` | string | Sí | Ver catálogo de canales |
| `businessLine` | string | Sí | Ver catálogo de líneas |
| `product` | string | No | Producto o familia de interés |
| `description` | string | No | Hasta 1 000 caracteres |
| `status` | string | Sí | Por defecto `nuevo`; ver flujo de estados |
| `score` | int | Sí | 1–5; sugerido automáticamente, editable por el vendedor |
| `estimatedValue` | int | No | Monto en colones, mayor o igual a 0 |
| `lossReason` | string | Condicional | Obligatorio al pasar a `perdido` |
| `recontactAt` | datetime | No | Obligatorio al marcar `perdido` si se desea recontactar |
| `responsableId` | FK User | No | Nulo mientras el lead está `nuevo` o `sin asignar` |
| `createdAt` / `updatedAt` | datetime | Sí | Auditoría técnica; `updatedAt` alimenta "Última actualización" |

### Índices

- `(status, updatedAt)`: panel y listado por estado.
- `(responsableId, status)`: cartera del vendedor.
- `(channel)` y `(businessLine)`: gráficos y filtros.
- `(entryDate)`: análisis por periodo.
- `(leadId, createdAt)` en `interactions`: bitácora cronológica.

## 3. Catálogos

### Estados (`status`)

| Clave | Etiqueta | Significado | Acciones permitidas |
| --- | --- | --- | --- |
| `nuevo` | Nuevo | Ingresó y aún no se asigna | Asignar responsable |
| `asignado` | Asignado | Tiene responsable, sin contacto | Contactar, reasignar |
| `contactado` | Contactado | Primer contacto realizado | Programar seguimiento |
| `seguimiento` | En seguimiento | Conversación activa | Registrar nota, crear tarea |
| `oportunidad` | Oportunidad comercial | Cotización o propuesta enviada | Cerrar, reprogramar |
| `ganado` | Ganado | Venta concretada | Cerrar, postventa |
| `perdido` | Perdido | Oportunidad descartada | Registrar motivo, recontactar |

Transiciones válidas:

```mermaid
stateDiagram-v2
    [*] --> nuevo
    nuevo --> asignado
    nuevo --> perdido
    asignado --> contactado
    asignado --> perdido
    contactado --> seguimiento
    contactado --> perdido
    seguimiento --> oportunidad
    seguimiento --> perdido
    oportunidad --> ganado
    oportunidad --> perdido
    ganado --> [*]
    perdido --> seguimiento : recontactar
```

Cualquier transición no listada se rechaza en la capa de servidor y se registra en `AuditLog` si se intenta por API.

### Canales (`channel`)

`web` · `facebook` · `instagram` · `whatsapp` · `llamada` · `correo` · `feria` · `visita` · `otro`

### Líneas de negocio (`businessLine`)

| Clave | Etiqueta | Color de marca |
| --- | --- | --- |
| `agricola` | Agrícola | `#AA182C` |
| `construccion` | Construcción | `#D47E00` |
| `carga` | Movimiento de Carga | `#3DAE2B` |
| `precision` | Agricultura de Precisión | `#004B70` |
| `postventa` | Postventa y Repuestos | `#58595B` |
| `administrativo` | Administrativo | `#0D9488` |

### Motivos de pérdida

`precio` · `competencia` · `sin-presupuesto` · `fuera-de-zona` · `producto-no-disponible` · `sin-respuesta` · `duplicado` · `otro`

## 4. Reglas de negocio

1. **Código consecutivo.** `LEAD-{año}-{secuencia:4}`. La secuencia se reinicia el 1 de enero y se genera en una transacción para evitar duplicados.
2. **Duplicados.** Antes de crear, se compara teléfono normalizado y correo en minúsculas contra leads de los últimos 90 días. La interfaz advierte y permite continuar dejando constancia.
3. **Asignación.** Solo `ADMIN` puede asignar a cualquier vendedor. Un `VENDEDOR` solo puede tomar leads sin responsable o reasignarse los propios.
4. **Visibilidad.** `VENDEDOR` ve únicamente sus leads; `MERCADEO` ve todos en modo lectura y exporta; `ADMIN` ve y edita todo.
5. **Score.** Se sugiere con la fórmula `2 + (canal prioritario) + (valor > umbral) + (empresa conocida)`, acotado a 1–5. El vendedor puede ajustarlo y el cambio queda en bitácora.
6. **Cierre.** `ganado` exige valor estimado mayor que cero. `perdido` exige motivo. Ambos cierran las tareas abiertas.
7. **Recontacto.** Un lead `perdido` con `recontactAt` reaparece en la agenda y puede volver a `seguimiento`.
8. **Eliminación.** Borrado lógico recomendado en producción (`deletedAt`), con bitácora y auditoría; el prototipo elimina solo en memoria.

## 5. Vistas derivadas para el tablero

| Indicador | Cálculo |
| --- | --- |
| Total de leads | `COUNT(leads)` del periodo |
| Nuevos del periodo | `COUNT` con `entryDate` dentro del rango |
| Oportunidades | `COUNT` con `status = oportunidad` |
| Ganados | `COUNT` con `status = ganado` |
| Tasa de conversión | `ganados / (ganados + perdidos)` |
| Valor del pipeline | `SUM(estimatedValue)` de estados abiertos |
| Ticket promedio | `SUM(estimatedValue) / COUNT(ganados)` |
| Leads sin acción | Sin `Task` abierta o `updatedAt` > 7 días |
| Acciones vencidas | `Task.dueDate < hoy AND completed = false` |

## 6. Migración a PostgreSQL

1. Cambiar `provider` a `postgresql` en `prisma/schema.prisma`.
2. `DATABASE_URL="postgresql://usuario:clave@host:5432/craisa_leads?schema=public"`.
3. `npx prisma migrate dev --name init` en desarrollo y `prisma migrate deploy` en producción.
4. Opcional: convertir los catálogos `String` a enums nativos de PostgreSQL y agregar restricciones `CHECK` equivalentes.
5. Programar respaldo diario y retención de 30 días antes de la puesta en marcha.
