# CRAISA - Gestion y seguimiento de leads comerciales

Prototipo web para centralizar las consultas comerciales que recibe CRAISA, darles seguimiento y generar
informacion basica para Mercadeo y Ventas. Usa **solo datos ficticios**.

| Funcion del alcance | Donde esta |
|---|---|
| Registro de consultas | `Nuevo lead`: fecha de ingreso, nombre, empresa, telefono, correo, canal, linea/producto, descripcion y responsable |
| Consulta y busqueda | `Leads`: busqueda por texto, filtros por estado, canal, linea, responsable, fechas y acciones vencidas; validacion de obligatorios en cliente y servidor |
| Seguimiento | Detalle del lead: cambio de estado con nota, bitacora, fecha de ultima actualizacion y proxima accion |
| Dashboard | Totales, distribucion por estado, canal, linea y serie por periodo |
| Exportacion | `Exportar CSV` descarga los registros filtrados, compatible con Excel en espanol |

## Tecnologias

- **Monorepo** con npm workspaces: `apps/api`, `apps/web`, `packages/shared`.
- **TypeScript** en todo el codigo.
- **Front:** React 19, Vite, Tailwind CSS 4, componentes accesibles sobre Radix, TanStack Query, React Hook Form y Recharts.
- **API:** Express 5 y Prisma 6 sobre PostgreSQL.
- **Validacion:** Zod; los mismos esquemas sirven al front y al API.
- **Pruebas:** Vitest con Supertest para el API y Playwright para los flujos completos.
- **Lint:** oxlint.

La justificacion de cada eleccion esta en [docs/documentacion-tecnica.md](docs/documentacion-tecnica.md).

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 15 o superior: instalado localmente, o levantado con `docker compose up -d`.
- Google Chrome, solo para las pruebas e2e.

## Puesta en marcha

```bash
npm install
cp .env.example .env          # y completar DATABASE_URL y JWT_SECRET
npm run db:migrate            # crea las tablas y carga los datos ficticios
npm run dev                   # API en :8081 y web en http://localhost:3000
```

Para volver a cargar los datos ficticios: `npm run db:seed`, que **borra todo** lo que haya en la base configurada.

### Usuarios de demostracion

Todos usan la contrasena `Craisa2026!`.

| Correo | Rol | Ve |
|---|---|---|
| admin@craisa.test | Administrador | Todo, ademas de usuarios y catalogos |
| mercadeo@craisa.test | Mercadeo | Todos los leads, el dashboard y la exportacion |
| carlos.mora@craisa.test, diego.vargas@craisa.test, laura.jimenez@craisa.test | Vendedor | Solo sus leads |

## Comandos

| Comando | Que hace |
|---|---|
| `npm run dev` | API y web en modo desarrollo |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript en los tres paquetes |
| `npm test` | Pruebas unitarias y de API (BD `craisa_test`) |
| `npm run test:e2e` | Pruebas Playwright (BD `craisa_test`, puertos 8191 y 3101) |
| `npm run test:todo` | typecheck, pruebas y e2e |
| `npm run build` | Compila la web en `apps/web/dist` |
| `npm start` | API que tambien sirve la web compilada |

## Documentacion

- [Acta de verificacion de entrega](docs/acta-aceptacion.md)
- [Guia de mantenimiento](docs/mantenimiento.md)
- [Modelo de datos](docs/modelo-datos.md)
- [Documentacion tecnica](docs/documentacion-tecnica.md)
- [Manual de usuario](docs/manual-usuario.md)
- [Pruebas y limitaciones](docs/pruebas-y-limitaciones.md)
- [Guion de la demostracion](docs/guion-demo.md)

## Alcance

Es un prototipo. No incluye integraciones con WhatsApp, Meta, correo, ERP ni inventarios, ni cotizaciones automaticas.

Antes de usarlo con datos reales o publicarlo, CRAISA debe:

- confirmar que no existe ya un CRM que deba usarse;
- aprobar el alojamiento, las credenciales y los respaldos;
- pasar por la revision de TI.
