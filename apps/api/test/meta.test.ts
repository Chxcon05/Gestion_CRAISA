import { createHmac } from 'node:crypto'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../src/env.ts'
import { prisma } from '../src/lib/prisma.ts'
import { formToLead, parseMetaWebhook } from '../src/ingest/meta.ts'
import { app, resetDb } from './helpers.ts'

const SECRET = 'secreto-de-la-app-de-meta-pruebas'
const PAGE = '111222333'
const PSID = '9876543210'

let ctx: Awaited<ReturnType<typeof resetDb>>

beforeEach(async () => {
  ctx = await resetDb()
  env.META_APP_SECRET = SECRET
  env.META_VERIFY_TOKEN = 'token-de-verificacion-pruebas'
})

afterEach(() => {
  env.META_APP_SECRET = undefined
  env.META_PAGE_TOKEN = undefined
  env.META_VERIFY_TOKEN = undefined
  vi.restoreAllMocks()
})

// Forma real de los eventos de Messenger e Instagram, recortada a lo que se usa.
const chat = (mid: string, text: string, object = 'page', sender = PSID, extra: Record<string, unknown> = {}) => ({
  object,
  entry: [
    {
      id: PAGE,
      time: 1764000000000,
      messaging: [{ sender: { id: sender }, recipient: { id: PAGE }, timestamp: 1764000000000, message: { mid, text, ...extra } }],
    },
  ],
})

const leadgen = (id: string) => ({
  object: 'page',
  entry: [{ id: PAGE, time: 1764000000, changes: [{ field: 'leadgen', value: { leadgen_id: id, page_id: PAGE, form_id: '555' } }] }],
})

