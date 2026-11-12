// Datos ficticios para desarrollo y demo. El documento de alcance prohibe usar datos reales sin aprobacion de CRAISA.
import { PrismaClient, type Channel, type LeadStatus, type Prisma } from '@prisma/client'
import { fakerES as faker } from '@faker-js/faker'
import { hash } from 'bcryptjs'
import { LEAD_STATUSES, STATUS_LABELS } from '@craisa/shared'

if (process.env.NODE_ENV === 'production') {
  console.error('El seed borra datos: no se ejecuta en produccion.')
  process.exit(1)
}

const prisma = new PrismaClient()
faker.seed(2026)

const DEMO_PASSWORD = 'Craisa2026!'

const USERS = [
  { name: 'Admin CRAISA', email: 'admin@craisa.test', role: 'ADMIN' },
  { name: 'Carlos Mora', email: 'carlos.mora@craisa.test', role: 'VENDEDOR' },
  { name: 'Diego Vargas', email: 'diego.vargas@craisa.test', role: 'VENDEDOR' },
  { name: 'Laura Jimenez', email: 'laura.jimenez@craisa.test', role: 'VENDEDOR' },
  { name: 'Mariana Solis', email: 'mercadeo@craisa.test', role: 'MERCADEO' },
] as const

// Lineas y productos de ejemplo; los definitivos los define Mercadeo desde Catalogos.
const LINES: Record<string, string[]> = {
  Agricola: ['Cosechadora', 'Implementos de labranza', 'Repuestos agricolas', 'Tractor 75 HP'],
  Carga: ['Apilador manual', 'Montacargas diesel', 'Montacargas electrico'],
  Construccion: ['Compactador', 'Excavadora', 'Minicargador', 'Retroexcavadora'],
  Institucional: ['Equipo para obra publica', 'Flotilla municipal'],
  Postventa: ['Capacitacion', 'Garantia', 'Mantenimiento preventivo', 'Repuestos'],
  Precision: ['Drones agricolas', 'GPS y autoguiado', 'Telemetria'],
}

const CHANNEL_WEIGHTS: Record<Channel, number> = {
  CORREO: 6,
  FACEBOOK: 12,
  FERIA: 6,
  INSTAGRAM: 8,
  LLAMADA: 10,
  OTRO: 2,
  SITIO_WEB: 16,
  VISITA_COMERCIAL: 7,
  WHATSAPP: 22,
}
const STATUS_WEIGHTS: Record<LeadStatus, number> = {
  NUEVO: 10,
  ASIGNADO: 10,
  CONTACTADO: 14,
  EN_SEGUIMIENTO: 16,
  OPORTUNIDAD: 12,
  GANADO: 14,
  PERDIDO: 12,
}
const LOSS_REASONS = ['Compro a la competencia', 'Fuera de presupuesto', 'No respondio', 'Pospuso la compra', 'Precio']
const NOTES = [
  'Cliente solicita cotizacion formal',
  'Coordinar visita a la finca',
  'Interesado en financiamiento',
  'Llamada sin respuesta, se reintenta',
  'Pide comparar con modelo anterior',
  'Se agenda demostracion en sitio',
  'Se envio ficha tecnica por correo',
]
const NEXT_ACTIONS = ['Demostracion de equipo', 'Enviar cotizacion', 'Enviar ficha tecnica', 'Llamar de seguimiento', 'Visita comercial']
const COMPANY_PREFIX = ['Agroindustrial', 'Constructora', 'Finca', 'Municipalidad de', 'Transportes']

const DAY = 86_400_000
const weighted = <K extends string>(w: Record<K, number>): K =>
  faker.helpers.weightedArrayElement((Object.entries(w) as [K, number][]).map(([value, weight]) => ({ value, weight })))
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const dateOnly = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const shift = (iso: string, days: number) => isoDay(new Date(dateOnly(iso).getTime() + days * DAY))

/** Recorrido de estados desde NUEVO hasta el estado final, para que la bitacora sea coherente. */
function statusPath(final: LeadStatus): LeadStatus[] {
  const funnel = LEAD_STATUSES.filter((s) => s !== 'GANADO' && s !== 'PERDIDO')
  if (final === 'GANADO') return [...funnel.slice(1), 'GANADO']
  if (final === 'PERDIDO') return [...funnel.slice(1, faker.number.int({ min: 1, max: funnel.length })), 'PERDIDO']
  return funnel.slice(1, funnel.indexOf(final) + 1)
}

