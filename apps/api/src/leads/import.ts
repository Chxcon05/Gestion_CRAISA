import ExcelJS from 'exceljs'
import { z } from 'zod'
import {
  CHANNELS,
  CHANNEL_LABELS,
  IMPORT_MAX_ROWS,
  leadBaseSchema,
  leadRules,
  type Channel,
  type ImportFile,
  type ImportPreview,
  type ImportResult,
  type ImportRowResult,
  type SessionUser,
} from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { HttpError } from '../lib/http.ts'
import { audit } from '../lib/audit.ts'
import { toDate, todayIso } from '../lib/dates.ts'
import { notify } from '../notifications/service.ts'
import { notifyAssignment } from '../notifications/whatsapp.ts'
import { phoneKey, refreshScore } from './insights.ts'

// Orden de captura del formulario, no alfabetico: es el orden en que se llenan las columnas.
export const IMPORT_COLUMNS = [
  'Nombre',
  'Empresa',
  'Telefono',
  'Correo',
  'Canal',
  'Fecha de ingreso',
  'Linea',
  'Producto',
  'Descripcion',
  'Responsable',
] as const

type Column = (typeof IMPORT_COLUMNS)[number]
type RawRow = Record<Column, string>

/** Sin tildes, minusculas y espacios simples: "AGRÍCOLA " y "agricola" son la misma linea. */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_\s]+/g, ' ')
    .trim()
    .toLowerCase()

const HEADER_KEYS = new Map(IMPORT_COLUMNS.map((c) => [norm(c), c]))

// Excel entrega numeros, fechas, hipervinculos, texto enriquecido o formulas segun como se escribio la celda.
function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('').trim()
    if ('text' in v) return cellText(v.text as ExcelJS.CellValue)
    if ('result' in v) return cellText(v.result as ExcelJS.CellValue)
    return ''
  }
  return String(v).trim()
}

/**
 * AAAA-MM-DD tal cual; dd/mm/aaaa (como se teclea en Costa Rica) se voltea. Null si la fecha no existe:
 * Date.parse acepta "2026-02-31" y la corre al 3 de marzo, asi que se exige que vuelva igual.
 */
