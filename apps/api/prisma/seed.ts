// Datos ficticios para desarrollo y demo. El documento de alcance prohibe usar datos reales sin aprobacion de CRAISA.
import { PrismaClient, type Channel, type LeadStatus, type Prisma } from '@prisma/client'
import { hash } from 'bcryptjs'
import { CHANNEL_LABELS, STATUS_LABELS, scoreLead } from '@craisa/shared'

if (process.env.NODE_ENV === 'production') {
  console.error('El seed borra datos: no se ejecuta en produccion.')
  process.exit(1)
}

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'Craisa2026!'

const USERS = [
  { name: 'Admin CRAISA', email: 'admin@craisa.test', role: 'ADMIN' },
  { name: 'Carlos Mora', email: 'carlos.mora@craisa.test', role: 'VENDEDOR' },
  { name: 'Diego Vargas', email: 'diego.vargas@craisa.test', role: 'VENDEDOR' },
  { name: 'Laura Jimenez', email: 'laura.jimenez@craisa.test', role: 'VENDEDOR' },
] as const
type UserName = (typeof USERS)[number]['name']

// Secciones y equipos del sitio de CRAISA. Los nombres de linea son los del sitio sin tildes: la
// captura web los empareja por nombre, asi que un lead de "Maquinaria Agrícola" cae en su linea.
const LINES: Record<string, string[]> = {
  'Agricultura de Precision': [
    'Autoguiado de maquinaria',
    'Control de aplicaciones e insumos',
    'Drones y robotica agricola',
    'Herramientas geodesicas de posicionamiento',
    'Servicio tecnico, capacitacion y asesoria',
    'Software y agricultura digital',
  ],
  'Maquinaria Agricola': [
    'Carretas Palazoglu',
    'Cosechadora de cana Austoft 9000',
    'Cosechadora de cana Austoft 9900',
    'Implementos Mascar',
    'Implementos Ozduman',
    'Implementos SaMASZ',
    'Tractor Antonio Carraro SN 5800 V',
    'Tractor Antonio Carraro SRX 9800 CL',
    'Tractor Antonio Carraro TC 5800',
    'Tractor Antonio Carraro Tigre 3200',
    'Tractor Antonio Carraro Tigrecar 5800',
    'Tractor Antonio Carraro TN 5800',
    'Tractor CASE IH Farmall (55 a 90 HP)',
    'Tractor CASE IH Magnum (250 a 380 HP)',
    'Tractor CASE IH Maxxum (110 a 125 HP)',
    'Tractor CASE IH Puma (140 a 185 HP)',
    'Tractor CASE IH Quadtrac (470 a 620 HP)',
    'Tractor CASE IH Steiger (420 a 620 HP)',
  ],
  'Maquinaria de Construccion': [
    'Cargadoras frontales',
    'Excavadoras',
    'Mini excavadora',
    'Minicargadoras',
    'Montacargas todo terreno',
    'Motoniveladoras',
    'Retroexcavadoras',
    'Rodillo compactador',
    'Tractores de orugas',
  ],
  'Movimiento de Carga': [
    'Apilador de contenedores (Reach Stacker)',
    'Apiladores electricos',
    'Camion electrico de plataforma',
    'Manipuladores telescopicos',
    'Montacargas de combustion interna',
    'Montacargas electricos de ion-litio',
    'Plataforma elevadora de brazo articulado',
    'Plataforma elevadora de tijera',
    'Tractor de arrastre',
    'Tractor electrico de arrastre (mula)',
    'Transpaletas manuales e hidraulicas',
  ],
  'Repuestos y Servicios': [
    'Capacitaciones',
    'Diagnosticos',
    'Mantenimiento',
    'Repuestos',
    'Respuesta en campo',
    'Servicio personalizado',
    'Soporte remoto',
  ],
}

interface SeedLead {
  /** Entro solo por el sitio o WhatsApp: queda asignado al admin, sin bitacora de embudo. */
  auto?: boolean
  channel: Channel
  company: string | null
  contactName: string
  /** Dias antes de hoy en que entro la consulta. */
  daysAgo: number
  description: string
  email: string | null
  line: string
  lossReason?: string
  /** Proxima accion y en cuantos dias vence; nunca en el pasado, para que la demo no arranque con vencidas. */
  next?: [string, number]
  notes?: string[]
  owner: UserName | null
  phone: string | null
  product: string | null
  status: LeadStatus
}