const sign = (raw: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`

const post = (body: object, signature?: string | null) => {
  const raw = JSON.stringify(body)
  const req = request(app).post('/api/ingest/meta').set('Content-Type', 'application/json')
  if (signature !== null) req.set('x-hub-signature-256', signature ?? sign(raw))
  return req.send(raw)
}

const graphOk = (data: Record<string, unknown>) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }))

describe('verificacion del webhook de Meta', () => {
  const verify = (q: Record<string, string>) => request(app).get('/api/ingest/meta').query(q)

  it('devuelve el challenge con el token correcto y rechaza los demas', async () => {
    const ok = await verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'token-de-verificacion-pruebas', 'hub.challenge': '1158201444' })
    expect(ok.status).toBe(200)
    expect(ok.text).toBe('1158201444')
    const bad = await verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'otro-token-cualquiera', 'hub.challenge': '1' })
    expect(bad.status).toBe(403)
  })

  it('sin configurar, la ruta no existe', async () => {
    env.META_APP_SECRET = undefined
    env.META_VERIFY_TOKEN = undefined
    expect((await verify({ 'hub.mode': 'subscribe' })).status).toBe(404)
    expect((await post(chat('m1', 'Hola'))).status).toBe(404)
  })

  it('rechaza eventos sin firma o firmados con otro secreto', async () => {
    expect((await post(chat('m1', 'Hola'), null)).status).toBe(401)
    expect((await post(chat('m1', 'Hola'), sign(JSON.stringify(chat('m1', 'Hola')), 'secreto-de-otra-app-cualquiera'))).status).toBe(401)
    expect(await prisma.lead.count()).toBe(0)
  })
})

describe('mensajes de Messenger e Instagram', () => {
  it('el primer mensaje crea el lead con el nombre del perfil y canal Facebook', async () => {
    env.META_PAGE_TOKEN = 'token-de-pagina-de-pruebas-largo'
    const fetchMock = graphOk({ name: 'Laura Mora', id: PSID })
    const res = await post(chat('m1', 'Precio del montacargas electrico?'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: 1 })
    expect(String(fetchMock.mock.calls[0]![0])).toContain(`/v23.0/${PSID}?fields=name`)
    const lead = await prisma.lead.findFirstOrThrow({ include: { interactions: true } })
    expect(lead).toMatchObject({
      assignedToId: null,
      autoCaptured: true,
      channel: 'FACEBOOK',
      contactName: 'Laura Mora',
      contactRef: `facebook:${PSID}`,
      description: 'Precio del montacargas electrico?',
      externalRef: 'facebook:m1',
      status: 'NUEVO',
    })
    expect(lead.interactions[0]!.content).toContain('desde Facebook')
    expect(await prisma.notification.count({ where: { userId: ctx.admin.id, type: 'LEAD_AUTOMATICO' } })).toBe(1)
  })

  it('los mensajes siguientes del mismo remitente van a la bitacora y un reintento no duplica', async () => {
    await post(chat('m1', 'Hola, info de tractores', 'instagram'))
    await post(chat('m2', 'para finca de cana', 'instagram'))
    await post(chat('m2', 'para finca de cana', 'instagram'))
    const lead = await prisma.lead.findFirstOrThrow()
    expect(await prisma.lead.count()).toBe(1)
    expect(lead).toMatchObject({ channel: 'INSTAGRAM', contactName: 'Instagram 543210', contactRef: `instagram:${PSID}` })
    const messages = await prisma.interaction.findMany({ where: { type: 'MENSAJE' } })
    expect(messages).toMatchObject([{ content: 'para finca de cana', externalRef: 'instagram:m2' }])
  })

  it('el mismo id en Facebook y en Instagram son clientes distintos, y un lead cerrado abre otro', async () => {
    await post(chat('m1', 'Hola'))
    await post(chat('m2', 'Hola', 'instagram'))
    expect(await prisma.lead.count()).toBe(2)
    await prisma.lead.updateMany({ data: { status: 'PERDIDO' } })
    await post(chat('m3', 'Quiero cotizar otra vez'))
    expect(await prisma.lead.count()).toBe(3)
  })

  it('si Graph falla, el mensaje igual entra sin nombre', async () => {
    env.META_PAGE_TOKEN = 'token-de-pagina-de-pruebas-largo'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 400 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post(chat('m1', 'Hola'))).status).toBe(200)
    expect((await prisma.lead.findFirstOrThrow()).contactName).toBe('Facebook 543210')
  })
})

describe('interpretacion de los eventos', () => {
  it('ignora ecos de la pagina, mensajes borrados y objetos que no son de Meta', () => {
    expect(parseMetaWebhook(chat('m1', 'Le respondo', 'page', PSID, { is_echo: true })).chats).toEqual([])
    expect(parseMetaWebhook(chat('m1', 'Mio', 'instagram', PAGE)).chats).toEqual([])
    expect(parseMetaWebhook(chat('m1', '', 'instagram', PSID, { is_deleted: true })).chats).toEqual([])
    expect(parseMetaWebhook({ object: 'whatsapp_business_account', entry: [] }).chats).toEqual([])
    expect(parseMetaWebhook('no es json')).toEqual({ chats: [], leadgenIds: [] })
  })

  it('describe los adjuntos sin texto y usa el titulo de los botones', () => {
    const img = parseMetaWebhook(chat('m1', '', 'page', PSID, { attachments: [{ type: 'image', payload: { url: 'x' } }] }))
    expect(img.chats[0]!.text).toBe('Imagen sin texto')
    const button = parseMetaWebhook({
      object: 'page',
      entry: [{ id: PAGE, messaging: [{ sender: { id: PSID }, postback: { mid: 'p1', title: 'Cotizar', payload: 'COTIZAR' } }] }],
    })
    expect(button.chats).toMatchObject([{ mid: 'p1', text: 'Cotizar' }])
  })

  it('arma el lead de un formulario con los campos estandar y las preguntas propias', () => {
    const lead = formToLead('777', {
      id: '777',
      platform: 'ig',
      field_data: [
        { name: 'full_name', values: ['Pedro Rojas'] },
        { name: 'email', values: ['PRojas@Finca.cr'] },
        { name: 'phone_number', values: ['88123456'] },
        { name: 'company_name', values: ['Finca La Luz'] },
        { name: 'que_equipo_busca?', values: ['Tractor'] },
      ],
    })
    expect(lead).toEqual({
      channel: 'INSTAGRAM',
      company: 'Finca La Luz',
      contactName: 'Pedro Rojas',
      email: 'projas@finca.cr',
      externalRef: 'metalead:777',
      message: 'Formulario de Instagram (Lead Ads)\nQue equipo busca: Tractor',
      phone: '+506 8812-3456',
    })
  })
})

describe('formularios de Lead Ads', () => {
  it('consulta el formulario en Graph una sola vez aunque Meta reintente', async () => {
    env.META_PAGE_TOKEN = 'token-de-pagina-de-pruebas-largo'
    const fetchMock = graphOk({
      id: '777',
      platform: 'fb',
      field_data: [
        { name: 'first_name', values: ['Ana'] },
        { name: 'last_name', values: ['Vargas'] },
        { name: 'phone_number', values: ['+50670001111'] },
      ],
    })
    expect((await post(leadgen('777'))).body).toEqual({ received: 1 })
    await post(leadgen('777'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/777?fields=field_data%2Cplatform')
    expect(await prisma.lead.findFirstOrThrow()).toMatchObject({
      channel: 'FACEBOOK',
      contactName: 'Ana Vargas',
      externalRef: 'metalead:777',
      phone: '+506 7000-1111',
    })
  })

  it('sin token de pagina no se puede leer y responde 200 sin crear nada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await post(leadgen('777'))
    expect(res.body).toEqual({ received: 0 })
    expect(await prisma.lead.count()).toBe(0)
  })

  it('si Graph falla responde 500 para que Meta reintente', async () => {
    env.META_PAGE_TOKEN = 'token-de-pagina-de-pruebas-largo'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post(leadgen('777'))).status).toBe(500)
  })
})
