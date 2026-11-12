import { beforeAll, describe, expect, it } from 'vitest'
import { leadInput, login, resetDb } from './helpers.ts'
import { bucketOf, buckets } from '../src/dashboard/service.ts'

describe('agrupacion por periodo', () => {
  it('agrupa por semana ISO desde el lunes y por mes', () => {
    expect(bucketOf('2026-11-11', 'week')).toBe('2026-11-09')
    expect(bucketOf('2026-11-09', 'week')).toBe('2026-11-09')
    expect(bucketOf('2026-11-11', 'month')).toBe('2026-11')
    expect(buckets('2026-11-28', '2027-01-03', 'month')).toEqual(['2026-11', '2026-12', '2027-01'])
  })
})

describe('dashboard', () => {
  beforeAll(async () => {
    const ctx = await resetDb()
    const agent = await login('mercadeo@t.cr')
    const base = { businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }
    await agent.post('/api/leads').send(leadInput({ ...base, entryDate: '2026-11-02', channel: 'FERIA' }))
    await agent.post('/api/leads').send(leadInput({ ...base, entryDate: '2026-11-03' }))
    const r = await agent.post('/api/leads').send(leadInput({ ...base, entryDate: '2026-11-10', businessLineId: ctx.carga.id }))
    await agent.post(`/api/leads/${r.body.code}/status`).send({ status: 'GANADO' })
    await agent.post('/api/leads').send(leadInput({ ...base, entryDate: '2026-09-01' }))
  })

  it('cuenta por estado, canal, linea y periodo dentro del rango', async () => {
    const agent = await login('mercadeo@t.cr')
    const d = (await agent.get('/api/dashboard?from=2026-11-01&to=2026-11-15&granularity=week')).body
    expect(d.kpis).toMatchObject({ total: 3, won: 1, open: 2, winRate: 100 })
    expect(d.byStatus.find((s: { key: string }) => s.key === 'NUEVO').count).toBe(2)
    expect(d.byChannel.find((s: { key: string }) => s.key === 'FERIA').count).toBe(1)
    expect(d.byLine.map((l: { label: string; count: number }) => [l.label, l.count])).toEqual([
      ['Agricola', 2],
      ['Carga', 1],
    ])
    expect(d.series).toEqual([
      { period: '2026-10-26', count: 0 },
      { period: '2026-11-02', count: 2 },
      { period: '2026-11-09', count: 1 },
    ])
  })

  it('sin periodo cuenta todo el historial, igual que el listado sin filtros', async () => {
    const agent = await login('mercadeo@t.cr')
    const d = (await agent.get('/api/dashboard')).body
    const list = (await agent.get('/api/leads')).body
    const nuevos = (await agent.get('/api/leads?status=NUEVO')).body
    expect(d.range.from).toBe('2026-09-01')
    expect(d.kpis.total).toBe(list.total)
    expect(d.byStatus.find((s: { key: string }) => s.key === 'NUEVO').count).toBe(nuevos.total)
  })

  it('aplica el alcance del vendedor', async () => {
    const beto = await login('beto@t.cr')
    const d = (await beto.get('/api/dashboard?from=2026-01-01&to=2026-12-31')).body
    expect(d.kpis.total).toBe(0)
  })
})