// Fechas relativas a hoy: el seed se ve igual de vigente se corra cuando se corra.
const LEADS: SeedLead[] = [
  { contactName: 'Adrián Quesada Mora', company: 'Finca La Esperanza', phone: '8814-2290', email: 'aquesada@ejemplo.cr', channel: 'WHATSAPP', line: 'Maquinaria Agricola', product: 'Tractor CASE IH Farmall (55 a 90 HP)', description: 'Necesita un tractor 75 HP para preparar 35 hectareas de cana. Pregunta por financiamiento a 36 meses.', status: 'OPORTUNIDAD', owner: 'Carlos Mora', next: ['Enviar cotizacion con financiamiento', 1], daysAgo: 12, notes: ['Visita a la finca: terreno con pendiente, recomienda doble traccion', 'Pidio cotizacion con plan a 36 meses'] },
  { contactName: 'Mónica Arias Solano', company: 'Cafetalera Altos de Naranjo', phone: '8702-1148', email: 'marias@ejemplo.cr', channel: 'FERIA', line: 'Maquinaria Agricola', product: 'Implementos Ozduman', description: 'Conocio los implementos en la feria agricola. Busca rastra y arado para renovar 12 hectareas de cafe.', status: 'EN_SEGUIMIENTO', owner: 'Laura Jimenez', next: ['Demostracion en la finca', 4], daysAgo: 9, notes: ['Se envio catalogo de rastras', 'Confirma interes, quiere verlas funcionando'] },
  { contactName: 'Rolando Chaves Brenes', company: 'Hacienda El Roble', phone: '8890-3321', email: null, channel: 'LLAMADA', line: 'Maquinaria Agricola', product: 'Cosechadora de cana Austoft 9000', description: 'Consulta por cosechadora de cana para la zafra de marzo. Compara con un equipo usado.', status: 'CONTACTADO', owner: 'Diego Vargas', next: ['Enviar ficha tecnica y comparativo', 2], daysAgo: 5, notes: ['Llamada inicial: decide antes de enero'] },
  { contactName: 'Yesenia Rojas Campos', company: null, phone: '6012-7745', email: 'yrojas@ejemplo.cr', channel: 'SITIO_WEB', line: 'Repuestos y Servicios', product: 'Repuestos', description: 'Requiere filtros y kit de embrague para tractor. Pide precio y disponibilidad.', status: 'NUEVO', owner: null, next: ['Asignar a vendedor de repuestos', 0], daysAgo: 1, auto: true },
  { contactName: 'Esteban Vindas Ulate', company: 'Agroindustrial Monte Verde', phone: '8455-6612', email: 'evindas@ejemplo.cr', channel: 'VISITA_COMERCIAL', line: 'Maquinaria Agricola', product: 'Tractor CASE IH Maxxum (110 a 125 HP)', description: 'Flota de 3 tractores con mas de 10 anos. Evalua renovar dos unidades en el primer trimestre.', status: 'OPORTUNIDAD', owner: 'Carlos Mora', next: ['Reunion con gerencia para propuesta', 6], daysAgo: 20, notes: ['Recorrido por la flota actual', 'Solicita propuesta por dos unidades con recibo de usados'] },
  { contactName: 'Carolina Méndez Pérez', company: 'Constructora Valle Central', phone: '8333-9087', email: 'cmendez@ejemplo.cr', channel: 'CORREO', line: 'Maquinaria de Construccion', product: 'Excavadoras', description: 'Licito un movimiento de tierras en Alajuela. Necesita excavadora de 20 toneladas desde enero.', status: 'OPORTUNIDAD', owner: 'Diego Vargas', next: ['Presentar oferta formal', 2], daysAgo: 15, notes: ['Envio pliego de la obra', 'Prefiere compra con mantenimiento incluido'] },
  { contactName: 'Luis Diego Fallas Ortiz', company: 'Fallas y Asociados', phone: '8761-4430', email: 'ldfallas@ejemplo.cr', channel: 'WHATSAPP', line: 'Maquinaria de Construccion', product: 'Minicargadoras', description: 'Pregunta por minicargador para obras urbanas pequenas y si hay alquiler con opcion de compra.', status: 'CONTACTADO', owner: 'Laura Jimenez', next: ['Llamar para explicar opciones de alquiler', 1], daysAgo: 4, notes: ['Respondio por WhatsApp, prefiere llamada en la tarde'] },
  { contactName: 'Gabriela Soto Navarro', company: 'Desarrollos Sotonav', phone: '7012-5566', email: 'gsoto@ejemplo.cr', channel: 'INSTAGRAM', line: 'Maquinaria de Construccion', product: 'Retroexcavadoras', description: 'Vio la publicacion de la retroexcavadora. Construye un condominio en Heredia y necesita el equipo por 8 meses.', status: 'EN_SEGUIMIENTO', owner: 'Carlos Mora', next: ['Enviar cotizacion de compra y de alquiler', 3], daysAgo: 8, notes: ['Llamada: la obra inicia en febrero'] },
  { contactName: 'Marco Vega Jiménez', company: null, phone: '8999-0021', email: null, channel: 'FACEBOOK', line: 'Maquinaria de Construccion', product: 'Rodillo compactador', description: 'Pide precio de compactador de rodillo para lastrar caminos de una finca.', status: 'ASIGNADO', owner: 'Diego Vargas', next: ['Primer contacto telefonico', 0], daysAgo: 2 },
  { contactName: 'Andrea Castro Leiva', company: 'Obras Civiles del Pacifico', phone: '8640-1209', email: 'acastro@ejemplo.cr', channel: 'SITIO_WEB', line: 'Maquinaria de Construccion', product: 'Excavadoras', description: 'Solicita visita tecnica para dimensionar una excavadora para una cantera.', status: 'NUEVO', owner: null, next: ['Asignar y agendar visita tecnica', 1], daysAgo: 0, auto: true },
  { contactName: 'Ricardo Alfaro Segura', company: 'Distribuidora Alfaro', phone: '8222-3456', email: 'ralfaro@ejemplo.cr', channel: 'LLAMADA', line: 'Movimiento de Carga', product: 'Montacargas electricos de ion-litio', description: 'Bodega de 2000 m2 en Cartago. Necesita montacargas electrico para trabajar bajo techo sin emisiones.', status: 'OPORTUNIDAD', owner: 'Laura Jimenez', next: ['Prueba del equipo en la bodega', 5], daysAgo: 18, notes: ['Visita a la bodega: pasillos de 3 m', 'Recomendado modelo de 2.5 t con mastil triple'] },
  { contactName: 'Paola Herrera Lobo', company: 'Transportes Herrera', phone: '8577-8812', email: 'pherrera@ejemplo.cr', channel: 'CORREO', line: 'Movimiento de Carga', product: 'Montacargas de combustion interna', description: 'Patio de contenedores. Pide dos montacargas diesel de 5 toneladas y contrato de mantenimiento.', status: 'EN_SEGUIMIENTO', owner: 'Carlos Mora', next: ['Enviar propuesta con mantenimiento', 2], daysAgo: 10, notes: ['Envio especificaciones del patio'] },
  { contactName: 'Jorge Salas Cordero', company: 'Abarrotes El Ahorro', phone: '6150-3340', email: null, channel: 'WHATSAPP', line: 'Movimiento de Carga', product: 'Apiladores electricos', description: 'Quiere un apilador electrico para el almacen; pregunta si hay entrega inmediata.', status: 'CONTACTADO', owner: 'Diego Vargas', next: ['Confirmar inventario y enviar precio', 0], daysAgo: 3, notes: ['Hay dos unidades en bodega'] },
  { contactName: 'Sofía Guzmán Rivera', company: 'Logistica Guzman', phone: '8301-7790', email: 'sguzman@ejemplo.cr', channel: 'SITIO_WEB', line: 'Movimiento de Carga', product: 'Montacargas electricos de ion-litio', description: 'Centro de distribucion nuevo en El Coyol, necesita 4 montacargas electricos.', status: 'NUEVO', owner: null, next: ['Asignar a vendedor de carga', 0], daysAgo: 0, auto: true },
  { contactName: 'Ana Lucía Porras Vargas', company: 'Municipalidad de San Ramon', phone: '2445-1100', email: 'aporras@ejemplo.cr', channel: 'CORREO', line: 'Maquinaria de Construccion', product: 'Retroexcavadoras', description: 'Proveeduria municipal consulta precios de referencia de retroexcavadoras para el plantel.', status: 'EN_SEGUIMIENTO', owner: 'Laura Jimenez', next: ['Enviar precios de referencia', 7], daysAgo: 14, notes: ['Reunion con proveeduria: el cartel saldria en enero'] },
  { contactName: 'Fernando Ugalde Mata', company: 'Municipalidad de Poas', phone: '2448-5200', email: 'fugalde@ejemplo.cr', channel: 'VISITA_COMERCIAL', line: 'Maquinaria de Construccion', product: 'Motoniveladoras', description: 'Requiere motoniveladora para mantenimiento de caminos cantonales.', status: 'OPORTUNIDAD', owner: 'Diego Vargas', next: ['Entregar fichas tecnicas para el cartel', 9], daysAgo: 25, notes: ['Visita al plantel municipal', 'Pidio fichas tecnicas para redactar el cartel'] },
  { contactName: 'Daniela Montero Rojas', company: 'Finca Los Laureles', phone: '8712-6655', email: 'dmontero@ejemplo.cr', channel: 'LLAMADA', line: 'Repuestos y Servicios', product: 'Mantenimiento', description: 'Tractor comprado hace 2 anos sin mantenimiento formal. Quiere un plan anual.', status: 'CONTACTADO', owner: 'Carlos Mora', next: ['Enviar plan de mantenimiento anual', 1], daysAgo: 3, notes: ['Equipo con 1800 horas'] },
  { contactName: 'Kevin Brenes Araya', company: 'Constructora Brenes', phone: '8460-2231', email: 'kbrenes@ejemplo.cr', channel: 'WHATSAPP', line: 'Repuestos y Servicios', product: 'Diagnosticos', description: 'Reporta fuga hidraulica en excavadora de 8 meses. Consulta cobertura de garantia.', status: 'EN_SEGUIMIENTO', owner: 'Laura Jimenez', next: ['Coordinar visita del tecnico', 0], daysAgo: 2, notes: ['Envio fotos de la fuga; taller confirma que aplica garantia'] },
  { contactName: 'Marta Céspedes Ruiz', company: 'Ingenio Santa Clara', phone: '8890-4410', email: 'mcespedes@ejemplo.cr', channel: 'CORREO', line: 'Repuestos y Servicios', product: 'Capacitaciones', description: 'Solicita capacitacion para 10 operadores de tractor antes de la zafra.', status: 'OPORTUNIDAD', owner: 'Diego Vargas', next: ['Confirmar fechas de la capacitacion', 4], daysAgo: 11, notes: ['Se envio propuesta de dos jornadas'] },
  { contactName: 'Óscar Zamora Picado', company: null, phone: '8123-0098', email: null, channel: 'FACEBOOK', line: 'Repuestos y Servicios', product: 'Repuestos', description: 'Pregunta por llantas y bateria para minicargador.', status: 'ASIGNADO', owner: 'Carlos Mora', next: ['Llamar y confirmar modelo del equipo', 0], daysAgo: 1 },
  { contactName: 'Natalia Rodríguez Sáenz', company: 'Agricola Las Brisas', phone: '8530-7781', email: 'nrodriguez@ejemplo.cr', channel: 'FERIA', line: 'Agricultura de Precision', product: 'Drones y robotica agricola', description: 'Interes en dron de fumigacion para 60 hectareas de pina. Quiere ver una demostracion.', status: 'EN_SEGUIMIENTO', owner: 'Laura Jimenez', next: ['Demostracion de vuelo', 6], daysAgo: 13, notes: ['Se envio video de demostracion'] },
  { contactName: 'Mauricio Villalobos Gómez', company: 'Palmera del Sur', phone: '8678-1290', email: 'mvillalobos@ejemplo.cr', channel: 'CORREO', line: 'Agricultura de Precision', product: 'Autoguiado de maquinaria', description: 'Quiere instalar autoguiado en 4 tractores para reducir traslapes en la siembra.', status: 'OPORTUNIDAD', owner: 'Carlos Mora', next: ['Propuesta de instalacion en 4 tractores', 3], daysAgo: 16, notes: ['Inventario de tractores recibido', 'Son compatibles 3 de los 4'] },
  { contactName: 'Lucía Badilla Chacón', company: 'Bananera del Atlantico', phone: '8401-5542', email: 'lbadilla@ejemplo.cr', channel: 'SITIO_WEB', line: 'Agricultura de Precision', product: 'Software y agricultura digital', description: 'Quiere registrar horas de uso y labores de una flota de 15 tractores.', status: 'CONTACTADO', owner: 'Diego Vargas', next: ['Agendar videollamada de presentacion', 2], daysAgo: 6, notes: ['Respondio el primer correo'] },
  { contactName: 'Pablo Esquivel Murillo', company: 'Finca El Mirador', phone: '8299-6734', email: null, channel: 'WHATSAPP', line: 'Agricultura de Precision', product: 'Drones y robotica agricola', description: 'Pregunta el precio de un dron para cafe en ladera.', status: 'NUEVO', owner: null, next: ['Asignar a vendedor de precision', 1], daysAgo: 0, auto: true },
  { contactName: 'Silvia Acuña Fonseca', company: 'Viveros Acuna', phone: '8044-1873', email: 'sacuna@ejemplo.cr', channel: 'INSTAGRAM', line: 'Maquinaria Agricola', product: 'Implementos Ozduman', description: 'Busca encamadora para un vivero de 5 hectareas.', status: 'CONTACTADO', owner: 'Laura Jimenez', next: ['Enviar opciones de encamadora', 3], daysAgo: 5, notes: ['Pidio fotos del equipo'] },
  { contactName: 'Héctor Calderón Valverde', company: 'Calderon Construcciones', phone: '8355-2207', email: 'hcalderon@ejemplo.cr', channel: 'LLAMADA', line: 'Maquinaria de Construccion', product: 'Minicargadoras', description: 'Necesita dos minicargadores para una obra de 6 meses en Liberia.', status: 'EN_SEGUIMIENTO', owner: 'Diego Vargas', next: ['Llamar para cerrar condiciones', 1], daysAgo: 9, notes: ['Se envio cotizacion; negocia plazo de entrega'] },
  { contactName: 'Verónica Madrigal Paniagua', company: 'Exportadora Tropical', phone: '8722-0045', email: 'vmadrigal@ejemplo.cr', channel: 'VISITA_COMERCIAL', line: 'Movimiento de Carga', product: 'Montacargas electricos de ion-litio', description: 'Planta empacadora quiere reemplazar montacargas de gas por electricos.', status: 'OPORTUNIDAD', owner: 'Carlos Mora', next: ['Presentar propuesta con recibo de usados', 8], daysAgo: 22, notes: ['Visita a la planta', 'Tiene 3 unidades de gas para recibir'] },
  { contactName: 'Alonso Ramírez Bolaños', company: null, phone: '8610-3399', email: 'aramirez@ejemplo.cr', channel: 'OTRO', line: 'Repuestos y Servicios', product: 'Mantenimiento', description: 'Referido por otro cliente. Pide mantenimiento para retroexcavadora.', status: 'CONTACTADO', owner: 'Laura Jimenez', next: ['Agendar visita del taller movil', 5], daysAgo: 4 },
  // Sin responsable: son los "nuevos sin atender" del tablero, los que Mercadeo debe repartir.
  { contactName: 'Gerardo Arce Monge', company: 'Lecheria San Isidro', phone: '8650-2210', email: 'garce@ejemplo.cr', channel: 'FERIA', line: 'Maquinaria Agricola', product: 'Tractor CASE IH Farmall (55 a 90 HP)', description: 'Dejo sus datos en la feria. Quiere un tractor para picar pasto en una lecheria de 40 vacas.', status: 'NUEVO', owner: null, daysAgo: 1 },
  { contactName: 'Priscilla Vargas Elizondo', company: 'Bodegas del Norte', phone: '8477-3091', email: null, channel: 'WHATSAPP', line: 'Movimiento de Carga', product: 'Transpaletas manuales e hidraulicas', description: 'Pregunta por dos transpaletas para una bodega de abarrotes en San Carlos.', status: 'NUEVO', owner: null, daysAgo: 0 },
  { contactName: 'Manuel Chinchilla Rojas', company: null, phone: '8810-6677', email: 'mchinchilla@ejemplo.cr', channel: 'LLAMADA', line: 'Maquinaria de Construccion', product: 'Rodillo compactador', description: 'Llamo a la sucursal para pedir precio de un rodillo compactador.', status: 'NUEVO', owner: null, daysAgo: 2 },
  { contactName: 'Rebeca Salazar Mena', company: 'Agrocomercial Sarapiqui', phone: '8333-1450', email: 'rsalazar@ejemplo.cr', channel: 'CORREO', line: 'Agricultura de Precision', product: 'Software y agricultura digital', description: 'Escribio al correo general preguntando por software para registrar labores de 6 tractores.', status: 'NUEVO', owner: null, daysAgo: 1 },
  // Cerrados recientes, para que el tablero tenga resultados del mes.
  { contactName: 'Tatiana León Espinoza', company: 'Hacienda La Ponderosa', phone: '8566-4471', email: 'tleon@ejemplo.cr', channel: 'FERIA', line: 'Maquinaria Agricola', product: 'Tractor CASE IH Farmall (55 a 90 HP)', description: 'Compra de tractor Farmall de 75 HP con rastra para ganaderia.', status: 'GANADO', owner: 'Carlos Mora', daysAgo: 28, notes: ['Cotizacion aceptada', 'Firma de contrato y entrega programada'] },
  { contactName: 'Rodrigo Sanabria Quirós', company: 'Constructora Sanabria', phone: '8233-9905', email: 'rsanabria@ejemplo.cr', channel: 'CORREO', line: 'Maquinaria de Construccion', product: 'Retroexcavadoras', description: 'Compra de retroexcavadora para obra vial.', status: 'GANADO', owner: 'Diego Vargas', daysAgo: 26, notes: ['Aprobado el credito del cliente'] },
  { contactName: 'Eugenia Cordero Jara', company: 'Bodegas Cordero', phone: '8477-1180', email: 'ecordero@ejemplo.cr', channel: 'SITIO_WEB', line: 'Movimiento de Carga', product: 'Montacargas de combustion interna', description: 'Montacargas diesel para bodega de granos.', status: 'PERDIDO', owner: 'Laura Jimenez', daysAgo: 24, notes: ['Se envio cotizacion'], lossReason: 'Compro a la competencia' },
  { contactName: 'Javier Mora Castillo', company: null, phone: '8301-2234', email: null, channel: 'FACEBOOK', line: 'Agricultura de Precision', product: 'Autoguiado de maquinaria', description: 'Autoguiado para un tractor.', status: 'PERDIDO', owner: 'Carlos Mora', daysAgo: 21, lossReason: 'Fuera de presupuesto' },
  { contactName: 'Irene Valverde Solís', company: 'Ingenio Santa Clara', phone: '8890-4411', email: 'ivalverde@ejemplo.cr', channel: 'LLAMADA', line: 'Repuestos y Servicios', product: 'Repuestos', description: 'Pedido de repuestos para cosechadoras antes de la zafra.', status: 'GANADO', owner: 'Laura Jimenez', daysAgo: 19, notes: ['Pedido facturado'] },
]

