import ExcelJS from 'exceljs'
import { CHANNEL_LABELS, CLOSED_STATUSES, STATUS_LABELS, type LeadListItem, type LeadStatus } from '@craisa/shared'

type ExportRow = LeadListItem & { description: string }
type Value = string | Date | null

// Colores de la interfaz (marca y etiquetas de estado) en ARGB, que es lo que pide Excel.
const BRAND = 'FF1C4C94'
const BORDER = 'FFE2E8F0'
const TEXT = 'FF1E293B'
const MUTED = 'FF64748B'
const STATUS_TONES: Record<LeadStatus, { fill: string; font: string }> = {
  NUEVO: { fill: 'FFF0F9FF', font: 'FF0369A1' },
  ASIGNADO: { fill: 'FFEEF2FF', font: 'FF4338CA' },
  CONTACTADO: { fill: 'FFF5F3FF', font: 'FF6D28D9' },
  EN_SEGUIMIENTO: { fill: 'FFFFFBEB', font: 'FF92400E' },
  OPORTUNIDAD: { fill: 'FFFFF7ED', font: 'FF9A3412' },
  GANADO: { fill: 'FFECFDF5', font: 'FF047857' },
  PERDIDO: { fill: 'FFF1F5F9', font: 'FF475569' },
}

// Las fechas sin hora viajan como AAAA-MM-DD; a medianoche UTC Excel muestra el mismo dia.
const day = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`) : null)
// Excel no maneja zonas horarias: se corre la hora a Costa Rica (UTC-6, sin horario de verano).
const crTime = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000)

const COLUMNS: { header: string; width: number; get: (l: ExportRow) => Value; format?: string; wrap?: boolean }[] = [
  { header: 'Codigo', width: 16, get: (l) => l.code },
  { header: 'Fecha de ingreso', width: 13, get: (l) => day(l.entryDate), format: 'dd/mm/yyyy' },
  { header: 'Nombre', width: 26, get: (l) => l.contactName },
  { header: 'Empresa', width: 26, get: (l) => l.company },
  { header: 'Telefono', width: 13, get: (l) => l.phone },
  { header: 'Correo', width: 28, get: (l) => l.email },
  { header: 'Canal', width: 16, get: (l) => CHANNEL_LABELS[l.channel] },
  { header: 'Linea de negocio', width: 16, get: (l) => l.businessLine.name },
  { header: 'Producto', width: 22, get: (l) => l.product?.name ?? null },
  { header: 'Descripcion', width: 50, get: (l) => l.description, wrap: true },
  { header: 'Estado', width: 20, get: (l) => STATUS_LABELS[l.status] },
  { header: 'Responsable', width: 18, get: (l) => l.assignedTo?.name ?? null },
  { header: 'Proxima accion', width: 30, get: (l) => l.nextAction, wrap: true },
  { header: 'Fecha proxima accion', width: 13, get: (l) => day(l.nextActionAt), format: 'dd/mm/yyyy' },
  { header: 'Ultima actualizacion', width: 17, get: (l) => crTime(l.updatedAt), format: 'dd/mm/yyyy hh:mm' },
]
const STATUS_COL = COLUMNS.findIndex((c) => c.header === 'Estado') + 1
const NEXT_DATE_COL = COLUMNS.findIndex((c) => c.header === 'Fecha proxima accion') + 1
export const XLSX_HEADER_ROW = 4

export interface XlsxMeta {
  filters: string[]
  generatedAt: Date
  generatedBy: string
  today: string
}

const font = (extra: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: 'Calibri', size: 10, color: { argb: TEXT }, ...extra })
const solid = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

export async function toXlsx(rows: ExportRow[], meta: XlsxMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CRAISA Leads'
  wb.created = meta.generatedAt
  // Codigo y encabezados quedan fijos al desplazarse; sin cuadricula se lee como un reporte, no como una hoja en blanco.
  const ws = wb.addWorksheet('Leads', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: XLSX_HEADER_ROW, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  })
  ws.columns = COLUMNS.map((c) => ({ width: c.width }))

  // Encabezado del reporte: quien lo saco, cuando y con que filtros, para que el archivo se explique solo.
  ws.mergeCells(1, 1, 1, 6)
  ws.getCell(1, 1).value = 'Leads comerciales CRAISA'
  ws.getCell(1, 1).font = font({ size: 16, bold: true, color: { argb: BRAND } })
  ws.getRow(1).height = 28
  const stamp = new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(
    meta.generatedAt,
  )
  const count = `${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}`
  const filters = meta.filters.length ? meta.filters.join(' · ') : 'Sin filtros'
  ws.mergeCells(2, 1, 2, COLUMNS.length)
  ws.getCell(2, 1).value = `${count}   |   ${filters}   |   Generado el ${stamp} por ${meta.generatedBy}`
  ws.getCell(2, 1).font = font({ color: { argb: MUTED } })
  ws.getRow(3).height = 8

  const header = ws.getRow(XLSX_HEADER_ROW)
  header.values = COLUMNS.map((c) => c.header)
  header.height = 30
  header.eachCell((cell) => {
    cell.font = font({ bold: true, color: { argb: 'FFFFFFFF' } })
    cell.fill = solid(BRAND)
    cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
  })

  rows.forEach((r, i) => {
    const row = ws.getRow(XLSX_HEADER_ROW + 1 + i)
    row.values = COLUMNS.map((c) => c.get(r))
    COLUMNS.forEach((c, k) => {
      const cell = row.getCell(k + 1)
      cell.font = font()
      cell.alignment = { vertical: 'top', wrapText: c.wrap ?? false, indent: 1 }
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } }
      if (i % 2 === 1) cell.fill = solid('FFF8FAFC')
      if (c.format) cell.numFmt = c.format
    })
    row.getCell(1).font = font({ bold: true, color: { argb: BRAND } })

    const tone = STATUS_TONES[r.status]
    row.getCell(STATUS_COL).fill = solid(tone.fill)
    row.getCell(STATUS_COL).font = font({ bold: true, color: { argb: tone.font } })

    // Una accion vencida en un lead abierto se marca en rojo, igual que en la pantalla.
    const overdue = r.nextActionAt !== null && r.nextActionAt < meta.today && !CLOSED_STATUSES.includes(r.status)
    if (overdue) row.getCell(NEXT_DATE_COL).font = font({ bold: true, color: { argb: 'FFDC2626' } })
  })

  ws.autoFilter = {
    from: { row: XLSX_HEADER_ROW, column: 1 },
    to: { row: XLSX_HEADER_ROW + Math.max(rows.length, 1), column: COLUMNS.length },
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}
