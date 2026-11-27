import ExcelJS from 'exceljs'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { leadInput, login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>
let admin: Awaited<ReturnType<typeof login>>

beforeEach(async () => {
  ctx = await resetDb()
  admin = await login('admin@t.cr')
})

const HEADERS = ['Nombre', 'Empresa', 'Telefono', 'Correo', 'Canal', 'Fecha de ingreso', 'Linea', 'Producto', 'Descripcion', 'Responsable']

type Row = Partial<Record<(typeof HEADERS)[number], ExcelJS.CellValue>>

async function file(rows: Row[], opts: { blankTail?: number; headers?: string[] } = {}) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Leads')
  const headers = opts.headers ?? HEADERS
  ws.addRow(headers)
  for (const r of rows) ws.addRow(headers.map((h) => r[h] ?? null))
  // Filas con formato y sin valores, como las que deja Excel al borrar contenido.
  for (let i = 0; i < (opts.blankTail ?? 0); i++) ws.getRow(rows.length + 2 + i).getCell(1).font = { bold: true }
  const buf = await wb.xlsx.writeBuffer()
  return { data: Buffer.from(buf).toString('base64'), fileName: 'ferias.xlsx' }
}

const valid = (over: Row = {}): Row => ({
  Canal: 'Feria',
  Descripcion: 'Quiere un tractor',
  // Fecha escrita como texto dd/mm/aaaa, como la teclean en Costa Rica; fija el anio de los codigos.
  'Fecha de ingreso': '02/11/2026',
  Linea: 'Agricola',
  Nombre: 'Cliente Feria',
  Telefono: '8888-1111',
  ...over,
})

const binary = (res: import('supertest').Response, cb: (e: Error | null, b: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (c: Buffer) => chunks.push(c))
  res.on('end', () => cb(null, Buffer.concat(chunks)))
}

