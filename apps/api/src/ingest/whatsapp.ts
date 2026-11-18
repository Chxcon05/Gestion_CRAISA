import { z } from 'zod'
import type { InboundLead } from './service.ts'

// Solo se validan los campos que se usan; Meta agrega campos nuevos seguido y no deben romper el webhook.
const messageSchema = z
  .object({
    from: z.string().regex(/^\d{6,20}$/),
    id: z.string().min(1),
    type: z.string(),
  })
  .passthrough()

const payloadSchema = z.object({
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z
            .object({
              contacts: z
                .array(z.object({ profile: z.object({ name: z.string() }).partial().optional(), wa_id: z.string() }))
                .optional(),
              messages: z.array(messageSchema).optional(),
            })
            .passthrough(),
        }),
      ),
    }),
  ),
  object: z.literal('whatsapp_business_account'),
})

type Message = z.infer<typeof messageSchema>

// Una reaccion con emoji o un aviso del sistema no es una consulta: no generan lead.
const IGNORED_TYPES = new Set(['reaction', 'request_welcome', 'system', 'unsupported'])

const MEDIA_LABELS: Record<string, string> = {
  audio: 'Nota de voz',
  contacts: 'Contacto compartido',
  document: 'Documento',
  image: 'Imagen',
  location: 'Ubicacion',
  sticker: 'Sticker',
  video: 'Video',
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const field = (m: Message, key: string) => (m[key] && typeof m[key] === 'object' ? (m[key] as Record<string, unknown>) : {})

function messageText(m: Message) {
  if (m.type === 'text') return str(field(m, 'text').body)
  if (m.type === 'button') return str(field(m, 'button').text)
  if (m.type === 'interactive') {
    const i = field(m, 'interactive')
    const reply = (i.button_reply ?? i.list_reply ?? {}) as Record<string, unknown>
    return str(reply.title)
  }
  const label = MEDIA_LABELS[m.type] ?? `Mensaje de tipo ${m.type}`
  const media = field(m, m.type)
  const detail = str(media.caption) ?? str(media.name) ?? str(media.address)
  return detail ? `${label}: ${detail}` : `${label} sin texto`
}

/** "50688887777" a "+506 8888-7777"; los numeros de otros paises quedan como +<digitos>. */
export function formatPhone(waId: string) {
  const cr = /^506(\d{4})(\d{4})$/.exec(waId)
  return cr ? `+506 ${cr[1]}-${cr[2]}` : `+${waId}`
}

/** Convierte una notificacion del webhook en un lead por mensaje; ignora estados de entrega y reacciones. */
export function parseWhatsAppWebhook(body: unknown): InboundLead[] {
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) return []
  const leads: InboundLead[] = []
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue
      const { contacts = [], messages = [] } = change.value
      for (const m of messages) {
        if (IGNORED_TYPES.has(m.type)) continue
        const text = messageText(m)
        if (!text) continue
        const phone = formatPhone(m.from)
        const profile = str(contacts.find((c) => c.wa_id === m.from)?.profile?.name)
        leads.push({
          channel: 'WHATSAPP',
          contactName: (profile && profile.length >= 2 ? profile : `WhatsApp ${phone}`).slice(0, 120),
          externalRef: `whatsapp:${m.id}`,
          message: text.slice(0, 2000),
          phone,
        })
      }
    }
  }
  return leads
}
