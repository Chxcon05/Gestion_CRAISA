import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { env } from '../src/env.ts'
import { prisma } from '../src/lib/prisma.ts'
import { app, login, resetDb } from './helpers.ts'

const KEY = 'clave-de-ingreso-solo-para-pruebas-0123456789'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
  // El .env local tambien se carga en las pruebas; un responsable configurado ahi cambiaria el resultado.
  env.INGEST_ASSIGNEE_EMAIL = undefined
  env.INGEST_WEB_SECRET = KEY
})

// env es un objeto compartido entre archivos de prueba: se deja como estaba para no contaminar a los demas.
afterEach(() => {
  env.INGEST_ASSIGNEE_EMAIL = undefined
  env.INGEST_WEB_SECRET = undefined
})

const form = (over: Record<string, unknown> = {}) => ({
  contactName: 'Cliente Web',
  company: 'Finca Web',
  email: 'Cliente@Web.cr',
  phone: '',
  message: 'Quiero cotizar un tractor',
  website: '',
  ...over,
})

const send = (body: Record<string, unknown>, key: string | null = KEY) => {
  const req = request(app).post('/api/ingest/web')
  return (key === null ? req : req.set('X-Ingest-Key', key)).send(body)
}

describe('captura automatica desde el sitio web', () => {
  it('crea el lead asignado al admin, con canal Sitio web y bitacora', async () => {
    const res = await send(form())
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ code: expect.stringMatching(/^LEAD-\d{4}-0001$/) })

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { code: res.body.code },
      include: { businessLine: true, interactions: true },
    })
    expect(lead).toMatchObject({
      assignedToId: ctx.admin.id,
      autoCaptured: true,
      channel: 'SITIO_WEB',
      createdById: null,
      email: 'cliente@web.cr',
      status: 'ASIGNADO',
    })
    expect(lead.businessLine.name).toBe('Sin clasificar')
    expect(lead.interactions).toHaveLength(1)
    expect(lead.interactions[0]!.type).toBe('CREACION')

    const admin = await login('admin@t.cr')
    const detail = await admin.get(`/api/leads/${lead.code}`)
    expect(detail.body.autoCaptured).toBe(true)
    const notes = await admin.get('/api/notifications')
    expect(notes.body.items[0]).toMatchObject({ type: 'LEAD_AUTOMATICO', message: 'Lead nuevo desde Sitio web', actor: null })
  })

  it('usa el responsable configurado y completa mensajes muy cortos', async () => {
    env.INGEST_ASSIGNEE_EMAIL = 'ana@t.cr'
    const res = await send(form({ message: 'hola' }))
    const lead = await prisma.lead.findUniqueOrThrow({ where: { code: res.body.code } })
    expect(lead.assignedToId).toBe(ctx.ana.id)
    expect(lead.description).toBe('Mensaje desde Sitio web: hola')
  })

  it('usa la linea sugerida si coincide sin importar tildes, y si no la de por defecto', async () => {
    const match = await send(form({ businessLine: 'Agrícola' }))
    const other = await send(form({ businessLine: 'Administrativo' }))
    const lines = await prisma.lead.findMany({ orderBy: { code: 'asc' }, select: { businessLineId: true } })
    expect(match.status).toBe(201)
    expect(other.status).toBe(201)
    expect(lines[0]!.businessLineId).toBe(ctx.agricola.id)
    const fallback = await prisma.businessLine.findUniqueOrThrow({ where: { name: 'Sin clasificar' } })
    expect(lines[1]!.businessLineId).toBe(fallback.id)
  })

  it('cada envio crea un lead nuevo, aunque el contacto se repita', async () => {
    await send(form())
    const second = await send(form())
    expect(second.body.code).toMatch(/-0002$/)
    expect(await prisma.lead.count()).toBe(2)
  })

  it('rechaza clave ausente o incorrecta', async () => {
    expect((await send(form(), null)).status).toBe(401)
    expect((await send(form(), 'otra-clave')).status).toBe(401)
    expect(await prisma.lead.count()).toBe(0)
  })

  it('valida el formulario y el campo trampa', async () => {
    const noContact = await send(form({ email: '', phone: '' }))
    expect(noContact.status).toBe(400)
    expect(noContact.body.error.fields.phone).toBe('Indique telefono o correo')
    const bot = await send(form({ website: 'http://spam.example' }))
    expect(bot.status).toBe(400)
    expect(await prisma.lead.count()).toBe(0)
  })

  it('sin secreto configurado la ruta no existe', async () => {
    env.INGEST_WEB_SECRET = undefined
    expect((await send(form())).status).toBe(404)
  })
})