describe('importar desde Excel', () => {
  it('solo el admin importa', async () => {
    const ana = await login('ana@t.cr')
    expect((await ana.post('/api/leads/import/preview').send(await file([valid()]))).status).toBe(403)
    expect((await ana.post('/api/leads/import').send(await file([valid()]))).status).toBe(403)
    expect((await ana.get('/api/leads/import/template.xlsx')).status).toBe(403)
  })

  it('la plantilla trae las columnas en orden', async () => {
    const res = await admin.get('/api/leads/import/template.xlsx').buffer(true).parse(binary)
    expect(res.status).toBe(200)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as unknown as ArrayBuffer)
    const row = wb.getWorksheet('Leads')!.getRow(1)
    expect(HEADERS.map((_, i) => row.getCell(i + 1).value)).toEqual(HEADERS)
  })

  it('la vista previa marca errores por fila y no crea nada', async () => {
    const res = await admin.post('/api/leads/import/preview').send(
      await file([
        valid({ Nombre: 'Uno' }),
        valid({ Nombre: 'Dos', Telefono: null }),
        valid({ Canal: 'Telepatia', Nombre: 'Tres', Telefono: '8888-3333' }),
      ]),
    )
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ invalid: 2, valid: 1 })
    expect(res.body.rows[1]).toMatchObject({ contactName: 'Dos', errors: { phone: 'Indique telefono o correo' }, row: 3 })
    expect(res.body.rows[2].errors.channel).toBeDefined()
    expect(await prisma.lead.count()).toBe(0)
  })

  it('lee celdas numericas, fechas e hipervinculos y salta filas vacias', async () => {
    const res = await admin.post('/api/leads/import').send(
      await file(
        [
          valid({
            Correo: { hyperlink: 'mailto:x@y.cr', text: 'x@y.cr' },
            'Fecha de ingreso': new Date('2026-11-03T00:00:00Z'),
            Telefono: 88884444,
          }),
        ],
        { blankTail: 2 },
      ),
    )
    expect(res.status).toBe(200)
    expect(res.body.created).toBe(1)
    const lead = await prisma.lead.findFirstOrThrow()
    expect(lead).toMatchObject({ email: 'x@y.cr', phone: '88884444' })
    expect(lead.entryDate.toISOString().slice(0, 10)).toBe('2026-11-03')
  })

  it('resuelve catalogos sin importar tildes ni mayusculas', async () => {
    const res = await admin
      .post('/api/leads/import')
      .send(await file([valid({ Canal: 'sitio web', Linea: ' AGRÍCOLA ', Producto: 'tractor', Responsable: 'ANA@t.cr' })]))
    expect(res.body.created).toBe(1)
    expect(await prisma.lead.findFirstOrThrow()).toMatchObject({
      assignedToId: ctx.ana.id,
      businessLineId: ctx.agricola.id,
      channel: 'SITIO_WEB',
      productId: ctx.tractor.id,
      status: 'ASIGNADO',
    })
  })

  it('avisa una sola vez a cada responsable aunque reciba varios leads', async () => {
    await admin
      .post('/api/leads/import')
      .send(await file([valid({ Responsable: 'ana@t.cr' }), valid({ Responsable: 'ana@t.cr', Telefono: '8888-2222' }), valid({ Responsable: 'ana@t.cr', Telefono: '8888-3333' })]))
    const notes = await prisma.notification.findMany({ where: { userId: ctx.ana.id } })
    expect(notes).toHaveLength(1)
    expect(notes[0]!.message).toContain('3 leads importados')
  })

  it('rechaza una fecha imposible en vez de correrla', async () => {
    const res = await admin.post('/api/leads/import/preview').send(await file([valid({ 'Fecha de ingreso': '31/02/2026' })]))
    expect(res.body.rows[0].errors.entryDate).toBe('Fecha no valida, use dd/mm/aaaa')
  })

  it('sin responsable queda Nuevo y sin asignar', async () => {
    await admin.post('/api/leads/import').send(await file([valid()]))
    expect(await prisma.lead.findFirstOrThrow()).toMatchObject({ assignedToId: null, autoCaptured: false, status: 'NUEVO' })
  })

  it('crea solo las validas con codigo secuencial, bitacora y auditoria', async () => {
    const res = await admin
      .post('/api/leads/import')
      .send(await file([valid({ Nombre: 'Uno' }), valid({ Linea: 'Pesca', Nombre: 'Malo' }), valid({ Nombre: 'Dos', Telefono: '8888-2222' })]))
    expect(res.body).toEqual({ codes: ['LEAD-2026-0001', 'LEAD-2026-0002'], created: 2 })
    const i = await prisma.interaction.findFirstOrThrow({ where: { type: 'CREACION' } })
    expect(i.content).toBe('Importado desde ferias.xlsx')
    expect(await prisma.auditLog.count({ where: { action: 'IMPORTACION' } })).toBe(1)
  })

  it('avisa duplicados sin bloquearlos', async () => {
    await admin.post('/api/leads').send(leadInput({ assignedToId: ctx.ana.id, businessLineId: ctx.agricola.id, phone: '8888-1111' }))
    const res = await admin
      .post('/api/leads/import/preview')
      .send(await file([valid({ Telefono: '+506 8888 1111' }), valid({ Nombre: 'Repetido', Telefono: '88881111' })]))
    expect(res.body.rows[0]).toMatchObject({ duplicates: ['LEAD-2026-0001'], errors: {} })
    expect(res.body.rows[1].duplicates).toEqual(['LEAD-2026-0001', 'Fila 2'])
    expect(res.body.valid).toBe(2)
  })

  it('rechaza un archivo que no es Excel, sin la columna Nombre o con mas de 1000 filas', async () => {
    const notExcel = await admin.post('/api/leads/import/preview').send({ data: Buffer.from('hola').toString('base64'), fileName: 'x.xlsx' })
    expect(notExcel.status).toBe(400)
    const noName = await admin.post('/api/leads/import/preview').send(await file([valid()], { headers: ['Empresa', 'Telefono'] }))
    expect(noName.status).toBe(400)
    const tooMany = await admin.post('/api/leads/import/preview').send(await file(Array.from({ length: 1001 }, () => valid())))
    expect(tooMany.status).toBe(400)
    expect(tooMany.body.error.message).toBe('Maximo 1000 filas por archivo')
  })
})
