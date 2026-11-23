import { Router, type Request } from 'express'
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  duplicatesQuerySchema,
  leadCreateSchema, leadFiltersSchema, leadUpdateSchema,
  noteSchema,
  statusChangeSchema,
  type LeadFilters,
} from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { param, parse } from '../lib/http.ts'
import { audit } from '../lib/audit.ts'
import { todayIso } from '../lib/dates.ts'
import { currentUser } from '../auth/session.ts'
import { buildOrderBy, buildWhere } from './query.ts'
import { listInclude, toListItem } from './serialize.ts'
import { toCsv } from './csv.ts'
import { toXlsx } from './xlsx.ts'
import { findDuplicates } from './insights.ts'
import * as leads from './service.ts'

export const leadsRouter = Router()

const EXPORT_LIMIT = 10_000

leadsRouter.get('/', async (req, res) => {
  res.json(await leads.listLeads(parse(leadFiltersSchema, req.query), currentUser(req)))
})

// El CSV y el Excel salen de la misma consulta: ambos traen exactamente lo que se ve filtrado.
async function exportRows(req: Request) {
  const user = currentUser(req)
  const f = parse(leadFiltersSchema, req.query)
  const rows = await prisma.lead.findMany({
    where: buildWhere(f, user),
    include: listInclude,
    orderBy: buildOrderBy(f),
    take: EXPORT_LIMIT,
  })
  return { user, f, rows: rows.map((r) => ({ ...toListItem(r), description: r.description })) }
}

/** Filtros en palabras para el encabezado del Excel; los ids de linea y responsable se traducen a nombres. */
async function describeFilters(f: LeadFilters) {
  const [lines, assignee] = await Promise.all([
    f.businessLineId.length ? prisma.businessLine.findMany({ where: { id: { in: f.businessLineId } }, orderBy: { name: 'asc' } }) : [],
    f.assignedToId && f.assignedToId !== 'none' ? prisma.user.findUnique({ where: { id: f.assignedToId } }) : null,
  ])
  const ddmm = (iso: string) => iso.split('-').reverse().join('/')
  const out: string[] = []
  if (f.q) out.push(`Busqueda: "${f.q}"`)
  if (f.status.length) out.push(`Estado: ${f.status.map((s) => STATUS_LABELS[s]).join(', ')}`)
  if (f.channel.length) out.push(`Canal: ${f.channel.map((c) => CHANNEL_LABELS[c]).join(', ')}`)
  if (lines.length) out.push(`Linea: ${lines.map((l) => l.name).join(', ')}`)
  if (f.assignedToId) out.push(`Responsable: ${f.assignedToId === 'none' ? 'Sin asignar' : (assignee?.name ?? '-')}`)
  if (f.from || f.to) out.push(`Ingreso: ${f.from ? ddmm(f.from) : 'inicio'} a ${f.to ? ddmm(f.to) : 'hoy'}`)
  if (f.overdue) out.push('Solo acciones vencidas')
  if (f.due) out.push(f.due === 'today' ? 'Acciones para hoy' : 'Acciones de los proximos 7 dias')
  return out
}

// Van antes de '/:code' para que "export.csv", "export.xlsx" o "duplicates" no se tomen como codigo de lead.
leadsRouter.get('/export.csv', async (req, res) => {
  const { user, rows } = await exportRows(req)
  await audit(user.id, 'EXPORTACION_CSV', `${rows.length} registros; filtros ${JSON.stringify(req.query)}`)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="leads-craisa-${todayIso()}.csv"`)
  res.send(toCsv(rows))
})

leadsRouter.get('/export.xlsx', async (req, res) => {
  const { user, f, rows } = await exportRows(req)
  const file = await toXlsx(rows, {
    filters: await describeFilters(f),
    generatedAt: new Date(),
    generatedBy: user.name,
    today: todayIso(),
  })
  await audit(user.id, 'EXPORTACION_EXCEL', `${rows.length} registros; filtros ${JSON.stringify(req.query)}`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="leads-craisa-${todayIso()}.xlsx"`)
  res.send(file)
})

leadsRouter.get('/duplicates', async (req, res) => {
  res.json(await findDuplicates(parse(duplicatesQuerySchema, req.query), currentUser(req)))
})

leadsRouter.post('/', async (req, res) => {
  res.status(201).json(await leads.createLead(parse(leadCreateSchema, req.body), currentUser(req)))
})

leadsRouter.get('/:code', async (req, res) => {
  res.json(await leads.getLead(param(req, 'code'), currentUser(req)))
})

leadsRouter.patch('/:code', async (req, res) => {
  res.json(await leads.updateLead(param(req, 'code'), parse(leadUpdateSchema, req.body), currentUser(req)))
})

leadsRouter.post('/:code/status', async (req, res) => {
  res.json(await leads.changeStatus(param(req, 'code'), parse(statusChangeSchema, req.body), currentUser(req)))
})

leadsRouter.post('/:code/notes', async (req, res) => {
  const { content } = parse(noteSchema, req.body)
  res.status(201).json(await leads.addNote(param(req, 'code'), content, currentUser(req)))
})

leadsRouter.delete('/:code', async (req, res) => {
  await leads.deleteLead(param(req, 'code'), currentUser(req))
  res.status(204).end()
})
