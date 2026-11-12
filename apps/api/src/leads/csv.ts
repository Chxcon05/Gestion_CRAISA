import { CHANNEL_LABELS, STATUS_LABELS, type LeadListItem } from '@craisa/shared'

// Excel en configuracion regional es-CR usa coma decimal y por eso espera ';' como separador de lista.
const SEP = ';'
// Sin BOM, Excel abre el archivo como ANSI y rompe las tildes y la enie.
const BOM = '﻿'

export function csvCell(value: string | null | undefined): string {
  let v = value ?? ''
  // Neutraliza inyeccion de formulas: Excel ejecuta celdas que empiezan con = + - @ o tabulador.
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  if (/[";\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`
  return v
}

const ddmmyyyy = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')

type ExportRow = LeadListItem & { description: string }

const COLUMNS: [string, (l: ExportRow) => string | null][] = [
  ['Codigo', (l) => l.code],
  ['Fecha de ingreso', (l) => ddmmyyyy(l.entryDate)],
  ['Nombre', (l) => l.contactName],
  ['Empresa', (l) => l.company],
  ['Telefono', (l) => l.phone],
  ['Correo', (l) => l.email],
  ['Canal', (l) => CHANNEL_LABELS[l.channel]],
  ['Linea de negocio', (l) => l.businessLine.name],
  ['Producto', (l) => l.product?.name ?? ''],
  ['Descripcion', (l) => l.description],
  ['Estado', (l) => STATUS_LABELS[l.status]],
  ['Responsable', (l) => l.assignedTo?.name ?? ''],
  ['Proxima accion', (l) => l.nextAction],
  ['Fecha proxima accion', (l) => ddmmyyyy(l.nextActionAt)],
  ['Ultima actualizacion', (l) => ddmmyyyy(l.updatedAt)],
]

export function toCsv(rows: ExportRow[]): string {
  const lines = [COLUMNS.map(([h]) => h).join(SEP)]
  for (const r of rows) lines.push(COLUMNS.map(([, get]) => csvCell(get(r))).join(SEP))
  return BOM + lines.join('\r\n') + '\r\n'
}
