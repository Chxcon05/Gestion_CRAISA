import { env } from '../env.ts'
import { prisma } from '../lib/prisma.ts'
import { sendWhatsApp } from '../lib/evolution.ts'

const DESCRIPTION_MAX = 300

// El enlace wa.me necesita el numero completo; un telefono local de 8 digitos se asume de Costa Rica.
function waLink(phone: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits.length === 8 ? `506${digits}` : digits}`
}

/**
 * Avisa por WhatsApp al responsable del lead. Se llama despues de confirmar la transaccion, para no
 * avisar de una asignacion que se deshizo; nadie recibe aviso de lo que hizo el mismo.
 */
export async function notifyAssignment(leadId: string, actorId: string | null) {
  if (!env.EVOLUTION_API_KEY) return false
  try {
    return await buildAndSend(leadId, actorId)
  } catch (e) {
    console.error('No se pudo preparar el aviso por WhatsApp:', e instanceof Error ? e.message : e)
    return false
  }
}

async function buildAndSend(leadId: string, actorId: string | null) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      assignedTo: { select: { id: true, whatsapp: true } },
      businessLine: { select: { name: true } },
      product: { select: { name: true } },
    },
  })
  const to = lead?.assignedTo
  if (!lead || !to?.whatsapp || to.id === actorId) return false
  const link = waLink(lead.phone)
  const description =
    lead.description.length > DESCRIPTION_MAX ? `${lead.description.slice(0, DESCRIPTION_MAX)}...` : lead.description
  const lines = [
    `*Lead asignado: ${lead.code}*`,
    `Cliente: ${lead.contactName}${lead.company ? ` (${lead.company})` : ''}`,
    lead.phone && `Telefono: ${lead.phone}`,
    lead.email && `Correo: ${lead.email}`,
    `Linea: ${lead.businessLine.name}${lead.product ? ` - ${lead.product.name}` : ''}`,
    `Consulta: ${description}`,
    '',
    link && `Escribirle: ${link}`,
    `Ver en CRAISA: ${env.APP_URL.replace(/\/$/, '')}/leads/${lead.code}`,
  ]
  return sendWhatsApp(to.whatsapp, lines.filter((l) => l !== null && l !== undefined).join('\n'))
}
