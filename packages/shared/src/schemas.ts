import { z } from 'zod'
import { CHANNELS, LEAD_STATUSES, ROLES } from './enums.ts'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use el formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha no valida')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximo ${max} caracteres`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,19}$/, 'Telefono no valido')

export const leadBaseSchema = z.object({
  entryDate: isoDate,
  contactName: z.string().trim().min(2, 'Ingrese el nombre').max(120),
  company: optionalText(120),
  phone: z.union([phone, z.literal('')]).optional().nullable().transform((v) => (v ? v : null)),
  email: z
    .union([z.string().trim().email('Correo no valido').max(160), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v.toLowerCase() : null)),
  channel: z.enum(CHANNELS, { errorMap: () => ({ message: 'Seleccione el canal' }) }),
  businessLineId: z.string().min(1, 'Seleccione la linea'),
  productId: optionalText(40),
  description: z.string().trim().min(5, 'Describa la consulta (minimo 5 caracteres)').max(2000),
  assignedToId: z.string().min(1, 'Seleccione el responsable'),
  status: z.enum(LEAD_STATUSES).default('NUEVO'),
  nextAction: optionalText(200),
  nextActionAt: z.union([isoDate, z.literal('')]).optional().nullable().transform((v) => (v ? v : null)),
  lossReason: optionalText(500),
})

type LeadShape = z.infer<typeof leadBaseSchema>

// Reglas que cruzan campos; se reusan en crear y editar para que el mensaje sea el mismo.
function leadRules(v: Partial<LeadShape>, ctx: z.RefinementCtx) {
  if ('phone' in v || 'email' in v) {
    if (!v.phone && !v.email) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Indique telefono o correo' })
    }
  }
  if (v.status === 'PERDIDO' && !v.lossReason) {
    ctx.addIssue({ code: 'custom', path: ['lossReason'], message: 'Indique el motivo de perdida' })
  }
  if (v.nextActionAt && !v.nextAction) {
    ctx.addIssue({ code: 'custom', path: ['nextAction'], message: 'Describa la proxima accion' })
  }
}

export const leadCreateSchema = leadBaseSchema.superRefine(leadRules)
export type LeadCreateInput = z.input<typeof leadCreateSchema>
export type LeadCreate = z.output<typeof leadCreateSchema>

// El estado no se edita aqui: pasa por statusChangeSchema para que quede en la bitacora.
export const leadUpdateSchema = leadBaseSchema.omit({ status: true }).partial().superRefine(leadRules)
export type LeadUpdate = z.output<typeof leadUpdateSchema>

export const statusChangeSchema = z
  .object({
    status: z.enum(LEAD_STATUSES),
    note: optionalText(2000),
    lossReason: optionalText(500),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'PERDIDO' && !v.lossReason) {
      ctx.addIssue({ code: 'custom', path: ['lossReason'], message: 'Indique el motivo de perdida' })
    }
  })
export type StatusChange = z.output<typeof statusChangeSchema>

// Formulario Contactenos del sitio web. "website" es un campo trampa oculto: una persona lo deja vacio, un bot lo llena.
export const webIngestSchema = leadBaseSchema
  .pick({ company: true, contactName: true, email: true, phone: true })
  .extend({
    businessLine: optionalText(80),
    message: z.string().trim().min(1, 'Escriba el mensaje').max(2000),
    website: z.string().max(0, 'Solicitud no valida').optional(),
  })
  .superRefine(leadRules)
export type WebIngest = z.output<typeof webIngestSchema>

// Basta uno de los dos; el telefono se compara por sus ultimos 8 digitos, asi "+506 8888-1234" y "88881234" coinciden.
export const duplicatesQuerySchema = z.object({
  email: z.string().trim().max(160).optional(),
  exclude: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(30).optional(),
})

export const noteSchema = z.object({
  content: z.string().trim().min(1, 'Escriba la nota').max(2000),
})

// Los arrays llegan por query string como "A,B" o repetidos (?status=A&status=B).
const csvArray = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).filter(Boolean)))
    .pipe(z.array(item))

export const SORT_FIELDS = ['code', 'contactName', 'entryDate', 'nextActionAt', 'score', 'status', 'updatedAt'] as const

export const leadFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: csvArray(z.enum(LEAD_STATUSES)),
  channel: csvArray(z.enum(CHANNELS)),
  businessLineId: csvArray(z.string()),
  assignedToId: z.string().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  overdue: z.enum(['1']).optional(),
  /** Proxima accion de leads abiertos para hoy o para los proximos 7 dias (sin hoy). */
  due: z.enum(['today', 'week']).optional(),
  sort: z.enum(SORT_FIELDS).default('entryDate'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
})
export type LeadFilters = z.output<typeof leadFiltersSchema>

export const dashboardQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  granularity: z.enum(['day', 'week', 'month']).default('week'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo no valido'),
  password: z.string().min(1, 'Ingrese la contrasena'),
})

// Evolution y wa.me piden el numero con codigo de pais y sin simbolos; 8 digitos se toman como de Costa Rica.
// Vacio borra el numero: ese usuario deja de recibir avisos por WhatsApp.
const whatsappSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .transform((d) => (d.length === 8 ? `506${d}` : d))
  .refine((d) => d === '' || /^\d{10,15}$/.test(d), 'Use 8 digitos o el numero con codigo de pais')
  .transform((d) => d || null)

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Ingrese el nombre').max(120),
  email: z.string().trim().toLowerCase().email('Correo no valido'),
  password: z.string().min(8, 'Minimo 8 caracteres').max(100),
  role: z.enum(ROLES),
  whatsapp: whatsappSchema.optional(),
})

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, 'Minimo 8 caracteres').max(100).optional(),
  whatsapp: whatsappSchema.optional(),
})

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2, 'Ingrese el nombre').max(80),
  active: z.boolean().optional(),
})

export const productSchema = catalogItemSchema.extend({
  businessLineId: z.string().min(1, 'Seleccione la linea'),
})
