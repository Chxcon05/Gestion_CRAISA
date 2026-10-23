# CRAISA · Sistema de Gestión y Seguimiento de Leads Comerciales

Prototipo funcional del sistema interno de leads de **CRAISA** (Centro de Repuestos Agrícolas e Industriales). Esta primera entrega es una aplicación web estática —HTML, CSS y JavaScript sin dependencias— que reproduce la identidad visual del Libro de Marca 2025 y valida los flujos comerciales antes de la migración a Next.js.

## Contenido del repositorio

```
.
├── index.html            Inicio de sesión (3 roles demo)
├── dashboard.html        Panel comercial con KPIs y filtros en página
├── leads.html            Listado, búsqueda, filtros, acciones masivas y CSV
├── detalle-lead.html     Ficha del lead, bitácora, tareas y cambio de estado
├── nuevo-lead.html       Registro con validación y detección de duplicados
├── reportes.html         Reportes: resumen, funnel, pipeline, canal, equipo y pérdidas
├── css/styles.css        Design system CRAISA 2025
├── js/app.js             Utilidades de interfaz y notificaciones
├── js/leads-data.js      Datos ficticios compartidos (listado y ficha)
├── assets/               Logotipo, favicon e imágenes de marca
├── server.js             Servidor estático local (puerto 8081)
├── prisma/schema.prisma  Modelo de datos propuesto (SQLite / PostgreSQL)
└── docs/                 Manual, documentación técnica, pruebas y demo
```

## Ejecutar el prototipo

Requisitos: Node.js 18 o superior.

```bash
node server.js
```

Abrir <http://localhost:8081/>. El servidor sirve archivos estáticos y descarta los query strings (`?code=...`, `?filter=...`) para resolver la ruta.

También es posible abrir `index.html` directamente en el navegador; el servidor solo es necesario para probar la navegación con parámetros.

## Usuarios de demostración

| Correo | Contraseña | Rol | Alcance |
| --- | --- | --- | --- |
| `admin@craisa.com` | `demo123` | Administrador | Todos los leads y la configuración |
| `mrojas@craisa.com` | `demo123` | Vendedora · Agrícola | Leads de su línea y cartera |
| `rblandon@craisa.com` | `demo123` | Mercadeo | Lectura, analítica y exportación |

La autenticación es simulada en el cliente: **no usar credenciales reales en el prototipo**. La versión Next.js incorpora Auth.js v5 con hash de contraseña y sesiones en servidor.

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/manual-usuario.md](docs/manual-usuario.md) | Guía paso a paso por rol y por pantalla |
| [docs/documentacion-tecnica.md](docs/documentacion-tecnica.md) | Arquitectura, modelo de datos, rutas y migración |
| [docs/modelo-datos.md](docs/modelo-datos.md) | Diccionario de datos, relaciones y reglas de negocio |
| [docs/pruebas-y-limitaciones.md](docs/pruebas-y-limitaciones.md) | Casos de prueba, resultados y alcance |
| [docs/presentacion-demo.md](docs/presentacion-demo.md) | Guion de la demo y diapositivas sugeridas |

## Alcance de esta entrega

Incluye registro, asignación, seguimiento, bitácora, tareas, tablero, filtros, exportación CSV compatible con Excel y control de acceso por rol simulado. No incluye integraciones reales (WhatsApp, Meta, ERP), envío de correo ni persistencia: los datos son ficticios y viven en el código de cada página.

## Próxima fase

Migración a **Next.js 15 + TypeScript + Tailwind + shadcn/ui + Prisma + Auth.js v5**, con SQLite en desarrollo y PostgreSQL en producción. El detalle de la ruta de migración está en `docs/documentacion-tecnica.md`.

---

CRAISA 2026 · Documento de prototipo. Datos ficticios de uso exclusivamente demostrativo.
