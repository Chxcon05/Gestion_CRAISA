import { Router } from 'express'
import { compare, hashSync } from 'bcryptjs'
import { rateLimit } from 'express-rate-limit'
import { loginSchema } from '@craisa/shared'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { HttpError, parse } from '../lib/http.ts'
import { audit } from '../lib/audit.ts'
import { clearSession, currentUser, requireAuth, setSession } from './session.ts'

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Solo cuentan los intentos fallidos, y en desarrollo no se limita: el contador vive en memoria y bloqueaba las pruebas manuales.
  skipSuccessfulRequests: true,
  skip: () => env.NODE_ENV !== 'production',
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiados intentos, espere unos minutos' } },
})

// Hash fijo para comparar aunque el correo no exista: el tiempo de respuesta no revela que cuentas hay.
const DUMMY_HASH = hashSync('no-existe', 10)

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  const ok = await compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok || !user.active) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contrasena incorrectos')
  }
  setSession(res, user.id)
  await audit(user.id, 'LOGIN')
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role })
})

authRouter.post('/logout', (_req, res) => {
  clearSession(res)
  res.status(204).end()
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(currentUser(req))
})
