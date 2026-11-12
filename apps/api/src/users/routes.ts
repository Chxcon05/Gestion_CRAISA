import { Router } from 'express'
import { hash } from 'bcryptjs'
import { userCreateSchema, userUpdateSchema } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { HttpError, param, parse } from '../lib/http.ts'
import { audit } from '../lib/audit.ts'
import { currentUser } from '../auth/session.ts'

export const usersRouter = Router()

const publicFields = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const

usersRouter.get('/', async (_req, res) => {
  res.json(await prisma.user.findMany({ orderBy: { name: 'asc' }, select: publicFields }))
})

usersRouter.post('/', async (req, res) => {
  const { password, ...data } = parse(userCreateSchema, req.body)
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await hash(password, 10) },
    select: publicFields,
  })
  await audit(currentUser(req).id, 'USUARIO_CREADO', `${user.email} (${user.role})`)
  res.status(201).json(user)
})

usersRouter.patch('/:id', async (req, res) => {
  const me = currentUser(req)
  const id = param(req, 'id')
  const { password, ...data } = parse(userUpdateSchema, req.body)
  // Evita que el ultimo administrador se bloquee a si mismo.
  if (id === me.id && (data.active === false || (data.role && data.role !== 'ADMIN'))) {
    throw new HttpError(400, 'SELF_LOCKOUT', 'No puede desactivarse ni quitarse el rol de administrador')
  }
  const user = await prisma.user.update({
    where: { id },
    data: { ...data, ...(password && { passwordHash: await hash(password, 10) }) },
    select: publicFields,
  })
  await audit(me.id, 'USUARIO_ACTUALIZADO', `${user.email}: ${Object.keys(req.body ?? {}).join(', ')}`)
  res.json(user)
})
