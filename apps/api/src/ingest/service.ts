import { Prisma } from '@prisma/client'
import { CHANNEL_LABELS, type Channel } from '@craisa/shared'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { HttpError } from '../lib/http.ts'
import { toDate, todayIso } from '../lib/dates.ts'
import { audit } from '../lib/audit.ts'
import { nextCode } from '../leads/service.ts'
import { notify } from '../notifications/service.ts'

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** Lead que llega de un canal digital ya normalizado; cada canal (web, WhatsApp, Meta) arma uno de estos. */
export interface InboundLead {
  /** Nombre sugerido de la linea; si no coincide con una activa se usa la linea por defecto. */
  businessLine?: string | null
  channel: Channel
  company?: string | null
  contactName: string
  email?: string | null
  /** Id del mensaje en el canal; si ya entro, se devuelve el lead existente en vez de crear otro. */
  externalRef?: string | null
  message: string
  phone?: string | null
}

// Los leads automaticos van al admin para que el los reparta; nunca quedan sin responsable.
async function resolveAssignee(tx: Tx) {
  if (env.INGEST_ASSIGNEE_EMAIL) {
    const configured = await tx.user.findFirst({ where: { email: env.INGEST_ASSIGNEE_EMAIL, active: true } })
    if (configured) return configured
  }
  const admin = await tx.user.findFirst({ where: { role: 'ADMIN', active: true }, orderBy: { createdAt: 'asc' } })
  if (!admin) throw new HttpError(503, 'NO_ASSIGNEE', 'No hay un administrador activo para recibir el lead')
  return admin
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

export async function ingestLead(input: InboundLead) {
  const ref = input.externalRef ?? null
  if (ref) {
    const existing = await prisma.lead.findUnique({ where: { externalRef: ref }, select: { code: true } })
    if (existing) return existing.code
  }
  try {
    return await createInbound(input, ref)
  } catch (e) {
    // Dos reintentos simultaneos pasan la consulta de arriba; el indice unico deja entrar solo a uno.
    if (!ref || !isDuplicateRef(e)) throw e
    return (await prisma.lead.findUniqueOrThrow({ where: { externalRef: ref }, select: { code: true } })).code
  }
}

async function createInbound(input: InboundLead, ref: string | null) {
  const label = CHANNEL_LABELS[input.channel]
  const entryDate = todayIso()
  // La descripcion pide 5 caracteres en el formulario; un "hola" por chat igual debe entrar.
  const description = input.message.length < 5 ? `Mensaje desde ${label}: ${input.message}` : input.message
  const created = await prisma.$transaction(async (tx) => {
    const assignee = await resolveAssignee(tx)
    const line = await resolveLine(tx, input.businessLine)
    const newCode = await nextCode(tx, entryDate)
    const lead = await tx.lead.create({
      data: {
        code: newCode,
        autoCaptured: true,
        assignedToId: assignee.id,
        businessLineId: line.id,
        channel: input.channel,
        company: input.company ?? null,
        contactName: input.contactName,
        description,
        email: input.email ?? null,
        externalRef: ref,
        entryDate: toDate(entryDate),
        phone: input.phone ?? null,
        status: 'ASIGNADO',
        interactions: {
          create: {
            type: 'CREACION',
            toStatus: 'ASIGNADO',
            content: `Lead capturado automaticamente desde ${label} y asignado a ${assignee.name}`,
          },
        },
      },
    })
    await notify(tx, {
      actorId: null,
      leadId: lead.id,
      message: `Lead nuevo desde ${label}`,
      type: 'LEAD_AUTOMATICO',
      userId: assignee.id,
    })
    return { code: newCode, assigneeName: assignee.name }
  })
  await audit(null, 'LEAD_AUTOMATICO', `${created.code} - ${label} - ${created.assigneeName}`)
  return created.code
}
