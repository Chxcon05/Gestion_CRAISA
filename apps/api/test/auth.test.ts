import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app, login, resetDb, PASSWORD } from './helpers.ts'
import { prisma } from '../src/lib/prisma.ts'

describe('auth', () => {
  beforeAll(resetDb)

  it('rechaza credenciales incorrectas sin revelar si el correo existe', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: 'ana@t.cr', password: 'mala' })
    const b = await request(app).post('/api/auth/login').send({ email: 'nadie@t.cr', password: 'mala' })
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(a.body.error.message).toBe(b.body.error.message)
  })

  it('emite cookie httpOnly y responde /me', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@t.cr', password: PASSWORD })
    expect(res.status).toBe(200)
    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toMatch(/craisa_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    const agent = await login('ana@t.cr')
    const me = await agent.get('/api/auth/me')
    expect(me.body).toMatchObject({ email: 'ana@t.cr', role: 'VENDEDOR' })
  })

  it('bloquea el API sin sesion', async () => {
    expect((await request(app).get('/api/leads')).status).toBe(401)
  })

  it('un usuario desactivado pierde el acceso de inmediato', async () => {
    const agent = await login('beto@t.cr')
    await prisma.user.update({ where: { email: 'beto@t.cr' }, data: { active: false } })
    expect((await agent.get('/api/leads')).status).toBe(401)
  })

  it('solo ADMIN gestiona usuarios', async () => {
    const vendedor = await login('ana@t.cr')
    expect((await vendedor.get('/api/users')).status).toBe(403)
    const admin = await login('admin@t.cr')
    expect((await admin.get('/api/users')).status).toBe(200)
  })
})