const DAY = 86_400_000
const HOUR = 3_600_000
const FUNNEL: LeadStatus[] = ['ASIGNADO', 'CONTACTADO', 'EN_SEGUIMIENTO', 'OPORTUNIDAD']

function statusPath(final: LeadStatus): LeadStatus[] {
  if (final === 'NUEVO') return []
  if (final === 'GANADO') return [...FUNNEL, 'GANADO']
  if (final === 'PERDIDO') return ['ASIGNADO', 'CONTACTADO', 'PERDIDO']
  return FUNNEL.slice(0, FUNNEL.indexOf(final) + 1)
}

async function main() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
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
  const byName = new Map(users.map((u) => [u.name, u]))
  const admin = byName.get('Admin CRAISA')
  if (!admin) throw new Error('Falta el administrador en el seed')

  const lines = await Promise.all(
    Object.entries(LINES).map(([name, products]) =>
      prisma.businessLine.create({
        data: { name, products: { create: products.map((p) => ({ name: p })) } },
        include: { products: true },
      }),
    ),
  )

  const now = Date.now()
  const today = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(now)}T00:00:00.000Z`)
  const dayOffset = (n: number) => new Date(today.getTime() + n * DAY)
  // Del mas antiguo al mas reciente, para que los codigos sigan el orden de ingreso.
  const ordered = [...LEADS].sort((a, b) => b.daysAgo - a.daysAgo)
  // Corrido en enero, un lead de hace un mes cae en el anio anterior: cada anio lleva su propia numeracion.
  const seq = new Map<number, number>()

  for (const l of ordered) {
    const line = lines.find((x) => x.name === l.line)
    if (!line) throw new Error(`Linea desconocida: ${l.line}`)
    const owner = l.owner ? byName.get(l.owner) : undefined
    const entry = dayOffset(-l.daysAgo)
    const year = entry.getUTCFullYear()
    seq.set(year, (seq.get(year) ?? 0) + 1)
    // 9 a. m. de Costa Rica (15 h UTC), o un rato antes de ahora si entro hoy temprano.
    const start = Math.min(entry.getTime() + 15 * HOUR, Math.max(entry.getTime() + 6 * HOUR, now - HOUR / 2))
    const end = Math.max(start + HOUR / 6, now - HOUR / 6)

    // Cada paso del embudo a partir de Contactado lleva la siguiente nota; las que sobran van al final.
    const notes = l.notes ?? []
    const path = l.auto ? [] : statusPath(l.status)
    const events: ({ status: LeadStatus } | { note: string })[] = []
    path.forEach((status, k) => {
      events.push({ status })
      const note = k >= 1 ? notes[k - 1] : undefined
      if (note) events.push({ note })
    })
    for (const note of notes.slice(Math.max(path.length - 1, 0))) events.push({ note })
    const stamp = (k: number) => new Date(start + ((end - start) * (k + 1)) / (events.length + 1))

    const source = CHANNEL_LABELS[l.channel]
    const interactions: Prisma.InteractionCreateWithoutLeadInput[] = [
      {
        type: 'CREACION',
        toStatus: 'NUEVO',
        content: l.auto ? `Lead capturado automaticamente desde ${source}, pendiente de asignar` : 'Lead registrado',
        ...(!l.auto && { user: { connect: { id: admin.id } } }),
        createdAt: new Date(start),
      },
    ]
    let prev: LeadStatus = 'NUEVO'
    events.forEach((e, k) => {
      if ('note' in e) {
        interactions.push({ type: 'NOTA', content: e.note, user: { connect: { id: owner!.id } }, createdAt: stamp(k) })
        return
      }
      interactions.push({
        type: 'CAMBIO_ESTADO',
        fromStatus: prev,
        toStatus: e.status,
        content: e.status === 'PERDIDO' ? `Motivo: ${l.lossReason}` : `${STATUS_LABELS[prev]} a ${STATUS_LABELS[e.status]}`,
        user: { connect: { id: e.status === 'ASIGNADO' ? admin.id : owner!.id } },
        createdAt: stamp(k),
      })
      prev = e.status
    })
    const updatedAt = new Date(Math.max(...interactions.map((x) => new Date(x.createdAt!).getTime())))

    const productId = line.products.find((p) => p.name === l.product)?.id ?? null
    if (l.product && !productId) throw new Error(`Producto desconocido: ${l.product}`)
    const lead = await prisma.lead.create({
      data: {
        code: `LEAD-${year}-${String(seq.get(year)).padStart(4, '0')}`,
        entryDate: entry,
        contactName: l.contactName,
        company: l.company,
        phone: l.phone,
        email: l.email,
        channel: l.channel,
        businessLineId: line.id,
        productId,
        score: scoreLead({ ...l, productId }).score,
        description: l.description,
        status: l.status,
        assignedToId: owner?.id ?? null,
        createdById: l.auto ? null : admin.id,
        autoCaptured: l.auto ?? false,
        lossReason: l.lossReason ?? null,
        nextAction: l.next?.[0] ?? null,
        nextActionAt: l.next ? dayOffset(l.next[1]) : null,
        createdAt: new Date(start),
        updatedAt,
        interactions: { create: interactions },
      },
    })

    // Los de los ultimos 3 dias dejan su aviso sin leer, para mostrar la campana en la demo. Los automaticos
    // no tienen responsable: el aviso va al admin, que es quien los reparte.
    const recipient = l.auto ? admin : owner
    if (recipient && l.daysAgo <= 3 && l.status !== 'GANADO' && l.status !== 'PERDIDO') {
      await prisma.notification.create({
        data: l.auto
          ? { userId: admin.id, leadId: lead.id, type: 'LEAD_AUTOMATICO', message: `Lead nuevo desde ${source}`, createdAt: new Date(start) }
          : {
              userId: recipient.id,
              actorId: admin.id,
              leadId: lead.id,
              type: 'ASIGNACION',
              message: `${admin.name} le asigno un lead nuevo`,
              createdAt: new Date(interactions[1]?.createdAt ?? start),
            },
      })
    }
  }

  await prisma.leadSequence.createMany({ data: [...seq].map(([year, last]) => ({ year, last })) })
  console.info(`Seed listo: ${users.length} usuarios, ${lines.length} lineas, ${LEADS.length} leads.`)
  console.info(`Contrasena de todos los usuarios demo: ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