function isoFrom(text: string) {
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text)
  const iso = dmy ? `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}` : text
  const d = new Date(`${iso}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null
}

async function readRows(file: ImportFile) {
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(Buffer.from(file.data, 'base64') as unknown as ArrayBuffer)
  } catch {
    throw new HttpError(400, 'VALIDATION', 'El archivo no es un Excel valido (.xlsx)')
  }
  const ws = wb.worksheets[0]
  if (!ws) throw new HttpError(400, 'VALIDATION', 'El archivo no tiene hojas')
  // Las columnas se ubican por su encabezado, asi no importa si alguien las reordena.
  const cols = new Map<number, Column>()
  ws.getRow(1).eachCell((cell, n) => {
    const key = HEADER_KEYS.get(norm(cellText(cell.value)))
    if (key) cols.set(n, key)
  })
  if (![...cols.values()].includes('Nombre')) {
    throw new HttpError(400, 'VALIDATION', 'Falta la columna Nombre: use la plantilla de importacion')
  }
  const rows: { raw: RawRow; row: number }[] = []
  for (let n = 2; n <= ws.rowCount; n++) {
    const raw = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, ''])) as RawRow
    const r = ws.getRow(n)
    for (const [i, key] of cols) raw[key] = cellText(r.getCell(i).value)
    if (Object.values(raw).every((v) => v === '')) continue
    rows.push({ raw, row: n })
    if (rows.length > IMPORT_MAX_ROWS) throw new HttpError(400, 'VALIDATION', `Maximo ${IMPORT_MAX_ROWS} filas por archivo`)
  }
  return rows
}

const importRowSchema = leadBaseSchema.extend({ assignedToId: z.string().optional() }).superRefine(leadRules)
type ImportRow = z.output<typeof importRowSchema>

async function loadCatalogs() {
  const [lines, users] = await Promise.all([
    prisma.businessLine.findMany({ where: { active: true }, include: { products: { where: { active: true } } } }),
    prisma.user.findMany({ where: { active: true }, select: { email: true, id: true } }),
  ])
  const channels = new Map<string, Channel>()
  for (const c of CHANNELS) {
    channels.set(norm(c), c)
    channels.set(norm(CHANNEL_LABELS[c]), c)
  }
  return {
    channels,
    lines: new Map(lines.map((l) => [norm(l.name), { id: l.id, products: new Map(l.products.map((p) => [norm(p.name), p.id])) }])),
    users: new Map(users.map((u) => [u.email.toLowerCase(), u.id])),
  }
}

type Catalogs = Awaited<ReturnType<typeof loadCatalogs>>

function validateRow(raw: RawRow, cat: Catalogs) {
  const errors: Record<string, string> = {}
  const channel = raw.Canal ? cat.channels.get(norm(raw.Canal)) : undefined
  const line = raw.Linea ? cat.lines.get(norm(raw.Linea)) : undefined
  const productId = line && raw.Producto ? line.products.get(norm(raw.Producto)) : undefined
  const assignedToId = raw.Responsable ? cat.users.get(raw.Responsable.toLowerCase()) : undefined
  const entryDate = raw['Fecha de ingreso'] ? isoFrom(raw['Fecha de ingreso']) : todayIso()
  const parsed = importRowSchema.safeParse({
    assignedToId,
    businessLineId: line?.id ?? '',
    channel: channel ?? raw.Canal,
    company: raw.Empresa,
    contactName: raw.Nombre,
    description: raw.Descripcion,
    email: raw.Correo,
    entryDate: entryDate ?? '',
    phone: raw.Telefono,
    productId,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'fila')
      errors[key] ??= issue.message
    }
  }
  // Mensajes propios cuando el valor existe pero no coincide con el catalogo, mas claros que "Seleccione".
  if (!entryDate) errors.entryDate = 'Fecha no valida, use dd/mm/aaaa'
  if (raw.Canal && !channel) errors.channel = `Canal "${raw.Canal}" no existe`
  if (raw.Linea && !line) errors.businessLineId = `Linea "${raw.Linea}" no existe o esta inactiva`
  if (line && raw.Producto && !productId) errors.productId = `Producto "${raw.Producto}" no existe en la linea`
  if (raw.Responsable && !assignedToId) errors.assignedToId = `No hay un usuario activo con el correo ${raw.Responsable}`
  return { data: parsed.success ? parsed.data : null, errors }
}

// Se cruza contra todos los leads, igual que el aviso del formulario: el punto es no duplicar clientes.
async function existingMatches(emails: string[], phones: string[]) {
  if (!emails.length && !phones.length) return []
  return prisma.$queryRaw<{ code: string; email: string | null; phone: string | null }[]>`
    SELECT code, lower(email) AS email, right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 8) AS phone
    FROM leads
    WHERE lower(email) = ANY(${emails}::text[])
       OR right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 8) = ANY(${phones}::text[])
    ORDER BY "createdAt" ASC`
}

async function analyze(file: ImportFile) {
  const [rows, cat] = await Promise.all([readRows(file), loadCatalogs()])
  const checked = rows.map(({ raw, row }) => ({ raw, row, ...validateRow(raw, cat) }))
  const keysOf = (raw: RawRow) => ({ email: raw.Correo.toLowerCase() || null, phone: phoneKey(raw.Telefono) })
  const keys = checked.map((c) => keysOf(c.raw))
  const db = await existingMatches(
    [...new Set(keys.flatMap((k) => (k.email ? [k.email] : [])))],
    [...new Set(keys.flatMap((k) => (k.phone ? [k.phone] : [])))],
  )
  const seen = new Map<string, number>()
  const results = checked.map((c, i): ImportRowResult & { data: ImportRow | null } => {
    const { email, phone } = keys[i]!
    const fromDb = db.filter((m) => (email && m.email === email) || (phone && m.phone === phone)).map((m) => m.code)
    const fromFile = [email && seen.get(`e:${email}`), phone && seen.get(`p:${phone}`)].filter((n): n is number => typeof n === 'number')
    if (email && !seen.has(`e:${email}`)) seen.set(`e:${email}`, c.row)
    if (phone && !seen.has(`p:${phone}`)) seen.set(`p:${phone}`, c.row)
    return {
      contactName: c.raw.Nombre,
      data: Object.keys(c.errors).length ? null : c.data,
      duplicates: [...new Set([...fromDb, ...fromFile.map((n) => `Fila ${n}`)])],
      errors: c.errors,
      row: c.row,
    }
  })
  return results
}

export async function previewImport(file: ImportFile): Promise<ImportPreview> {
  const results = await analyze(file)
  const rows = results.map(({ data: _data, ...r }) => r)
  const valid = results.filter((r) => r.data).length
  return { invalid: rows.length - valid, rows, valid }
}

export async function runImport(file: ImportFile, user: SessionUser): Promise<ImportResult> {
  const valid = (await analyze(file)).flatMap((r) => (r.data ? [r.data] : []))
  if (!valid.length) return { codes: [], created: 0 }
  const codes = await reserveCodes(valid.map((d) => d.entryDate))
  const created = await prisma.$transaction(
    async (tx) => {
      const out: { assignedToId: string | null; code: string; id: string }[] = []
      for (const [i, d] of valid.entries()) {
        const code = codes[i]!
        const status = d.assignedToId ? ('ASIGNADO' as const) : ('NUEVO' as const)
        const lead = await tx.lead.create({
          data: {
            assignedToId: d.assignedToId ?? null,
            businessLineId: d.businessLineId,
            channel: d.channel,
            code,
            company: d.company,
            contactName: d.contactName,
            createdById: user.id,
            description: d.description,
            email: d.email,
            entryDate: toDate(d.entryDate),
            interactions: {
              create: { content: `Importado desde ${file.fileName}`, toStatus: status, type: 'CREACION', userId: user.id },
            },
            phone: d.phone,
            productId: d.productId,
            status,
          },
        })
        await refreshScore(tx, lead.id)
        out.push({ assignedToId: d.assignedToId ?? null, code, id: lead.id })
      }
      // Un aviso por responsable, no uno por fila: 500 filas serian 500 avisos y una rafaga de WhatsApp.
      for (const [assignee, leads] of Map.groupBy(out.filter((c) => c.assignedToId), (c) => c.assignedToId!)) {
        await notify(tx, {
          actorId: user.id,
          leadId: leads[0]!.id,
          message: leads.length === 1 ? `${user.name} le asigno un lead importado` : `${user.name} le asigno ${leads.length} leads importados`,
          type: 'ASIGNACION',
          userId: assignee,
        })
      }
      return out
    },
    // Mil filas son mil inserciones con su bitacora: el limite de 5 s por defecto no alcanza.
    { timeout: 60_000 },
  )
  await audit(user.id, 'IMPORTACION', `${created.length === 1 ? '1 lead' : `${created.length} leads`} desde ${file.fileName}`)
  // El WhatsApp lleva los datos de un cliente: solo tiene sentido cuando al vendedor le toco uno.
  for (const leads of Map.groupBy(created.filter((c) => c.assignedToId), (c) => c.assignedToId!).values()) {
    if (leads.length === 1) void notifyAssignment(leads[0]!.id, user.id)
  }
  return { codes: created.map((c) => c.code), created: created.length }
}

/**
 * Reserva todos los codigos de una vez, en una transaccion corta. Si se pidieran fila por fila dentro de la
 * importacion, la fila de lead_sequences quedaria bloqueada hasta el final y las altas del formulario web
 * o de WhatsApp fallarian por tiempo mientras tanto.
 */
async function reserveCodes(entryDates: string[]) {
  const perYear = Map.groupBy(entryDates.map((d) => Number(d.slice(0, 4))), (y) => y)
  const next = new Map<number, number>()
  await prisma.$transaction(async (tx) => {
    for (const [year, list] of perYear) {
      const n = list.length
      const seq = await tx.leadSequence.upsert({ where: { year }, create: { year, last: n }, update: { last: { increment: n } } })
      next.set(year, seq.last - n + 1)
    }
  })
  return entryDates.map((d) => {
    const year = Number(d.slice(0, 4))
    const n = next.get(year)!
    next.set(year, n + 1)
    return `LEAD-${year}-${String(n).padStart(4, '0')}`
  })
}

/** Plantilla con encabezados fijos y listas desplegables tomadas de los catalogos activos. */
export async function buildTemplate(): Promise<Buffer> {
  const [lines, users] = await Promise.all([
    prisma.businessLine.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { name: true } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { email: 'asc' }, select: { email: true } }),
  ])
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = IMPORT_COLUMNS.map((header) => ({ header, width: header === 'Descripcion' ? 48 : 22 }))
  ws.getRow(1).font = { bold: true }

  // Las listas largas van en una hoja oculta: una lista escrita en la formula no puede pasar de 255 caracteres.
  const lists = wb.addWorksheet('Listas', { state: 'hidden' })
  const columns: [Column, string[]][] = [
    ['Canal', CHANNELS.map((c) => CHANNEL_LABELS[c])],
    ['Linea', lines.map((l) => l.name)],
    ['Responsable', users.map((u) => u.email)],
  ]
  columns.forEach(([title, values], i) => {
    const col = lists.getColumn(i + 1)
    col.values = [title, ...values]
    if (!values.length) return
    const target = ws.getColumn(IMPORT_COLUMNS.indexOf(title) + 1).letter
    for (let r = 2; r <= IMPORT_MAX_ROWS + 1; r++) {
      ws.getCell(`${target}${r}`).dataValidation = {
        allowBlank: true,
        formulae: [`Listas!$${col.letter}$2:$${col.letter}$${values.length + 1}`],
        type: 'list',
      }
    }
  })

  const help = wb.addWorksheet('Instrucciones')
  help.columns = [{ width: 22 }, { width: 80 }]
  help.addRows([
    ['Columna', 'Como llenarla'],
    ['Nombre', 'Obligatorio. Nombre del contacto.'],
    ['Empresa', 'Opcional.'],
    ['Telefono', 'Telefono o correo, al menos uno.'],
    ['Correo', 'Telefono o correo, al menos uno.'],
    ['Canal', 'Obligatorio. Elija de la lista.'],
    ['Fecha de ingreso', 'Opcional, dd/mm/aaaa. Vacia es hoy.'],
    ['Linea', 'Obligatoria. Elija de la lista.'],
    ['Producto', 'Opcional. Debe pertenecer a la linea.'],
    ['Descripcion', 'Obligatoria. Que consulto el cliente (minimo 5 caracteres).'],
    ['Responsable', 'Opcional. Correo del vendedor; vacio queda sin asignar.'],
  ])
  help.getRow(1).font = { bold: true }
  return Buffer.from(await wb.xlsx.writeBuffer())
}
