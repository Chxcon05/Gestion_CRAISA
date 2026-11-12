import { beforeEach, describe, expect, it } from 'vitest'
import { leadInput, login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
})

const create = async (email: string, over: Record<string, unknown> = {}) => {
  const agent = await login(email)
  const res = await agent
    .post('/api/leads')
    .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id, ...over }))
  return { agent, res }
}

describe('registro de leads', () => {
  it('crea con codigo secuencial y deja la creacion en la bitacora', async () => {
    const { agent, res } = await create('mercadeo@t.cr')
    expect(res.status).toBe(201)
    expect(res.body.code).toBe('LEAD-2026-0001')
    expect(res.body.interactions[0].type).toBe('CREACION')
    const second = await agent
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }))
    expect(second.body.code).toBe('LEAD-2026-0002')
  })

  it('valida campos obligatorios y devuelve errores por campo', async () => {
    const { res } = await create('mercadeo@t.cr', { contactName: '', channel: 'X' })
    expect(res.status).toBe(400)
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['contactName', 'channel']))
    // La regla cruzada (telefono o correo) corre cuando el resto de campos ya es valido.
    const { res: noContact } = await create('mercadeo@t.cr', { phone: '', email: '' })
    expect(noContact.body.error.fields.phone).toBe('Indique telefono o correo')
  })

  it('rechaza un producto que no pertenece a la linea', async () => {
    const { res } = await create('mercadeo@t.cr', { businessLineId: ctx.carga.id, productId: ctx.tractor.id })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.productId).toBeDefined()
  })

  it('un vendedor no puede asignar leads a otro vendedor', async () => {
    const { res } = await create('ana@t.cr', { assignedToId: ctx.beto.id })
    expect(res.status).toBe(403)
  })
})

describe('alcance por rol', () => {
  it('cada vendedor ve solo sus leads; mercadeo ve todos', async () => {
    const { agent: mercadeo } = await create('mercadeo@t.cr', { contactName: 'De Ana' })
    await mercadeo
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.beto.id, contactName: 'De Beto' }))

    const ana = await login('ana@t.cr')
    const list = await ana.get('/api/leads')
    expect(list.body.total).toBe(1)
    expect(list.body.items[0].contactName).toBe('De Ana')
    expect((await ana.get('/api/leads/LEAD-2026-0002')).status).toBe(404)
    expect((await mercadeo.get('/api/leads')).body.total).toBe(2)
  })
})

describe('busqueda y filtros', () => {
  it('filtra por texto, estado, canal, linea y fechas', async () => {
    const { agent } = await create('admin@t.cr', { contactName: 'Maria Lopez', channel: 'FERIA', entryDate: '2026-10-01' })
    await agent
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.carga.id, assignedToId: ctx.ana.id, contactName: 'Pedro Rojas' }))

    expect((await agent.get('/api/leads?q=lopez')).body.total).toBe(1)
    expect((await agent.get('/api/leads?channel=FERIA,WHATSAPP')).body.total).toBe(2)
    expect((await agent.get(`/api/leads?businessLineId=${ctx.carga.id}`)).body.items[0].contactName).toBe('Pedro Rojas')
    expect((await agent.get('/api/leads?from=2026-11-01')).body.total).toBe(1)
    expect((await agent.get('/api/leads?status=GANADO')).body.total).toBe(0)
    expect((await agent.get('/api/leads?status=CERRADO')).status).toBe(400)
  })

  it('pagina y ordena', async () => {
    const agent = await login('admin@t.cr')
    for (let i = 0; i < 7; i++) {
      await agent
        .post('/api/leads')
        .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id, contactName: `Cliente ${i}` }))
    }
    const page = await agent.get('/api/leads?pageSize=5&page=2&sort=contactName&dir=asc')
    expect(page.body.total).toBe(7)
    expect(page.body.items.map((l: { contactName: string }) => l.contactName)).toEqual(['Cliente 5', 'Cliente 6'])
  })
})

describe('seguimiento', () => {
  it('cambia estado con nota, exige motivo al perder y registra la bitacora', async () => {
    const { agent, res } = await create('ana@t.cr')
    const code = res.body.code
    const ok = await agent.post(`/api/leads/${code}/status`).send({ status: 'CONTACTADO', note: 'Primera llamada' })
    expect(ok.body.status).toBe('CONTACTADO')
    expect(ok.body.interactions[0]).toMatchObject({ type: 'CAMBIO_ESTADO', fromStatus: 'NUEVO', toStatus: 'CONTACTADO' })

    expect((await agent.post(`/api/leads/${code}/status`).send({ status: 'PERDIDO' })).status).toBe(400)
    const lost = await agent.post(`/api/leads/${code}/status`).send({ status: 'PERDIDO', lossReason: 'Precio' })
    expect(lost.body.lossReason).toBe('Precio')
  })

  it('las notas actualizan la fecha de ultima actualizacion', async () => {
    const { agent, res } = await create('ana@t.cr')
    await new Promise((r) => setTimeout(r, 20))
    const noted = await agent.post(`/api/leads/${res.body.code}/notes`).send({ content: 'Envio cotizacion' })
    expect(noted.status).toBe(201)
    expect(new Date(noted.body.updatedAt).getTime()).toBeGreaterThan(new Date(res.body.updatedAt).getTime())
  })

  it('guarda la proxima accion y la reasignacion queda en la bitacora', async () => {
    const { agent, res } = await create('mercadeo@t.cr')
    const upd = await agent
      .patch(`/api/leads/${res.body.code}`)
      .send({ nextAction: 'Llamar', nextActionAt: '2026-11-20', assignedToId: ctx.beto.id })
    expect(upd.body).toMatchObject({ nextAction: 'Llamar', nextActionAt: '2026-11-20' })
    expect(upd.body.interactions[0]).toMatchObject({ type: 'ASIGNACION', content: 'Asignado a Beto Vendedor' })
  })

  it('solo ADMIN elimina', async () => {
    const { res } = await create('mercadeo@t.cr')
    const mercadeo = await login('mercadeo@t.cr')
    expect((await mercadeo.delete(`/api/leads/${res.body.code}`)).status).toBe(403)
    const admin = await login('admin@t.cr')
    expect((await admin.delete(`/api/leads/${res.body.code}`)).status).toBe(204)
  })
})

describe('exportacion CSV', () => {
  it('respeta filtros y alcance, compatible con Excel', async () => {
    const { agent } = await create('mercadeo@t.cr', { contactName: 'Jose Nunez', company: '=cmd' })
    await agent
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.beto.id, contactName: 'Otro', channel: 'FERIA' }))

    const all = await agent.get('/api/leads/export.csv?channel=WHATSAPP').buffer(true)
    expect(all.status).toBe(200)
    expect(all.headers['content-type']).toMatch(/text\/csv/)
    expect(all.headers['content-disposition']).toMatch(/attachment; filename="leads-craisa-/)
    const lines = all.text.replace(/^﻿/, '').trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('Jose Nunez')
    // La formula queda como texto con apostrofo inicial.
    expect(lines[1]).toContain(`;'=cmd;`)

    const ana = await login('ana@t.cr')
    const mine = await ana.get('/api/leads/export.csv').buffer(true)
    expect(mine.text.trim().split('\r\n')).toHaveLength(2)
  })
})