async function main() {
  await prisma.$transaction([
    prisma.interaction.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.leadSequence.deleteMany(),
    prisma.product.deleteMany(),
    prisma.businessLine.deleteMany(),
    prisma.user.deleteMany(),
  ])

  const passwordHash = await hash(DEMO_PASSWORD, 10)
  const users = await Promise.all(USERS.map((u) => prisma.user.create({ data: { ...u, passwordHash } })))
  const sellers = users.filter((u) => u.role === 'VENDEDOR')
  const marketing = users.find((u) => u.role === 'MERCADEO')
  if (!marketing) throw new Error('Falta usuario de Mercadeo en el seed')

  const lines = await Promise.all(
    Object.entries(LINES).map(([name, products]) =>
      prisma.businessLine.create({
        data: { name, products: { create: products.map((p) => ({ name: p })) } },
        include: { products: true },
      }),
    ),
  )

  const now = new Date()
  const today = isoDay(now)
  const entries = Array.from({ length: 180 }, () => shift(today, -faker.number.int({ min: 0, max: 180 }))).sort()

  const seq = new Map<number, number>()
  for (const entry of entries) {
    const year = Number(entry.slice(0, 4))
    const n = (seq.get(year) ?? 0) + 1
    seq.set(year, n)

    const line = faker.helpers.arrayElement(lines)
    // Los leads recientes tienden a estar al inicio del embudo, como en la realidad.
    const age = (dateOnly(today).getTime() - dateOnly(entry).getTime()) / DAY
    const target: LeadStatus =
      age < 7 ? faker.helpers.arrayElement(['NUEVO', 'ASIGNADO', 'CONTACTADO'] as const) : weighted(STATUS_WEIGHTS)
    const seller = target === 'NUEVO' && faker.datatype.boolean(0.4) ? null : faker.helpers.arrayElement(sellers)
    const hasPhone = faker.datatype.boolean(0.9)
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    const actor = seller ?? marketing

    const interactions: Prisma.InteractionCreateWithoutLeadInput[] = [
      {
        type: 'CREACION',
        content: 'Lead registrado',
        toStatus: 'NUEVO',
        user: { connect: { id: marketing.id } },
        createdAt: new Date(dateOnly(entry).getTime() + 9 * 3_600_000),
      },
    ]
    // El estado final es hasta donde alcanzo el recorrido sin pasar de hoy.
    let status: LeadStatus = 'NUEVO'
    let at = dateOnly(entry).getTime() + 10 * 3_600_000
    for (const s of statusPath(target)) {
      const next = at + faker.number.int({ min: 1, max: 4 }) * DAY
      if (next > now.getTime()) break
      at = next
      if (faker.datatype.boolean(0.5)) {
        interactions.push({
          type: 'NOTA',
          content: faker.helpers.arrayElement(NOTES),
          user: { connect: { id: actor.id } },
          createdAt: new Date(at),
        })
      }
      interactions.push({
        type: 'CAMBIO_ESTADO',
        fromStatus: status,
        toStatus: s,
        content: `${STATUS_LABELS[status]} a ${STATUS_LABELS[s]}`,
        user: { connect: { id: actor.id } },
        createdAt: new Date(at + 3_600_000),
      })
      status = s
    }
    const open = status !== 'GANADO' && status !== 'PERDIDO'

    const product = faker.helpers.arrayElement(line.products)
    await prisma.lead.create({
      data: {
        code: `LEAD-${year}-${String(n).padStart(4, '0')}`,
        entryDate: dateOnly(entry),
        contactName: `${first} ${last}`,
        company: faker.datatype.boolean(0.7) ? `${faker.helpers.arrayElement(COMPANY_PREFIX)} ${faker.location.city()}` : null,
        phone: hasPhone ? `${faker.helpers.arrayElement(['2', '6', '7', '8'])}${faker.string.numeric(3)}-${faker.string.numeric(4)}` : null,
        email:
          !hasPhone || faker.datatype.boolean(0.6)
            ? faker.internet.email({ firstName: first, lastName: last, provider: 'ejemplo.cr' }).toLowerCase()
            : null,
        channel: weighted(CHANNEL_WEIGHTS),
        businessLineId: line.id,
        productId: faker.datatype.boolean(0.8) ? product.id : null,
        description: `Consulta por ${product.name.toLowerCase()}. ${faker.helpers.arrayElement(NOTES)}.`,
        status,
        assignedToId: seller?.id ?? null,
        createdById: marketing.id,
        lossReason: status === 'PERDIDO' ? faker.helpers.arrayElement(LOSS_REASONS) : null,
        nextAction: open && seller ? faker.helpers.arrayElement(NEXT_ACTIONS) : null,
        nextActionAt: open && seller ? dateOnly(shift(today, faker.number.int({ min: -10, max: 14 }))) : null,
        updatedAt: new Date(at),
        interactions: { create: interactions },
      },
    })
  }

  await prisma.leadSequence.createMany({ data: [...seq].map(([year, last]) => ({ year, last })) })
  console.info(`Seed listo: ${users.length} usuarios, ${lines.length} lineas, ${entries.length} leads.`)
  console.info(`Contrasena de todos los usuarios demo: ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
