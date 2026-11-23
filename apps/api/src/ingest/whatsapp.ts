import { z } from 'zod'
import type { InboundLead } from './service.ts'

// Solo se validan los campos que se usan; Evolution agrega campos entre versiones y no deben romper el webhook.
const keySchema = z
  .object({
    fromMe: z.boolean().optional(),
    id: z.string().min(1),
    remoteJid: z.string().min(1),
  })
  .passthrough()

const messageSchema = z
  .object({
    key: keySchema,
    message: z.record(z.string(), z.unknown()).nullish(),
    pushName: z.string().nullish(),
  })
  .passthrough()

const payloadSchema = z
  .object({
    data: z.union([messageSchema, z.array(messageSchema)]),
    event: z.string(),
  })
  .passthrough()

type Message = z.infer<typeof messageSchema>
type Obj = Record<string, unknown>

// Grupos, estados y canales no son consultas de un cliente.
const IGNORED_CHATS = ['@broadcast', '@g.us', '@newsletter']

// Una reaccion, un mensaje borrado o un cambio de llaves no es una consulta: no generan lead.
const IGNORED_TYPES = new Set(['protocolMessage', 'reactionMessage', 'senderKeyDistributionMessage'])

// Envoltorios que Baileys pone a los mensajes temporales y de una sola vista; el contenido real va dentro.
const WRAPPERS = ['documentWithCaptionMessage', 'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2']

const MEDIA_LABELS: Record<string, string> = {
  audioMessage: 'Nota de voz',
  contactMessage: 'Contacto compartido',
  contactsArrayMessage: 'Contacto compartido',
  documentMessage: 'Documento',
  imageMessage: 'Imagen',
  locationMessage: 'Ubicacion',
  stickerMessage: 'Sticker',
  videoMessage: 'Video',
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})

function unwrap(message: Obj): Obj {
  for (const w of WRAPPERS) {
    const inner = obj(obj(message[w]).message)
    if (Object.keys(inner).length) return unwrap(inner)
  }
  return message
}

function messageText(raw: Obj) {
  const m = unwrap(raw)
  const type = Object.keys(m).find((k) => k !== 'messageContextInfo')
  if (!type || IGNORED_TYPES.has(type)) return null
  const body = obj(m[type])
  if (type === 'conversation') return str(m.conversation)
  if (type === 'extendedTextMessage') return str(body.text)
  if (type === 'buttonsResponseMessage' || type === 'templateButtonReplyMessage') return str(body.selectedDisplayText)
  if (type === 'listResponseMessage') return str(body.title)
  const label = MEDIA_LABELS[type] ?? 'Mensaje sin texto'
  const detail = str(body.caption) ?? str(body.fileName) ?? str(body.address) ?? str(body.name) ?? str(body.displayName)
  return detail ? `${label}: ${detail}` : `${label} sin texto`
}

// Con el formato nuevo de WhatsApp el chat llega como "@lid", un id que no es el telefono; el numero viene aparte.
function senderDigits(m: Message) {
  const candidates = [m.key.remoteJid, m.key.remoteJidAlt, m.key.senderPn, m.key.participant]
  for (const jid of candidates) {
    if (typeof jid !== 'string' || !jid.endsWith('@s.whatsapp.net')) continue
    const digits = jid.split('@')[0]!.split(':')[0]!
    if (/^\d{6,20}$/.test(digits)) return digits
  }
  return null
}

/** "50688887777" a "+506 8888-7777"; los numeros de otros paises quedan como +<digitos>. */
export function formatPhone(digits: string) {
  const cr = /^506(\d{4})(\d{4})$/.exec(digits)
  return cr ? `+506 ${cr[1]}-${cr[2]}` : `+${digits}`
}

/** Convierte un evento del webhook de Evolution en un lead por mensaje recibido; ignora lo enviado por la empresa. */
export function parseEvolutionWebhook(body: unknown): InboundLead[] {
  const parsed = payloadSchema.safeParse(body)
  // Segun la configuracion, Evolution manda "messages.upsert" o "MESSAGES_UPSERT".
  if (!parsed.success || parsed.data.event.toLowerCase().replace('_', '.') !== 'messages.upsert') return []
  const messages = Array.isArray(parsed.data.data) ? parsed.data.data : [parsed.data.data]
  const leads: InboundLead[] = []
  for (const m of messages) {
    if (m.key.fromMe || IGNORED_CHATS.some((s) => m.key.remoteJid.endsWith(s))) continue
    const digits = senderDigits(m)
    const text = messageText(obj(m.message))
    if (!digits || !text) continue
    const phone = formatPhone(digits)
    const profile = str(m.pushName)
    leads.push({
      channel: 'WHATSAPP',
      contactName: (profile && profile.length >= 2 ? profile : `WhatsApp ${phone}`).slice(0, 120),
      externalRef: `whatsapp:${m.key.id}`,
      message: text.slice(0, 2000),
      phone,
    })
  }
  return leads
}
