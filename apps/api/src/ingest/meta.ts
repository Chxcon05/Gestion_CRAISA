import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { CHANNEL_LABELS, type Channel } from '@craisa/shared'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { ingestLead, type InboundLead } from './service.ts'
import { formatPhone } from './whatsapp.ts'

const MAX_MESSAGE = 2000
const TIMEOUT_MS = 8_000

/** express.json guarda aqui el cuerpo tal como llego, para revisar la firma de Meta. */
export type WithRawBody = { rawBody?: Buffer }

// Meta firma los bytes crudos con el secreto de la app: volver a serializar el JSON cambiaria la firma.
export function validSignature(raw: Buffer | undefined, header: string | undefined, secret: string) {
  if (!raw || !header?.startsWith('sha256=')) return false
  const given = Buffer.from(header.slice(7), 'hex')
  const expected = createHmac('sha256', secret).update(raw).digest()
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// Solo se validan los campos que se usan, y cada evento por separado: uno raro no tumba el lote entero.
const entrySchema = z
  .object({
    changes: z.array(z.unknown()).optional(),
    id: z.string(),
    messaging: z.array(z.unknown()).optional(),
  })
  .passthrough()

const payloadSchema = z.object({ entry: z.array(entrySchema), object: z.string() }).passthrough()

const messagingSchema = z
  .object({
    message: z
      .object({
        attachments: z.array(z.object({ type: z.string() }).passthrough()).nullish(),
        is_deleted: z.boolean().optional(),
        is_echo: z.boolean().optional(),
        is_unsupported: z.boolean().optional(),
        mid: z.string().min(1),
        text: z.string().nullish(),
      })
      .passthrough()
      .optional(),
    postback: z.object({ mid: z.string().min(1), title: z.string().nullish() }).passthrough().optional(),
    sender: z.object({ id: z.string().min(1) }),
  })
  .passthrough()

const leadgenSchema = z
  .object({
    field: z.literal('leadgen'),
    value: z.object({ leadgen_id: z.union([z.string(), z.number()]) }).passthrough(),
  })
  .passthrough()

const ATTACHMENT_LABELS: Record<string, string> = {
  audio: 'Nota de voz',
  file: 'Documento',
  ig_reel: 'Reel compartido',
  image: 'Imagen',
  location: 'Ubicacion',
  reel: 'Reel compartido',
  share: 'Publicacion compartida',
  story_mention: 'Mencion en una historia',
  video: 'Video',
}

const CHANNEL_BY_OBJECT: Record<string, Channel> = { instagram: 'INSTAGRAM', page: 'FACEBOOK' }

export interface MetaChat {
  channel: Channel
  mid: string
  senderId: string
  text: string
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

function messageText(message: { attachments?: { type: string }[] | null; text?: string | null }) {
  const text = str(message.text)
  if (text) return text
  const type = message.attachments?.[0]?.type
  return type ? `${ATTACHMENT_LABELS[type] ?? 'Adjunto'} sin texto` : null
}

/** Separa un evento del webhook en mensajes de chat y avisos de formularios de Lead Ads. */
export function parseMetaWebhook(body: unknown) {
  const chats: MetaChat[] = []
  const leadgenIds: string[] = []
  const parsed = payloadSchema.safeParse(body)
  const channel = parsed.success ? CHANNEL_BY_OBJECT[parsed.data.object] : undefined
  if (!parsed.success || !channel) return { chats, leadgenIds }
  for (const entry of parsed.data.entry) {
    for (const raw of entry.messaging ?? []) {
      const ev = messagingSchema.safeParse(raw)
      if (!ev.success) continue
      const { message, postback, sender } = ev.data
      // Lo que responde la propia pagina llega como eco, y en Instagram tambien con su propio id de remitente.
      if (sender.id === entry.id || message?.is_echo || message?.is_deleted || message?.is_unsupported) continue
      const text = postback ? str(postback.title) : message ? messageText(message) : null
      const mid = postback?.mid ?? message?.mid
      if (text && mid) chats.push({ channel, mid, senderId: sender.id, text: text.slice(0, MAX_MESSAGE) })
    }
    // Los formularios de Instagram tambien llegan por la pagina de Facebook; Graph dice de cual fue.
    if (parsed.data.object !== 'page') continue
    for (const raw of entry.changes ?? []) {
      const change = leadgenSchema.safeParse(raw)
      if (change.success) leadgenIds.push(String(change.data.value.leadgen_id))
    }
  }
  return { chats, leadgenIds }
}

async function graph(id: string, fields: string) {
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${encodeURIComponent(id)}`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('access_token', env.META_PAGE_TOKEN!)
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  // El error no lleva la URL: trae el token de la pagina en la consulta.
  if (!res.ok) throw new Error(`Graph API respondio ${res.status} al consultar ${id}`)
  return (await res.json()) as Record<string, unknown>
}

// El nombre es un extra: si Meta no lo da (permiso, perfil privado, caida), el mensaje igual entra.
async function profileName(chat: MetaChat) {
  if (!env.META_PAGE_TOKEN) return null
  try {
    const data = await graph(chat.senderId, chat.channel === 'INSTAGRAM' ? 'name,username' : 'name')
    const username = str(data.username)
    return str(data.name) ?? (username ? `@${username}` : null)
  } catch (e) {
    console.error('Meta: no se pudo leer el nombre del remitente', e instanceof Error ? e.message : e)
    return null
  }
}

export async function chatToLead(chat: MetaChat): Promise<InboundLead> {
  const prefix = chat.channel.toLowerCase()
  const name = await profileName(chat)
  return {
    channel: chat.channel,
    contactName: (name ?? `${CHANNEL_LABELS[chat.channel]} ${chat.senderId.slice(-6)}`).slice(0, 120),
    contactRef: `${prefix}:${chat.senderId}`,
    externalRef: `${prefix}:${chat.mid}`,
    message: chat.text,
  }
}

const formSchema = z
  .object({
    field_data: z.array(z.object({ name: z.string(), values: z.array(z.string()).nullish() }).passthrough()).default([]),
    platform: z.string().nullish(),
  })
  .passthrough()

// Preguntas estandar de los formularios de Meta; las que arma Mercadeo van a la descripcion.
const FORM_FIELDS = new Set([
  'company_name',
  'email',
  'first_name',
  'full_name',
  'last_name',
  'phone_number',
  'work_email',
  'work_phone_number',
])

// Meta guarda el telefono con +506 o sin el, segun lo escriba el cliente.
function formPhone(value: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length === 8) return formatPhone(`506${digits}`)
  return digits.length > 8 ? formatPhone(digits) : value
}

const question = (key: string) => {
  const s = key.replace(/_/g, ' ').replace(/\?+$/, '').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Convierte la respuesta de Graph a un formulario de Lead Ads (de Facebook o Instagram) en un lead. */
export function formToLead(leadgenId: string, data: unknown): InboundLead {
  const form = formSchema.parse(data)
  const answers = new Map(form.field_data.map((f) => [f.name.toLowerCase(), str(f.values?.join(', '))]))
  const get = (k: string) => answers.get(k) ?? null
  const email = (get('email') ?? get('work_email'))?.toLowerCase() ?? null
  const parts = [get('first_name'), get('last_name')].filter(Boolean).join(' ')
  const name = get('full_name') ?? (parts || email?.split('@')[0])
  const channel: Channel = form.platform?.toLowerCase() === 'ig' ? 'INSTAGRAM' : 'FACEBOOK'
  const extra = [...answers].filter(([k, v]) => v && !FORM_FIELDS.has(k)).map(([k, v]) => `${question(k)}: ${v}`)
  const message = [`Formulario de ${CHANNEL_LABELS[channel]} (Lead Ads)`, ...extra].join('\n')
  return {
    channel,
    company: get('company_name'),
    contactName: (name || `Cliente de ${CHANNEL_LABELS[channel]}`).slice(0, 120),
    email,
    externalRef: `metalead:${leadgenId}`,
    message: message.slice(0, MAX_MESSAGE),
    phone: formPhone(get('phone_number') ?? get('work_phone_number')),
  }
}

async function ingestForm(leadgenId: string) {
  // Meta reintenta el aviso: si ya entro, no se vuelve a consultar Graph.
  const known = await prisma.lead.findUnique({ where: { externalRef: `metalead:${leadgenId}` }, select: { code: true } })
  if (known) return known.code
  if (!env.META_PAGE_TOKEN) {
    console.error(`Meta: llego el formulario ${leadgenId} pero falta META_PAGE_TOKEN para leerlo`)
    return null
  }
  return ingestLead(formToLead(leadgenId, await graph(leadgenId, 'field_data,platform')))
}

/** Procesa un evento ya firmado. Un error de Graph o de la BD se propaga para que Meta lo reintente. */
export async function ingestMeta(body: unknown) {
  const { chats, leadgenIds } = parseMetaWebhook(body)
  // En serie para que los codigos LEAD-AAAA-#### sigan el orden de llegada.
  const codes: string[] = []
  for (const chat of chats) codes.push(await ingestLead(await chatToLead(chat)))
  for (const id of leadgenIds) {
    const code = await ingestForm(id)
    if (code) codes.push(code)
  }
  return codes
}
