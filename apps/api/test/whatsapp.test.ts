import { createHmac } from 'node:crypto'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { env } from '../src/env.ts'
import { prisma } from '../src/lib/prisma.ts'
import { formatPhone, parseWhatsAppWebhook } from '../src/ingest/whatsapp.ts'
import { app, resetDb } from './helpers.ts'

const SECRET = 'secreto-de-app-meta-para-pruebas'
const TOKEN = 'token-de-verificacion-para-pruebas'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
  env.INGEST_ASSIGNEE_EMAIL = undefined
  env.WHATSAPP_APP_SECRET = SECRET
  env.WHATSAPP_VERIFY_TOKEN = TOKEN
})

afterEach(() => {
  env.WHATSAPP_APP_SECRET = undefined
  env.WHATSAPP_VERIFY_TOKEN = undefined
})

// Forma real de la notificacion de Cloud API, recortada a lo que se usa.
const payload = (messages: Record<string, unknown>[], name = 'Juan Perez') => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '1234',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            contacts: [{ profile: { name }, wa_id: '50688887777' }],
            messages,
          },
        },
      ],
    },
  ],
})

const text = (id: string, body: string) => ({ from: '50688887777', id, timestamp: '1763300000', type: 'text', text: { body } })

const post = (body: unknown, sign: string | null = SECRET) => {
  const raw = JSON.stringify(body)
  const req = request(app).post('/api/ingest/whatsapp').set('Content-Type', 'application/json')
  if (sign !== null) req.set('X-Hub-Signature-256', `sha256=${createHmac('sha256', sign).update(raw).digest('hex')}`)
  return req.send(raw)
}

describe('verificacion del webhook', () => {
  it('devuelve el challenge con el token correcto y 403 con otro', async () => {
    const ok = await request(app)
      .get('/api/ingest/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': TOKEN, 'hub.challenge': '987654' })
    expect(ok.status).toBe(200)
    expect(ok.text).toBe('987654')
    const bad = await request(app)
      .get('/api/ingest/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'otro-token-cualquiera', 'hub.challenge': '1' })
    expect(bad.status).toBe(403)
  })

  it('sin configurar, las dos rutas no existen', async () => {
    env.WHATSAPP_APP_SECRET = undefined
    env.WHATSAPP_VERIFY_TOKEN = undefined
    expect((await request(app).get('/api/ingest/whatsapp')).status).toBe(404)
    expect((await post(payload([text('wamid.A', 'Hola')]))).status).toBe(404)
  })
})

describe('mensajes entrantes', () => {
  it('crea un lead por mensaje con nombre, telefono y canal WhatsApp', async () => {
    const res = await post(payload([text('wamid.A', 'Quiero cotizar un tractor'), text('wamid.B', 'precio?')]))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: 2 })
    const leads = await prisma.lead.findMany({ orderBy: { code: 'asc' }, include: { interactions: true } })
    expect(leads).toHaveLength(2)
    expect(leads[0]).toMatchObject({
      assignedToId: ctx.admin.id,
      autoCaptured: true,
      channel: 'WHATSAPP',
      contactName: 'Juan Perez',
      description: 'Quiero cotizar un tractor',
      externalRef: 'whatsapp:wamid.A',
      phone: '+506 8888-7777',
      status: 'ASIGNADO',
    })
    expect(leads[1]!.description).toBe('precio?')
    expect(leads[0]!.interactions[0]!.content).toContain('desde WhatsApp')
  })

  it('un reintento de Meta con el mismo mensaje no duplica el lead', async () => {
    const body = payload([text('wamid.A', 'Hola, info de montacargas')])
    await post(body)
    const again = await post(body)
    expect(again.status).toBe(200)
    expect(await prisma.lead.count()).toBe(1)
  })

  it('rechaza firma ausente, incorrecta o de otro cuerpo', async () => {
    const body = payload([text('wamid.A', 'Hola')])
    expect((await post(body, null)).status).toBe(401)
    expect((await post(body, 'otro-secreto-cualquiera')).status).toBe(401)
    const raw = JSON.stringify(body)
    const sig = `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`
    const tampered = await request(app)
      .post('/api/ingest/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', sig)
      .send(raw.replace('Hola', 'Adios'))
    expect(tampered.status).toBe(401)
    expect(await prisma.lead.count()).toBe(0)
  })

  it('los avisos de entrega no crean leads y responden 200', async () => {
    const statuses = {
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'wamid.X', status: 'read' }] } }] }],
    }
    const res = await post(statuses)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: 0 })
  })
})

describe('interpretacion de los mensajes', () => {
  const one = (m: Record<string, unknown>, name?: string) => parseWhatsAppWebhook(payload([m], name))

  it('usa el texto de botones, listas y el pie de las imagenes', () => {
    const base = { from: '50688887777', id: 'w1' }
    expect(one({ ...base, type: 'button', button: { text: 'Cotizar' } })[0]!.message).toBe('Cotizar')
    expect(one({ ...base, type: 'interactive', interactive: { list_reply: { title: 'Agricola' } } })[0]!.message).toBe(
      'Agricola',
    )
    expect(one({ ...base, type: 'image', image: { caption: 'Este modelo' } })[0]!.message).toBe('Imagen: Este modelo')
    expect(one({ ...base, type: 'audio', audio: { id: 'a1' } })[0]!.message).toBe('Nota de voz sin texto')
  })

  it('ignora reacciones y payloads que no son de WhatsApp', () => {
    expect(one({ from: '50688887777', id: 'w1', type: 'reaction', reaction: { emoji: 'ok' } })).toEqual([])
    expect(parseWhatsAppWebhook({ object: 'page', entry: [] })).toEqual([])
    expect(parseWhatsAppWebhook('no es json')).toEqual([])
  })

  it('sin nombre de perfil usa el numero, y formatea numeros de Costa Rica', () => {
    expect(one(text('w1', 'Hola'), '')[0]!.contactName).toBe('WhatsApp +506 8888-7777')
    expect(formatPhone('50688887777')).toBe('+506 8888-7777')
    expect(formatPhone('14155550100')).toBe('+14155550100')
  })
})
