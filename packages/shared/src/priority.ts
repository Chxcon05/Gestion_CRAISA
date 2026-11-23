import { CHANNEL_LABELS, CLOSED_STATUSES, STATUS_LABELS, type Channel, type LeadStatus } from './enums.ts'

// Puntaje por reglas, de 0 a 100. Vive en shared para que el API guarde el mismo numero que la
// interfaz explica: el listado ordena por la columna y el detalle muestra de donde salio cada punto.

export const PRIORITY_LEVELS = ['ALTA', 'MEDIA', 'BAJA'] as const
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
}

// Una visita o una feria son contacto cara a cara; un comentario en redes suele ser solo curiosidad.
const CHANNEL_POINTS: Record<Channel, number> = {
  CORREO: 15,
  FACEBOOK: 5,
  FERIA: 20,
  INSTAGRAM: 5,
  LLAMADA: 20,
  OTRO: 10,
  SITIO_WEB: 15,
  VISITA_COMERCIAL: 25,
  WHATSAPP: 15,
}

const STAGE_POINTS: Record<LeadStatus, number> = {
  NUEVO: 10,
  ASIGNADO: 10,
  CONTACTADO: 15,
  EN_SEGUIMIENTO: 25,
  OPORTUNIDAD: 35,
  GANADO: 0,
  PERDIDO: 0,
}

export interface ScoreInput {
  channel: Channel
  company: string | null
  description: string
  email: string | null
  phone: string | null
  productId: string | null
  status: LeadStatus
}

export interface Priority {
  /** Null en leads cerrados: ya no compiten por la atencion del vendedor. */
  level: PriorityLevel | null
  reasons: string[]
  score: number
}

// Cortes medidos sobre los leads abiertos del seed: dejan cerca de un tercio en cada nivel. Con
// cortes mas bajos casi todo salia Alta y la columna dejaba de ayudar a elegir.
export const levelOf = (score: number): PriorityLevel => (score >= 80 ? 'ALTA' : score >= 60 ? 'MEDIA' : 'BAJA')

export function scoreLead(l: ScoreInput): Priority {
  if (CLOSED_STATUSES.includes(l.status)) return { level: null, reasons: [], score: 0 }
  const parts: [string, number][] = [
    [`Etapa ${STATUS_LABELS[l.status]}`, STAGE_POINTS[l.status]],
    [`Canal ${CHANNEL_LABELS[l.channel]}`, CHANNEL_POINTS[l.channel]],
  ]
  if (l.company) parts.push(['Consulta de una empresa', 15])
  if (l.productId) parts.push(['Producto de interes definido', 10])
  if (l.phone && l.email) parts.push(['Dejo telefono y correo', 10])
  if (l.description.trim().length >= 80) parts.push(['Consulta detallada', 5])
  const score = parts.reduce((n, [, p]) => n + p, 0)
  return { level: levelOf(score), reasons: parts.map(([r, p]) => `${r} (+${p})`), score }
}
