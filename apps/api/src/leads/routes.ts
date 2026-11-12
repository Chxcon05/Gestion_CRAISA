import { Router } from 'express'
import { leadCreateSchema, leadFiltersSchema, leadUpdateSchema, noteSchema, statusChangeSchema } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { param, parse } from '../lib/http.ts'
import { audit } from '../lib/audit.ts'
import { todayIso } from '../lib/dates.ts'
import { currentUser } from '../auth/session.ts'
import { buildOrderBy, buildWhere } from './query.ts'
import { listInclude, toListItem } from './serialize.ts'
import { toCsv } from './csv.ts'
import * as leads from './service.ts'

export const leadsRouter = Router()

const EXPORT_LIMIT = 10_000

leadsRouter.get('/', async (req, res) => {
  res.json(await leads.listLeads(parse(leadFiltersSchema, req.query), currentUser(req)))
})

// Va antes de '/:code' para que "export.csv" no se tome como codigo de lead.
leadsRouter.get('/export.csv', async (req, res) => {
  const user = currentUser(req)
  const f = parse(leadFiltersSchema, req.query)
  const rows = await prisma.lead.findMany({
    where: buildWhere(f, user),
    include: listInclude,
    orderBy: buildOrderBy(f),
    take: EXPORT_LIMIT,
  })
  const csv = toCsv(rows.map((r) => ({ ...toListItem(r), description: r.description })))
  await audit(user.id, 'EXPORTACION_CSV', `${rows.length} registros; filtros ${JSON.stringify(req.query)}`)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="leads-craisa-${todayIso()}.csv"`)
  res.send(csv)
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
