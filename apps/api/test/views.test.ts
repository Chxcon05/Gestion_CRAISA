import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEAD_STATUSES, type BoardColumn, type LeadListItem } from '@craisa/shared'
import { prisma } from '../src/lib/prisma.ts'
import { leadInput, login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>
let admin: Awaited<ReturnType<typeof login>>

beforeEach(async () => {
  // Solo se finge Date: hoy queda fijo en el 26/11/2026 de Costa Rica sin tocar los timers de Prisma.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-26T15:00:00Z'))
  ctx = await resetDb()
  admin = await login('admin@t.cr')
})

afterEach(() => {
  vi.useRealTimers()
})

const create = async (over: Record<string, unknown> = {}, agent = admin) => {
  const res = await agent.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id, ...over }))
  if (res.status !== 201) throw new Error(`crear lead: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body as LeadListItem
}

const names = (body: LeadListItem[]) => body.map((l) => l.contactName)

describe('tablero', () => {
  it('agrupa por estado en el orden del embudo', async () => {
    await create({ contactName: 'Uno', status: 'NUEVO' })
    await create({ contactName: 'Dos', status: 'NUEVO' })
    await create({ contactName: 'Tres', status: 'CONTACTADO' })
    const res = await admin.get('/api/leads/board')
    expect(res.status).toBe(200)
    expect(res.body.columns.map((c: BoardColumn) => c.status)).toEqual([...LEAD_STATUSES])
    expect(res.body.columns[0].total).toBe(2)
    expect(res.body.columns[2].items.map((l: LeadListItem) => l.contactName)).toEqual(['Tres'])
  })

  it('limita a 50 tarjetas pero informa el total', async () => {
    await prisma.lead.createMany({
      data: Array.from({ length: 55 }, (_, i) => ({
        businessLineId: ctx.agricola.id,
        channel: 'FERIA' as const,
        code: `LEAD-2026-${String(i + 1).padStart(4, '0')}`,
        contactName: `Cliente ${i}`,
        description: 'Consulta de prueba',
        entryDate: new Date('2026-11-02T00:00:00Z'),
        phone: '8888-0000',
      })),
    })
    const col = (await admin.get('/api/leads/board')).body.columns[0]
    expect(col.items).toHaveLength(50)
    expect(col.total).toBe(55)
  })

  it('respeta el alcance del vendedor e ignora el filtro de estado', async () => {
    await create({ contactName: 'De Ana', status: 'GANADO' })
    await create({ assignedToId: ctx.beto.id, contactName: 'De Beto', status: 'NUEVO' })
    const res = await (await login('beto@t.cr')).get('/api/leads/board?status=GANADO')
    const totals = Object.fromEntries(res.body.columns.map((c: BoardColumn) => [c.status, c.total]))
    expect(totals).toMatchObject({ GANADO: 0, NUEVO: 1 })
  })
})

describe('calendario', () => {
  it('trae solo las acciones del mes, con sus bordes', async () => {
    await create({ contactName: 'Fin', nextAction: 'Llamar', nextActionAt: '2026-12-31' })
    await create({ contactName: 'Inicio', nextAction: 'Llamar', nextActionAt: '2026-12-01' })
    await create({ contactName: 'Fuera', nextAction: 'Llamar', nextActionAt: '2027-01-01' })
    const res = await admin.get('/api/leads/calendar?month=2026-12')
    expect(res.status).toBe(200)
    expect(names(res.body)).toEqual(['Inicio', 'Fin'])
  })

  it('agrega los vencidos solo si el mes contiene hoy', async () => {
    await create({ contactName: 'Vencido', nextAction: 'Llamar', nextActionAt: '2026-10-05' })
    expect(names((await admin.get('/api/leads/calendar?month=2026-11')).body)).toContain('Vencido')
    expect(names((await admin.get('/api/leads/calendar?month=2026-12')).body)).not.toContain('Vencido')
  })

  it('excluye cerrados y respeta el alcance del vendedor', async () => {
    await create({ contactName: 'De Ana', nextAction: 'Llamar', nextActionAt: '2026-12-10' })
    await create({ assignedToId: ctx.beto.id, contactName: 'De Beto', nextAction: 'Llamar', nextActionAt: '2026-12-10' })
    await create({ contactName: 'Ganado', nextAction: 'Llamar', nextActionAt: '2026-12-11', status: 'GANADO' })
    const res = await (await login('ana@t.cr')).get('/api/leads/calendar?month=2026-12')
    expect(names(res.body)).toEqual(['De Ana'])
  })

  it('aplica los filtros del listado', async () => {
    await create({ channel: 'FERIA', contactName: 'Feria', nextAction: 'Llamar', nextActionAt: '2026-12-10' })
    await create({ contactName: 'WhatsApp', nextAction: 'Llamar', nextActionAt: '2026-12-10' })
    expect(names((await admin.get('/api/leads/calendar?month=2026-12&channel=FERIA')).body)).toEqual(['Feria'])
  })

  it('rechaza un mes mal escrito', async () => {
    expect((await admin.get('/api/leads/calendar?month=2026-13')).status).toBe(400)
    expect((await admin.get('/api/leads/calendar')).status).toBe(400)
  })
})
