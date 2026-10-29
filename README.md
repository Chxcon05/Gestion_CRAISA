# CRAISA - Gestión de Leads

## Requisitos
- Node.js 18+
- PostgreSQL (o SQLite si se cambia `prisma/schema.prisma`)

## Pasos para correr en otra máquina

1. Copiar esta carpeta completa.
2. Si no tenés `node_modules`: abrir terminal en esta carpeta y ejecutar:
   `npm install`
3. Crear archivo `.env` con:
   `DATABASE_URL="postgresql://usuario:clave@localhost:5432/craisa"`
   (usá tus datos de base de datos; si usás SQLite, cambiá `provider` en `prisma/schema.prisma`)
4. Ejecutar:
   `npx prisma generate`
5. Iniciar el servidor:
   `node server.js`
6. Abrir navegador en `http://localhost` (puerto que indique `server.js`).

Nota: no se copia `.env` de la máquina original porque contiene datos locales.
Para pasar con datos, usar:
  pg_dump -U postgres -h localhost -d nombre_base -F c -f backup.dump
Y en la otra máquina:
  pg_restore -U postgres -h localhost -d nombre_base backup.dump
Después configurar `.env` y correr `node server.js`.
