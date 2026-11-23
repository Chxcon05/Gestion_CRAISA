import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { backfillScores } from '../src/leads/insights.ts'
import { leadInput, login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
})

describe('duplicados', () => {
  it('encuentra el mismo telefono en otro formato y el mismo correo sin importar mayusculas', async () => {
    const admin = await login('admin@t.cr')
    const base = { businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }
    const first = (await admin.post('/api/leads').send(leadInput({ ...base, phone: '8888-1234', email: 'Cliente@Finca.cr' }))).body

    const byPhone = (await admin.get('/api/leads/duplicates?phone=%2B506%2088881234')).body
    expect(byPhone).toHaveLength(1)
    expect(byPhone[0]).toMatchObject({ code: first.code, matchedBy: ['phone'], canOpen: true })

    const byEmail = (await admin.get('/api/leads/duplicates?email=cliente@finca.cr')).body
    expect(byEmail[0].matchedBy).toEqual(['email'])

    const excluded = (await admin.get(`/api/leads/duplicates?phone=88881234&exclude=${first.code}`)).body
    expect(excluded).toHaveLength(0)
    expect((await admin.get('/api/leads/duplicates?phone=123')).body).toEqual([])
  })

  it('avisa al vendedor del lead de un companero sin dejarlo abrirlo', async () => {
    const admin = await login('admin@t.cr')
    await admin.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id, phone: '7000-1111' }))
    const beto = await login('beto@t.cr')
    const res = (await beto.get('/api/leads/duplicates?phone=70001111')).body
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({ canOpen: false, assignedTo: { name: 'Ana Vendedora' } })
  })
})

describe('prioridad', () => {
  it('guarda el puntaje, lo recalcula al cambiar de etapa y ordena por el', async () => {
    const admin = await login('admin@t.cr')
    const base = { businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }
    // Instagram, sin empresa ni correo: 10 + 5.
    const low = (await admin.post('/api/leads').send(leadInput({ ...base, channel: 'INSTAGRAM', company: '' }))).body
    // Visita, empresa, producto, telefono y correo: 10 + 25 + 15 + 10 + 10.
    const high = (
      await admin.post('/api/leads').send(
        leadInput({ ...base, channel: 'VISITA_COMERCIAL', productId: ctx.tractor.id, email: 'compras@finca.cr' }),
      )
    ).body
    expect(low.priority).toMatchObject({ score: 15, level: 'BAJA' })
    expect(high.priority).toMatchObject({ score: 70, level: 'MEDIA' })

    const sorted = (await admin.get('/api/leads?sort=score&dir=desc')).body.items.map((l: { code: string }) => l.code)
    expect(sorted).toEqual([high.code, low.code])

    const moved = (await admin.post(`/api/leads/${low.code}/status`).send({ status: 'OPORTUNIDAD' })).body
    expect(moved.priority.score).toBe(40)
    const won = (await admin.post(`/api/leads/${high.code}/status`).send({ status: 'GANADO' })).body
    expect(won.priority).toEqual({ level: null, reasons: [], score: 0 })
    expect((await prisma.lead.findUniqueOrThrow({ where: { code: high.code } })).score).toBe(0)
  })

  it('el arranque completa el puntaje de los leads que no lo tienen', async () => {
    const admin = await login('admin@t.cr')
    const { code } = (await admin.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }))).body
    await prisma.lead.update({ where: { code }, data: { score: null } })
    expect(await backfillScores()).toBe(1)
    expect((await prisma.lead.findUniqueOrThrow({ where: { code } })).score).not.toBeNull()
    expect(await backfillScores()).toBe(0)
  })
})

describe('tiempo de respuesta', () => {
  it('mide hasta el primer Contactado y cuenta los que siguen sin contactar', async () => {
    const admin = await login('admin@t.cr')
    const base = { businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id, entryDate: '2026-11-02' }
    const a = (await admin.post('/api/leads').send(leadInput(base))).body
    await admin.post('/api/leads').send(leadInput(base))
    // Registrado ya contactado: no tiene un tiempo de respuesta que medir.
    await admin.post('/api/leads').send(leadInput({ ...base, status: 'CONTACTADO' }))

    await admin.post(`/api/leads/${a.code}/status`).send({ status: 'CONTACTADO' })
    // Se retrocede el registro 6 horas para tener un tiempo conocido.
    await prisma.lead.update({ where: { code: a.code }, data: { createdAt: new Date(Date.now() - 6 * 3_600_000) } })

    const { response } = (await admin.get('/api/dashboard?from=2026-11-01&to=2026-11-30')).body
    expect(response.contacted).toBe(1)
    expect(response.pending).toBe(1)
    expect(response.avgHours).toBeCloseTo(6, 0)
    expect(response.within24h).toBe(100)
    expect(response.bySeller).toEqual([{ key: ctx.ana.id, label: 'Ana Vendedora', avgHours: response.avgHours, contacted: 1 }])
    expect(response.byChannel.map((r: { key: string }) => r.key)).toEqual(['WHATSAPP'])
  })
})
