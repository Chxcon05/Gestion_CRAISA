import { beforeEach, describe, expect, it } from 'vitest'
import { login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
})

describe('auditoria', () => {
  it('solo el admin consulta la auditoria', async () => {
    const ana = await login('ana@t.cr')
    expect((await ana.get('/api/audit')).status).toBe(403)
  })

  it('lista lo mas reciente primero con el usuario', async () => {
    const admin = await login('admin@t.cr')
    await admin.get('/api/leads/export.csv')
    const res = await admin.get('/api/audit')
    expect(res.status).toBe(200)
    expect(res.body.items[0].action).toBe('EXPORTACION_CSV')
    expect(res.body.items[0].user.name).toBe('Admin')
    expect(res.body.total).toBe(2)
  })

  it('filtra por accion y usuario', async () => {
    const admin = await login('admin@t.cr')
    await login('ana@t.cr')
    const byAction = await admin.get('/api/audit?action=LOGIN')
    expect(byAction.body.total).toBe(2)
    const byUser = await admin.get(`/api/audit?action=LOGIN&userId=${ctx.ana.id}`)
    expect(byUser.body.items.map((i: { user: { name: string } }) => i.user.name)).toEqual(['Ana Vendedora'])
  })

  it('rechaza una accion desconocida', async () => {
    const admin = await login('admin@t.cr')
    expect((await admin.get('/api/audit?action=BORRAR_TODO')).status).toBe(400)
  })
})
