import { compare } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureAdmin } from '../src/users/bootstrap.ts'
import { prisma } from '../src/lib/prisma.ts'
import request from 'supertest'
import { app, resetDb } from './helpers.ts'

beforeEach(async () => {
  await resetDb()
})

const vars = { ADMIN_EMAIL: 'Jefa@Craisa.cr', ADMIN_NAME: 'Jefa CRAISA', ADMIN_PASSWORD: 'clave-segura-1' }

describe('primer administrador', () => {
  it('crea el admin y permite ingresar con esa clave', async () => {
    expect(await ensureAdmin(vars)).toEqual({ status: 'creado', email: 'jefa@craisa.cr' })
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'jefa@craisa.cr' } })
    expect(user.role).toBe('ADMIN')
    expect(await compare('clave-segura-1', user.passwordHash)).toBe(true)
    const res = await request(app).post('/api/auth/login').send({ email: 'jefa@craisa.cr', password: 'clave-segura-1' })
    expect(res.status).toBe(200)
  })

  it('no toca un usuario que ya existe ni le cambia la clave', async () => {
    await ensureAdmin(vars)
    const before = await prisma.user.findUniqueOrThrow({ where: { email: 'jefa@craisa.cr' } })
    expect(await ensureAdmin({ ...vars, ADMIN_PASSWORD: 'otra-clave-99' })).toEqual({ status: 'existente', email: 'jefa@craisa.cr' })
    const after = await prisma.user.findUniqueOrThrow({ where: { email: 'jefa@craisa.cr' } })
    expect(after.passwordHash).toBe(before.passwordHash)
  })

  it('sin ADMIN_EMAIL no hace nada y con clave corta falla', async () => {
    const users = await prisma.user.count()
    expect(await ensureAdmin({})).toEqual({ status: 'omitido' })
    await expect(ensureAdmin({ ...vars, ADMIN_PASSWORD: 'corta' })).rejects.toThrow()
    expect(await prisma.user.count()).toBe(users)
  })
})
