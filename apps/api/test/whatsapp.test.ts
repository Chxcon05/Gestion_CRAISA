import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../src/env.ts'
import { prisma } from '../src/lib/prisma.ts'
import { formatPhone, parseEvolutionWebhook } from '../src/ingest/whatsapp.ts'
import { notifyAssignment } from '../src/notifications/whatsapp.ts'
import { app, leadInput, login, resetDb } from './helpers.ts'

const SECRET = 'clave-del-webhook-de-evolution-para-pruebas'
const JID = '50688887777@s.whatsapp.net'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
  env.EVOLUTION_WEBHOOK_SECRET = SECRET
})

afterEach(() => {
  env.EVOLUTION_API_KEY = undefined
  env.EVOLUTION_WEBHOOK_SECRET = undefined
  vi.restoreAllMocks()
})

// Forma real del evento messages.upsert de Evolution v2, recortada a lo que se usa.
const event = (data: unknown, name = 'messages.upsert') => ({
  event: name,
  instance: 'atencion_cliente',
  data,
  sender: '50670000000@s.whatsapp.net',
})

const msg = (id: string, message: Record<string, unknown>, key: Record<string, unknown> = {}, pushName = 'Juan Perez') => ({
  key: { remoteJid: JID, fromMe: false, id, ...key },
  pushName,
  message,
  messageType: Object.keys(message)[0],
})

const text = (id: string, body: string) => event(msg(id, { conversation: body }))

const post = (body: object, key: string | null = SECRET) => {
  const req = request(app).post('/api/ingest/whatsapp')
  if (key !== null) req.set('x-ingest-key', key)
  return req.send(body)
}

describe('webhook de Evolution', () => {
  it('sin secreto configurado la ruta no existe', async () => {
    env.EVOLUTION_WEBHOOK_SECRET = undefined
    expect((await post(text('A', 'Hola'))).status).toBe(404)
  })

  it('rechaza clave ausente o incorrecta y acepta la clave en ?key=', async () => {
    expect((await post(text('A', 'Hola'), null)).status).toBe(401)
    expect((await post(text('A', 'Hola'), 'otra-clave-cualquiera-de-32-caracteres')).status).toBe(401)
    expect(await prisma.lead.count()).toBe(0)
    const res = await request(app).post(`/api/ingest/whatsapp?key=${SECRET}`).send(text('A', 'Hola'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: 1 })
  })

  it('el primer mensaje crea el lead con nombre, telefono y canal WhatsApp', async () => {
    const res = await post(text('A', 'Quiero cotizar un tractor'))
    expect(res.status).toBe(200)
    const lead = await prisma.lead.findFirstOrThrow({ include: { interactions: true } })
    expect(lead).toMatchObject({
      assignedToId: null,
      autoCaptured: true,
      channel: 'WHATSAPP',
      contactName: 'Juan Perez',
      description: 'Quiero cotizar un tractor',
      externalRef: 'whatsapp:A',
      phone: '+506 8888-7777',
      status: 'NUEVO',
    })
    expect(lead.interactions[0]!.content).toContain('desde WhatsApp')
  })

  it('los mensajes siguientes del mismo telefono van a la bitacora del lead abierto', async () => {
    await post(text('A', 'Quiero cotizar un tractor'))
    const res = await post(text('B', 'de 75 caballos'))
    expect(res.body).toEqual({ received: 1 })
    expect(await prisma.lead.count()).toBe(1)
    const messages = await prisma.interaction.findMany({ where: { type: 'MENSAJE' } })
    expect(messages).toMatchObject([{ content: 'de 75 caballos', externalRef: 'whatsapp:B', userId: null }])
    const notices = await prisma.notification.findMany({ where: { userId: ctx.admin.id }, orderBy: { createdAt: 'asc' } })
    expect(notices.map((n) => n.type)).toEqual(['LEAD_AUTOMATICO', 'ACTIVIDAD'])
  })

  it('agrupa tambien con un lead registrado a mano con el mismo numero en otro formato', async () => {
    const manual = await prisma.lead.create({
      data: {
        assignedToId: ctx.ana.id,
        businessLineId: ctx.agricola.id,
        channel: 'LLAMADA',
        code: 'LEAD-2026-0099',
        contactName: 'Juan',
        description: 'Llamo por un tractor',
        entryDate: new Date('2026-11-02'),
        phone: '8888-7777',
        status: 'CONTACTADO',
      },
    })
    await post(text('A', 'Hola, le escribo por lo del tractor'))
    expect(await prisma.lead.count()).toBe(1)
    expect(await prisma.interaction.count({ where: { leadId: manual.id, type: 'MENSAJE' } })).toBe(1)
    expect(await prisma.notification.count({ where: { userId: ctx.ana.id, type: 'ACTIVIDAD' } })).toBe(1)
  })

  it('un reintento del mismo mensaje no duplica ni el lead ni la entrada de bitacora', async () => {
    await post(text('A', 'Hola, info de montacargas'))
    await post(text('B', 'para 3 toneladas'))
    await post(text('A', 'Hola, info de montacargas'))
    await post(text('B', 'para 3 toneladas'))
    expect(await prisma.lead.count()).toBe(1)
    expect(await prisma.interaction.count({ where: { type: 'MENSAJE' } })).toBe(1)
  })

  it('si el lead del telefono ya esta cerrado, el mensaje abre uno nuevo', async () => {
    await post(text('A', 'Quiero cotizar'))
    await prisma.lead.updateMany({ data: { status: 'GANADO' } })
    await post(text('B', 'Necesito otro equipo'))
    expect(await prisma.lead.count()).toBe(2)
  })

  it('ignora lo que envia la empresa, los grupos y los estados', async () => {
    const res = await post(
      event([
        msg('A', { conversation: 'Le respondo enseguida' }, { fromMe: true }),
        msg('B', { conversation: 'Hola grupo' }, { remoteJid: '120363000000@g.us', participant: JID }),
        msg('C', { conversation: 'Mi estado' }, { remoteJid: 'status@broadcast' }),
      ]),
    )
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: 0 })
  })
})

