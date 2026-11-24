import ExcelJS from 'exceljs'
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
    const { agent, res } = await create('admin@t.cr')
    expect(res.status).toBe(201)
    expect(res.body.code).toBe('LEAD-2026-0001')
    expect(res.body.interactions[0].type).toBe('CREACION')
    const second = await agent
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }))
    expect(second.body.code).toBe('LEAD-2026-0002')
  })

  it('valida campos obligatorios y devuelve errores por campo', async () => {
    const { res } = await create('admin@t.cr', { contactName: '', channel: 'X' })
    expect(res.status).toBe(400)
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['contactName', 'channel']))
    // La regla cruzada (telefono o correo) corre cuando el resto de campos ya es valido.
    const { res: noContact } = await create('admin@t.cr', { phone: '', email: '' })
    expect(noContact.body.error.fields.phone).toBe('Indique telefono o correo')
  })

  it('rechaza un producto que no pertenece a la linea', async () => {
    const { res } = await create('admin@t.cr', { businessLineId: ctx.carga.id, productId: ctx.tractor.id })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.productId).toBeDefined()
  })

  it('un vendedor no puede asignar leads a otro vendedor', async () => {
    const { res } = await create('ana@t.cr', { assignedToId: ctx.beto.id })
    expect(res.status).toBe(403)
  })
})

describe('alcance por rol', () => {
  it('cada vendedor ve solo sus leads; el administrador ve todos', async () => {
    const { agent: admin } = await create('admin@t.cr', { contactName: 'De Ana' })
    await admin
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.beto.id, contactName: 'De Beto' }))

    const ana = await login('ana@t.cr')
    const list = await ana.get('/api/leads')
    expect(list.body.total).toBe(1)
    expect(list.body.items[0].contactName).toBe('De Ana')
    expect((await ana.get('/api/leads/LEAD-2026-0002')).status).toBe(404)
    expect((await admin.get('/api/leads')).body.total).toBe(2)
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

  it('al eliminar un usuario sus leads quedan sin responsable', async () => {
    const { res } = await create('admin@t.cr')
    const admin = await login('admin@t.cr')
    expect((await (await login('beto@t.cr')).delete(`/api/users/${ctx.ana.id}`)).status).toBe(403)
    expect((await admin.delete(`/api/users/${ctx.admin.id}`)).status).toBe(400)
    expect((await admin.delete(`/api/users/${ctx.ana.id}`)).status).toBe(204)
    const lead = await admin.get(`/api/leads/${res.body.code}`)
    expect(lead.body.assignedTo).toBeNull()
    expect(lead.body.interactions.length).toBeGreaterThan(0)
  })

  it('guarda capturas en una nota y solo las sirve a quien ve el lead', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const { agent, res } = await create('ana@t.cr')
    const code = res.body.code
    const noted = await agent.post(`/api/leads/${code}/notes`).send({ images: [png] })
    expect(noted.status).toBe(201)
    const [note] = noted.body.interactions
    expect(note).toMatchObject({ content: '', type: 'NOTA' })
    expect(note.attachments).toHaveLength(1)

    const img = await agent.get(note.attachments[0].url)
    expect(img.status).toBe(200)
    expect(img.headers['content-type']).toBe('image/png')
    expect(Buffer.compare(img.body, Buffer.from(png, 'base64'))).toBe(0)

    // Beto no ve el lead de Ana: la imagen responde igual que un lead ajeno.
    const beto = await login('beto@t.cr')
    expect((await beto.get(note.attachments[0].url)).status).toBe(404)
  })

  it('rechaza archivos que no son imagenes, notas vacias y envios muy pesados', async () => {
    const { agent, res } = await create('ana@t.cr')
    const url = `/api/leads/${res.body.code}/notes`
    const fake = Buffer.from('<script>alert(1)</script>').toString('base64')
    expect((await agent.post(url).send({ images: [fake] })).status).toBe(400)
    expect((await agent.post(url).send({ content: '  ' })).status).toBe(400)
    const tooBig = await agent.post(url).send({ images: ['A'.repeat(10 * 1024 * 1024)] })
    expect(tooBig.status).toBe(413)
  })

  it('guarda la proxima accion y la reasignacion queda en la bitacora', async () => {
    const { agent, res } = await create('admin@t.cr')
    const upd = await agent
      .patch(`/api/leads/${res.body.code}`)
      .send({ nextAction: 'Llamar', nextActionAt: '2026-11-20', assignedToId: ctx.beto.id })
    expect(upd.body).toMatchObject({ nextAction: 'Llamar', nextActionAt: '2026-11-20' })
    expect(upd.body.interactions[0]).toMatchObject({ type: 'ASIGNACION', content: 'Asignado a Beto Vendedor' })
  })

  it('solo ADMIN elimina', async () => {
    // El lead es de Ana: aun siendo suyo, un vendedor no lo puede borrar.
    const { agent: ana, res } = await create('ana@t.cr')
    expect((await ana.delete(`/api/leads/${res.body.code}`)).status).toBe(403)
    const admin = await login('admin@t.cr')
    expect((await admin.delete(`/api/leads/${res.body.code}`)).status).toBe(204)
  })
})

describe('exportacion CSV', () => {
  it('respeta filtros y alcance, compatible con Excel', async () => {
    const { agent } = await create('admin@t.cr', { contactName: 'Jose Nunez', company: '=cmd' })
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

const readXlsx = async (body: Buffer) => {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(body as unknown as ArrayBuffer)
  return wb.getWorksheet('Leads')!
}
const binary = (res: import('supertest').Response, cb: (e: Error | null, b: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (c: Buffer) => chunks.push(c))
  res.on('end', () => cb(null, Buffer.concat(chunks)))
}

describe('exportacion Excel', () => {
  it('trae encabezado del reporte, filtros, datos tipados y respeta el alcance', async () => {
    const { agent } = await create('admin@t.cr', { contactName: 'Jose Nunez', company: '=cmd' })
    await agent
      .post('/api/leads')
      .send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.beto.id, contactName: 'Otro', channel: 'FERIA' }))

    const res = await agent.get('/api/leads/export.xlsx?channel=WHATSAPP').buffer(true).parse(binary)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/spreadsheetml/)
    expect(res.headers['content-disposition']).toMatch(/filename="leads-craisa-.*\.xlsx"/)
    const ws = await readXlsx(res.body as Buffer)
    expect(String(ws.getCell('A2').value)).toContain('1 registro')
    expect(String(ws.getCell('A2').value)).toContain('Canal: WhatsApp')
    expect(ws.getRow(4).getCell(1).value).toBe('Codigo')
    expect(ws.getRow(5).getCell(3).value).toBe('Jose Nunez')
    // Texto, no formula: Excel no la ejecuta.
    expect(ws.getRow(5).getCell(4).value).toBe('=cmd')
    expect(ws.getRow(5).getCell(2).value).toBeInstanceOf(Date)
    expect(ws.getRow(6).getCell(1).value).toBeNull()

    const ana = await login('ana@t.cr')
    const mine = await readXlsx((await ana.get('/api/leads/export.xlsx').buffer(true).parse(binary)).body as Buffer)
    expect(mine.getRow(5).getCell(3).value).toBe('Jose Nunez')
    expect(mine.getRow(6).getCell(1).value).toBeNull()
  })
})
