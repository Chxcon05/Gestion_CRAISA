import { describe, expect, it } from 'vitest'
import { leadCreateSchema, leadFiltersSchema, statusChangeSchema, webIngestSchema } from '../src/index.ts'

const valid = {
  entryDate: '2026-11-01',
  contactName: 'Ana Rodriguez',
  phone: '8888-1234',
  channel: 'WHATSAPP',
  businessLineId: 'line1',
  description: 'Consulta por tractor de 75 HP',
  assignedToId: 'user1',
}

describe('leadCreateSchema', () => {
  it('acepta un lead valido y aplica valores por defecto', () => {
    const r = leadCreateSchema.parse(valid)
    expect(r.status).toBe('NUEVO')
    expect(r.email).toBeNull()
    expect(r.company).toBeNull()
  })

  it('exige telefono o correo', () => {
    const r = leadCreateSchema.safeParse({ ...valid, phone: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['phone'])
  })

  it('acepta solo correo y lo normaliza', () => {
    const r = leadCreateSchema.parse({ ...valid, phone: '', email: 'Ana@Finca.CR' })
    expect(r.email).toBe('ana@finca.cr')
  })

  it('rechaza canal desconocido y campos obligatorios vacios', () => {
    const r = leadCreateSchema.safeParse({ ...valid, channel: 'TIKTOK', contactName: '', description: '' })
    expect(r.success).toBe(false)
    const paths = r.error?.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['channel', 'contactName', 'description']))
  })

  it('exige motivo cuando el estado es perdido', () => {
    expect(leadCreateSchema.safeParse({ ...valid, status: 'PERDIDO' }).success).toBe(false)
    expect(leadCreateSchema.safeParse({ ...valid, status: 'PERDIDO', lossReason: 'Precio' }).success).toBe(true)
  })

  it('exige descripcion de la proxima accion si hay fecha', () => {
    const r = leadCreateSchema.safeParse({ ...valid, nextActionAt: '2026-11-20' })
    expect(r.success).toBe(false)
  })
})

describe('statusChangeSchema', () => {
  it('exige motivo para perdido', () => {
    expect(statusChangeSchema.safeParse({ status: 'PERDIDO' }).success).toBe(false)
    expect(statusChangeSchema.safeParse({ status: 'GANADO' }).success).toBe(true)
  })
})

describe('leadFiltersSchema', () => {
  it('parsea arrays separados por coma y valores por defecto', () => {
    const f = leadFiltersSchema.parse({ status: 'NUEVO,GANADO', channel: ['FERIA'] })
    expect(f.status).toEqual(['NUEVO', 'GANADO'])
    expect(f.channel).toEqual(['FERIA'])
    expect(f.page).toBe(1)
    expect(f.sort).toBe('entryDate')
  })

  it('rechaza estados desconocidos', () => {
    expect(leadFiltersSchema.safeParse({ status: 'CERRADO' }).success).toBe(false)
  })
})

describe('webIngestSchema', () => {
  const web = { contactName: 'Ana Web', email: 'ana@web.cr', message: 'Hola' }

  it('acepta el formulario sin empresa ni telefono', () => {
    expect(webIngestSchema.parse(web)).toMatchObject({ company: null, phone: null, message: 'Hola' })
  })

  it('rechaza el campo trampa lleno y la falta de contacto', () => {
    expect(webIngestSchema.safeParse({ ...web, website: 'x' }).success).toBe(false)
    expect(webIngestSchema.safeParse({ ...web, email: '' }).success).toBe(false)
  })
})
