import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Role, SessionUser } from '@craisa/shared'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { HttpError, forbidden } from '../lib/http.ts'

export const COOKIE = 'craisa_session'
const MAX_AGE_MS = 8 * 60 * 60 * 1000

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser
    }
  }
}

export function setSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: MAX_AGE_MS / 1000 })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: '/' })
}

const unauthenticated = (msg: string) => new HttpError(401, 'UNAUTHENTICATED', msg)

// Se consulta el usuario en cada peticion para que desactivar o cambiar el rol surta efecto de inmediato.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[COOKIE]
  if (typeof token !== 'string') throw unauthenticated('Inicie sesion')
  let sub: string
  try {
    // Algoritmo fijo: no se acepta un token que diga venir firmado con otro, como "none".
    sub = (jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as { sub: string }).sub
  } catch {
    throw unauthenticated('La sesion expiro, ingrese de nuevo')
  }
  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, name: true, email: true, role: true, active: true },
  })
  if (!user || !user.active) throw unauthenticated('Usuario no autorizado')
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role }
  next()
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden()
    next()
  }

export function currentUser(req: Request): SessionUser {
  if (!req.user) throw unauthenticated('Inicie sesion')
  return req.user
}
