import { Prisma } from '@prisma/client'
import { CHANNEL_LABELS, CLOSED_STATUSES, type Channel } from '@craisa/shared'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { toDate, todayIso } from '../lib/dates.ts'
import { audit } from '../lib/audit.ts'
import { nextCode } from '../leads/service.ts'
import { phoneKey, refreshScore } from '../leads/insights.ts'
import { notify } from '../notifications/service.ts'

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** Lead que llega de un canal digital ya normalizado; cada canal (web, WhatsApp, Meta) arma uno de estos. */
export interface InboundLead {
  /** Nombre sugerido de la linea; si no coincide con una activa se usa la linea por defecto. */
  businessLine?: string | null
  channel: Channel
  company?: string | null
  contactName: string
  /** Id del remitente en un chat sin telefono (Messenger, Instagram); agrupa sus mensajes en un lead. */
  contactRef?: string | null
  email?: string | null
  /** Id del mensaje en el canal; si ya entro, se devuelve el lead existente en vez de crear otro. */
  externalRef?: string | null
  message: string
  phone?: string | null
}

// Los leads automaticos entran sin responsable, como Nuevos sin atender, hasta que un admin los reparte:
// por eso el aviso va a todos los admins activos y no a uno fijo.
async function activeAdmins(tx: Tx) {
  const admins = await tx.user.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true } })
  return admins.map((a) => a.id)
}

// Sin tildes ni mayusculas: el sitio escribe "Agricola" o "Construccion" con tilde y el catalogo no.
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

async function resolveLine(tx: Tx, suggested?: string | null) {
  if (suggested) {
    const active = await tx.businessLine.findMany({ where: { active: true } })
    const match = active.find((l) => normalize(l.name) === normalize(suggested))
    if (match) return match
  }
  // Upsert y no find: la linea por defecto se crea sola la primera vez, sin pasos manuales en produccion.
  return tx.businessLine.upsert({
    where: { name: env.INGEST_BUSINESS_LINE },
    create: { name: env.INGEST_BUSINESS_LINE },
    update: {},
  })
}

const isDuplicateRef = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError &&
  e.code === 'P2002' &&
  String(e.meta?.target ?? '').includes('externalRef')

type OpenLead = { id: string; code: string; assignedToId: string | null }

// Un cliente manda varios mensajes seguidos: van a la bitacora de su lead abierto y no a un lead nuevo cada uno.
function findOpenLead(input: InboundLead): Promise<OpenLead | null> {
  if (input.contactRef) {
    return prisma.lead.findFirst({
      where: { contactRef: input.contactRef, status: { notIn: [...CLOSED_STATUSES] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true, assignedToId: true },
    })
  }
  return input.channel === 'WHATSAPP' && input.phone ? findOpenByPhone(input.phone) : Promise.resolve(null)
}

async function findOpenByPhone(phone: string) {
  const key = phoneKey(phone)
  if (!key) return null
  const rows = await prisma.$queryRaw<OpenLead[]>`
    SELECT id, code, "assignedToId" FROM leads
    WHERE status::text NOT IN (${Prisma.join([...CLOSED_STATUSES])})
      AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 8) = ${key}
    ORDER BY "createdAt" DESC
    LIMIT 1`
  return rows[0] ?? null
}

async function findByRef(ref: string) {
  const lead = await prisma.lead.findUnique({ where: { externalRef: ref }, select: { code: true } })
  if (lead) return lead.code
  const message = await prisma.interaction.findUnique({ where: { externalRef: ref }, select: { lead: { select: { code: true } } } })
  return message?.lead.code ?? null
}

export async function ingestLead(input: InboundLead) {
  const ref = input.externalRef ?? null
  if (ref) {
    const existing = await findByRef(ref)
    if (existing) return existing
  }
  try {
    const open = await findOpenLead(input)
    return open ? await appendMessage(open, input, ref) : await createInbound(input, ref)
  } catch (e) {
    // Dos reintentos simultaneos pasan la consulta de arriba; el indice unico deja entrar solo a uno.
    if (!ref || !isDuplicateRef(e)) throw e
    const code = await findByRef(ref)
    if (!code) throw e
    return code
  }
}

async function appendMessage(lead: OpenLead, input: InboundLead, ref: string | null) {
  const label = CHANNEL_LABELS[input.channel]
  await prisma.$transaction(async (tx) => {
    await tx.interaction.create({ data: { leadId: lead.id, type: 'MENSAJE', content: input.message, externalRef: ref } })
    // El cliente volvio a escribir: cuenta como actividad del lead, igual que una nota.
    await tx.lead.update({ where: { id: lead.id }, data: { updatedAt: new Date() }, select: { id: true } })
    const recipients = lead.assignedToId ? [lead.assignedToId] : await activeAdmins(tx)
    for (const userId of recipients) {
      await notify(tx, { actorId: null, leadId: lead.id, message: `Mensaje nuevo por ${label}`, type: 'ACTIVIDAD', userId })
    }
  })
  return lead.code
}

async function createInbound(input: InboundLead, ref: string | null) {
  const label = CHANNEL_LABELS[input.channel]
  const entryDate = todayIso()
  // La descripcion pide 5 caracteres en el formulario; un "hola" por chat igual debe entrar.
  const description = input.message.length < 5 ? `Mensaje desde ${label}: ${input.message}` : input.message
  const created = await prisma.$transaction(async (tx) => {
    const line = await resolveLine(tx, input.businessLine)
    const newCode = await nextCode(tx, entryDate)
    const lead = await tx.lead.create({
      data: {
        code: newCode,
        autoCaptured: true,
        businessLineId: line.id,
        channel: input.channel,
        company: input.company ?? null,
        contactName: input.contactName,
        contactRef: input.contactRef ?? null,
        description,
        email: input.email ?? null,
        externalRef: ref,
        entryDate: toDate(entryDate),
        phone: input.phone ?? null,
        status: 'NUEVO',
        interactions: {
          create: {
            type: 'CREACION',
            toStatus: 'NUEVO',
            content: `Lead capturado automaticamente desde ${label}, pendiente de asignar`,
          },
        },
      },
    })
    await refreshScore(tx, lead.id)
    for (const userId of await activeAdmins(tx)) {
      await notify(tx, { actorId: null, leadId: lead.id, message: `Lead nuevo desde ${label}`, type: 'LEAD_AUTOMATICO', userId })
    }
    return newCode
  })
  await audit(null, 'LEAD_AUTOMATICO', `${created} - ${label}`)
  return created
}
