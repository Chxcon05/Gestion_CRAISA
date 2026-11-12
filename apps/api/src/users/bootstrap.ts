import { hash } from 'bcryptjs'
import { userCreateSchema } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { audit } from '../lib/audit.ts'

export interface BootstrapVars {
  ADMIN_EMAIL?: string
  ADMIN_NAME?: string
  ADMIN_PASSWORD?: string
}

// Primer administrador de un servidor nuevo: el seed no corre en produccion y sin un admin nadie
// puede entrar ni recibir leads. Nunca toca un usuario existente, asi que se puede dejar en el
// arranque sin riesgo de reiniciar una contrasena cambiada desde la pantalla Usuarios.
export async function ensureAdmin(vars: BootstrapVars) {
  if (!vars.ADMIN_EMAIL) return { status: 'omitido' as const }
  const email = vars.ADMIN_EMAIL.trim().toLowerCase()
  if (await prisma.user.findUnique({ where: { email } })) return { status: 'existente' as const, email }
  const data = userCreateSchema.parse({
    email,
    name: vars.ADMIN_NAME ?? '',
    password: vars.ADMIN_PASSWORD ?? '',
    role: 'ADMIN',
  })
  const { password, ...rest } = data
  const user = await prisma.user.create({ data: { ...rest, passwordHash: await hash(password, 10) } })
  await audit(null, 'USUARIO_CREADO', `${user.email} (ADMIN, primer arranque)`)
  return { status: 'creado' as const, email: user.email }
}
