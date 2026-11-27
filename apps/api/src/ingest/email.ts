import { createHash } from 'node:crypto'
import { ImapFlow } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { ingestLead, type InboundLead } from './service.ts'

const MAX_MESSAGE = 1900

// mailparser e imapflow no coinciden en si el Message-ID trae los <>; sin normalizar, cada pasada lo veria nuevo.
export const emailRef = (messageId: string) => `email:${messageId.trim().replace(/^<|>$/g, '')}`.slice(0, 190)

// Remitentes que nunca son un cliente: rebotes, avisos de sistemas y respuestas automaticas.
const SYSTEM_SENDER = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?|notifications?|alertas?)[@+.-]/i

/** Por que un correo no genera lead; null si si lo genera. */
export function skipReason(mail: ParsedMail, mailbox?: string): string | null {
  const from = mail.from?.value[0]?.address?.toLowerCase()
  if (!from) return 'sin remitente'
  if (mailbox && from === mailbox.toLowerCase()) return 'enviado por el mismo buzon'
  if (SYSTEM_SENDER.test(from)) return 'remitente de sistema'
  const h = mail.headers
  const auto = String(h.get('auto-submitted') ?? 'no').toLowerCase()
  if (auto !== 'no') return 'respuesta automatica'
  if (h.has('x-autoreply') || h.has('x-autorespond')) return 'respuesta automatica'
  // Boletines y listas traen List-Unsubscribe o List-Id; mailparser junta todos los List-* bajo "list".
  if (h.has('list') || h.has('list-unsubscribe') || h.has('list-id')) return 'boletin o lista de correo'
  if (/^(bulk|list|junk)$/i.test(String(h.get('precedence') ?? ''))) return 'envio masivo'
  return null
}

// Corta el hilo citado: sin esto, cada respuesta del cliente arrastra todo el historial al lead.
const QUOTE_START = /^(on .+wrote:|el .+escribi[oó]:|-{2,}\s*(original message|mensaje original)\s*-{2,}|de:\s.+|from:\s.+)$/i

export function cleanBody(text: string) {
  const out: string[] = []
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (QUOTE_START.test(line.trim())) break
    if (line.startsWith('>')) continue
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// Numeros de Costa Rica: 8 digitos que empiezan en 2 a 8, con o sin +506, espacios o guion.
const CR_PHONE = /(?:\+?506[\s.-]?)?\b([2-8]\d{3})[\s.-]?(\d{4})\b/

export function findPhone(text: string) {
  const m = CR_PHONE.exec(text)
  return m ? `${m[1]}-${m[2]}` : null
}

const htmlToText = (html: string) =>
  html
    .replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

/** Convierte un correo crudo en el lead que lo representa, o null si no es una consulta. */
export async function emailToLead(source: Buffer | string, mailbox?: string): Promise<InboundLead | null> {
  const mail = await simpleParser(source)
  if (skipReason(mail, mailbox)) return null
  const from = mail.from!.value[0]!
  const address = from.address!.toLowerCase()
  const body = cleanBody(mail.text ?? (mail.html ? htmlToText(mail.html) : ''))
  const subject = mail.subject?.trim()
  const message = [subject && `Asunto: ${subject}`, body].filter(Boolean).join('\n\n') || 'Correo sin texto'
  // Sin Message-ID (raro, pero pasa con algunos formularios) se usa una huella del correo.
  const id =
    mail.messageId ??
    createHash('sha256').update(`${address}|${mail.date?.toISOString() ?? ''}|${subject ?? ''}`).digest('hex').slice(0, 32)
  return {
    channel: 'CORREO',
    contactName: from.name?.trim() || address.split('@')[0]!,
    email: address,
    externalRef: emailRef(id),
    message: message.length > MAX_MESSAGE ? `${message.slice(0, MAX_MESSAGE)}...` : message,
    phone: findPhone(`${body}\n${subject ?? ''}`),
  }
}

export async function ingestEmail(source: Buffer | string, mailbox?: string) {
  const lead = await emailToLead(source, mailbox)
  return lead ? ingestLead(lead) : null
}

/**
 * Una pasada por el buzon. Se abre en solo lectura (EXAMINE): no marca nada como leido ni mueve
 * correos, asi el equipo sigue viendo el buzon igual. Lo ya importado se reconoce por el Message-ID.
 */
export async function pollMailbox() {
  const user = env.MAIL_IMAP_USER!
  const client = new ImapFlow({
    // Google muestra la contrasena de aplicacion en grupos de 4 con espacios; se acepta pegada tal cual.
    auth: { user, pass: env.MAIL_IMAP_PASSWORD!.replace(/\s+/g, '') },
    host: env.MAIL_IMAP_HOST,
    logger: false,
    port: env.MAIL_IMAP_PORT,
    secure: true,
  })
  await client.connect()
  let created = 0
  try {
    const lock = await client.getMailboxLock(env.MAIL_IMAP_FOLDER, { readOnly: true })
    try {
      const since = new Date(Date.now() - env.MAIL_LOOKBACK_HOURS * 3_600_000)
      const uids = (await client.search({ since }, { uid: true })) || []
      if (!uids.length) return 0
      const candidates: { uid: number; ref: string }[] = []
      for await (const m of client.fetch(uids, { envelope: true, internalDate: true }, { uid: true })) {
        const date = m.internalDate ? new Date(m.internalDate) : null
        if (m.envelope?.messageId && date && date >= since) candidates.push({ uid: m.uid, ref: emailRef(m.envelope.messageId) })
      }
      // Tambien en la bitacora: un correo de un lead fusionado queda guardado en la nota de la fusion.
      const refs = candidates.map((c) => c.ref)
      const [known, merged] = await Promise.all([
        prisma.lead.findMany({ where: { externalRef: { in: refs } }, select: { externalRef: true } }),
        prisma.interaction.findMany({ where: { externalRef: { in: refs } }, select: { externalRef: true } }),
      ])
      const seen = new Set([...known, ...merged].map((k) => k.externalRef))
      for (const c of candidates.filter((x) => !seen.has(x.ref))) {
        const msg = await client.fetchOne(String(c.uid), { source: true }, { uid: true })
        if (!msg || !msg.source) continue
        try {
          if (await ingestEmail(msg.source, user)) created += 1
        } catch (e) {
          // Un correo malformado no debe frenar los demas; se reintenta en la siguiente pasada.
          console.error(`No se pudo importar el correo ${c.ref}`, e)
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => client.close())
  }
  return created
}

export function startEmailPolling() {
  if (!env.MAIL_IMAP_USER || !env.MAIL_IMAP_PASSWORD) return false
  let running = false
  const tick = async () => {
    // Si una pasada tarda mas que el intervalo, la siguiente se salta en vez de duplicar conexiones.
    if (running) return
    running = true
    try {
      const n = await pollMailbox()
      if (n) console.info(`Correo: ${n} leads nuevos desde ${env.MAIL_IMAP_USER}`)
    } catch (e) {
      console.error('Correo: no se pudo revisar el buzon', e instanceof Error ? e.message : e)
    } finally {
      running = false
    }
  }
  void tick()
  setInterval(tick, env.MAIL_POLL_SECONDS * 1000).unref()
  return true
}
