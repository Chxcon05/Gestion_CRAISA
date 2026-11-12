import { CHANNEL_LABELS, type Channel } from '@craisa/shared'
import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { HttpError } from '../lib/http.ts'
import { toDate, todayIso } from '../lib/dates.ts'
import { audit } from '../lib/audit.ts'
import { nextCode } from '../leads/service.ts'

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** Lead que llega de un canal digital ya normalizado; cada canal (web, WhatsApp, Meta) arma uno de estos. */
export interface InboundLead {
  /** Nombre sugerido de la linea; si no coincide con una activa se usa la linea por defecto. */
  businessLine?: string | null
  channel: Channel
  company?: string | null
  contactName: string
  email?: string | null
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

export async function ingestLead(input: InboundLead) {
  const label = CHANNEL_LABELS[input.channel]
  const entryDate = todayIso()
  // La descripcion pide 5 caracteres en el formulario; un "hola" por chat igual debe entrar.
  const description = input.message.length < 5 ? `Mensaje desde ${label}: ${input.message}` : input.message
  const created = await prisma.$transaction(async (tx) => {
    const assignee = await resolveAssignee(tx)
    const line = await resolveLine(tx, input.businessLine)
    const newCode = await nextCode(tx, entryDate)
    await tx.lead.create({
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
    return { code: newCode, assigneeName: assignee.name }
  })
  await audit(null, 'LEAD_AUTOMATICO', `${created.code} - ${label} - ${created.assigneeName}`)
  return created.code
}