describe('interpretacion de los mensajes', () => {
  const one = (message: Record<string, unknown>, key?: Record<string, unknown>, name?: string) =>
    parseEvolutionWebhook(event(msg('w1', message, key, name)))

  it('usa el texto de respuestas, botones, listas y el pie de la media', () => {
    expect(one({ extendedTextMessage: { text: 'Con enlace' } })[0]!.message).toBe('Con enlace')
    expect(one({ buttonsResponseMessage: { selectedDisplayText: 'Cotizar' } })[0]!.message).toBe('Cotizar')
    expect(one({ listResponseMessage: { title: 'Agricola' } })[0]!.message).toBe('Agricola')
    expect(one({ imageMessage: { caption: 'Este modelo' } })[0]!.message).toBe('Imagen: Este modelo')
    expect(one({ audioMessage: { seconds: 12 } })[0]!.message).toBe('Nota de voz sin texto')
    expect(one({ ephemeralMessage: { message: { conversation: 'Temporal' } } })[0]!.message).toBe('Temporal')
  })

  it('ignora reacciones, otros eventos y payloads que no son de Evolution', () => {
    expect(one({ reactionMessage: { text: 'ok' } })).toEqual([])
    expect(parseEvolutionWebhook(event(msg('w1', { conversation: 'Hola' }), 'messages.update'))).toEqual([])
    expect(parseEvolutionWebhook(event(msg('w1', { conversation: 'Hola' }), 'MESSAGES_UPSERT'))).toHaveLength(1)
    expect(parseEvolutionWebhook({ object: 'whatsapp_business_account', entry: [] })).toEqual([])
    expect(parseEvolutionWebhook('no es json')).toEqual([])
  })

  it('con el formato @lid toma el numero del campo alterno y descarta si no hay', () => {
    const lid = { remoteJid: '123456789012345@lid' }
    expect(one({ conversation: 'Hola' }, { ...lid, remoteJidAlt: JID })[0]!.phone).toBe('+506 8888-7777')
    expect(one({ conversation: 'Hola' }, lid)).toEqual([])
  })

  it('sin nombre de perfil usa el numero, y formatea numeros de Costa Rica', () => {
    expect(one({ conversation: 'Hola' }, {}, '')[0]!.contactName).toBe('WhatsApp +506 8888-7777')
    expect(formatPhone('50688887777')).toBe('+506 8888-7777')
    expect(formatPhone('14155550100')).toBe('+14155550100')
  })
})

describe('aviso por WhatsApp al asignar', () => {
  const ok = () => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }))

  beforeEach(async () => {
    env.EVOLUTION_API_KEY = 'clave-de-evolution-de-pruebas'
    await prisma.user.update({ where: { id: ctx.ana.id }, data: { whatsapp: '50677776666' } })
  })

  it('al asignarle un lead, el vendedor recibe los datos y el enlace wa.me', async () => {
    const fetchMock = ok()
    const admin = await login('admin@t.cr')
    const res = await admin.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.ana.id }))
    expect(res.status).toBe(201)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('http://localhost:8080/message/sendText/atencion_cliente')
    expect((init!.headers as Record<string, string>).apikey).toBe('clave-de-evolution-de-pruebas')
    const body = JSON.parse(String(init!.body))
    expect(body.number).toBe('50677776666')
    expect(body.text).toContain(res.body.code)
    expect(body.text).toContain('https://wa.me/50688880000')
  })

  it('no avisa a quien no tiene numero ni a quien se asigna a si mismo', async () => {
    const fetchMock = ok()
    const lead = await prisma.lead.create({
      data: {
        assignedToId: ctx.beto.id,
        businessLineId: ctx.agricola.id,
        channel: 'LLAMADA',
        code: 'LEAD-2026-0050',
        contactName: 'Cliente',
        description: 'Consulta',
        entryDate: new Date('2026-11-02'),
      },
    })
    expect(await notifyAssignment(lead.id, ctx.admin.id)).toBe(false)
    await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: ctx.ana.id } })
    expect(await notifyAssignment(lead.id, ctx.ana.id)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('si Evolution no responde, la asignacion igual se guarda', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const admin = await login('admin@t.cr')
    const res = await admin.post('/api/leads').send(leadInput({ businessLineId: ctx.agricola.id, assignedToId: ctx.beto.id }))
    const moved = await admin.patch(`/api/leads/${res.body.code}`).send({ assignedToId: ctx.ana.id })
    expect(moved.status).toBe(200)
    expect(moved.body.assignedTo.id).toBe(ctx.ana.id)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
