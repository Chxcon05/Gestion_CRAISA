// Uso: ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD como variables de entorno, y npm run db:admin -w @craisa/api.
import { ZodError } from 'zod'
import { ensureAdmin } from '../src/users/bootstrap.ts'
import { prisma } from '../src/lib/prisma.ts'

const MENSAJES = {
  creado: (email?: string) => `Administrador creado: ${email}`,
  existente: (email?: string) => `El usuario ${email} ya existe; no se modifico.`,
  omitido: () => 'Sin ADMIN_EMAIL: no se crea ningun administrador.',
}

try {
  const r = await ensureAdmin(process.env)
  console.info(MENSAJES[r.status]('email' in r ? r.email : undefined))
} catch (err) {
  if (err instanceof ZodError) {
    console.error('No se pudo crear el administrador:', err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  } else {
    console.error('No se pudo crear el administrador:', err)
  }
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
