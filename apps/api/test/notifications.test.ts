import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app, leadInput, login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
})

const createFor = async (assignedToId: string, over: Record<string, unknown> = {}) => {
  const admin = await login('admin@t.cr')
  const res = await admin.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId, ...over }))
  return { admin, code: res.body.code as string }
}

describe('notificaciones', () => {
  it('avisa al vendedor cuando le asignan un lead y no al que lo asigno', async () => {
    await createFor(ctx.ana.id)
    const ana = await login('ana@t.cr')
    const res = await ana.get('/api/notifications')
    expect(res.status).toBe(200)
    expect(res.body.unread).toBe(1)
    expect(res.body.items[0]).toMatchObject({ type: 'ASIGNACION', lead: { code: 'LEAD-2026-0001' }, readAt: null })
    expect(res.body.items[0].actor.name).toBe('Admin')
    const admin = await login('admin@t.cr')
    expect((await admin.get('/api/notifications')).body.items).toHaveLength(0)
  })

  it('no avisa a quien se asigna su propio lead', async () => {
    const ana = await login('ana@t.cr')
    await ana.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }))
    expect((await ana.get('/api/notifications')).body.unread).toBe(0)
  })

  it('avisa al responsable de cambios de estado y notas hechos por otro', async () => {
    const { admin, code } = await createFor(ctx.ana.id)
    await admin.post(`/api/leads/${code}/status`).send({ status: 'CONTACTADO' })
    await admin.post(`/api/leads/${code}/notes`).send({ content: 'Llamar el lunes' })
    const ana = await login('ana@t.cr')
    const res = await ana.get('/api/notifications')
    expect(res.body.unread).toBe(3)
    expect(res.body.items.map((n: { message: string }) => n.message)).toEqual([
      'Admin agrego una nota',
      'Admin cambio el estado a Contactado',
      'Admin le asigno un lead nuevo',
    ])
  })

  it('al reasignar avisa al nuevo responsable y el anterior deja de ver los avisos de ese lead', async () => {
    const { admin, code } = await createFor(ctx.ana.id)
    await admin.patch(`/api/leads/${code}`).send({ assignedToId: ctx.beto.id })
    const beto = await login('beto@t.cr')
    expect((await beto.get('/api/notifications')).body.items[0].message).toBe('Admin le asigno este lead')
    const ana = await login('ana@t.cr')
    expect((await ana.get('/api/notifications')).body.items).toHaveLength(0)
  })

  it('marca una o todas como leidas, solo las propias', async () => {
    const { admin, code } = await createFor(ctx.ana.id)
    await admin.post(`/api/leads/${code}/notes`).send({ content: 'Primera nota' })
    await createFor(ctx.beto.id)
    const ana = await login('ana@t.cr')
    const [first] = (await ana.get('/api/notifications')).body.items
    expect((await ana.post(`/api/notifications/${first.id}/read`)).status).toBe(204)
    expect((await ana.get('/api/notifications')).body.unread).toBe(1)
    await ana.post('/api/notifications/read-all')
    expect((await ana.get('/api/notifications')).body.unread).toBe(0)
    // Beto conserva la suya sin leer aunque Ana marco todas.
    const beto = await login('beto@t.cr')
    const betoList = (await beto.get('/api/notifications')).body
    expect(betoList.unread).toBe(1)
    await ana.post(`/api/notifications/${betoList.items[0].id}/read`)
    expect((await beto.get('/api/notifications')).body.unread).toBe(1)
  })

  it('cuenta las acciones vencidas de los leads abiertos que el usuario ve', async () => {
    await createFor(ctx.ana.id, { nextAction: 'Llamar', nextActionAt: '2026-01-05' })
    await createFor(ctx.beto.id, { nextAction: 'Llamar', nextActionAt: '2026-01-05' })
    await createFor(ctx.ana.id, { nextAction: 'Visitar', nextActionAt: '2026-01-05', status: 'GANADO' })
    const ana = await login('ana@t.cr')
    expect((await ana.get('/api/notifications')).body.overdue).toBe(1)
    const admin = await login('admin@t.cr')
    expect((await admin.get('/api/notifications')).body.overdue).toBe(2)
  })

  it('pide sesion', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401)
  })
})
