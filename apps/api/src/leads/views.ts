import type { Prisma } from '@prisma/client'
import {
  CLOSED_STATUSES,
  LEAD_STATUSES,
  type BoardResponse,
  type CalendarQuery,
  type LeadListItem,
  type LeadStatus,
  type SessionUser,
  type ViewFilters,
} from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { toDate, todayIso } from '../lib/dates.ts'
import { buildWhere } from './query.ts'
import { listInclude, toListItem } from './serialize.ts'

// buildWhere pide los campos de orden y paginacion del listado; aqui no se usan.
const whereFor = (f: ViewFilters, user: SessionUser) =>
  buildWhere({ ...f, dir: 'desc', page: 1, pageSize: 20, sort: 'entryDate', status: [] }, user)

export const BOARD_LIMIT = 50

/** Por estado, el total y las primeras tarjetas; la columna enlaza a la tabla para ver el resto. */
export async function boardLeads(f: ViewFilters, user: SessionUser): Promise<BoardResponse> {
  const base = whereFor(f, user)
  // Abiertos por prioridad, que es lo que se atiende primero; cerrados por lo mas reciente.
  const orderFor = (s: LeadStatus): Prisma.LeadOrderByWithRelationInput[] =>
    CLOSED_STATUSES.includes(s) ? [{ updatedAt: 'desc' }, { code: 'desc' }] : [{ score: { sort: 'desc', nulls: 'last' } }, { code: 'desc' }]
  const whereOf = (status: LeadStatus) => ({ AND: [base, { status }] })
  const [totals, rows] = await Promise.all([
    prisma.$transaction(LEAD_STATUSES.map((s) => prisma.lead.count({ where: whereOf(s) }))),
    prisma.$transaction(
      LEAD_STATUSES.map((s) => prisma.lead.findMany({ where: whereOf(s), include: listInclude, orderBy: orderFor(s), take: BOARD_LIMIT })),
    ),
  ])
  return {
    columns: LEAD_STATUSES.map((status, i) => ({ items: rows[i]!.map(toListItem), status, total: totals[i]! })),
  }
}

/** Acciones de leads abiertos en el mes; si el mes contiene hoy, tambien las vencidas, que se dibujan en hoy. */
export async function calendarLeads(q: CalendarQuery, user: SessionUser): Promise<LeadListItem[]> {
  const [year, month] = q.month.split('-').map(Number) as [number, number]
  const start = `${q.month}-01`
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  const today = todayIso()
  const containsToday = today >= start && today < next
  const range: Prisma.LeadWhereInput = {
    nextActionAt: { gte: toDate(containsToday ? '1900-01-01' : start), lt: toDate(next) },
  }
  const rows = await prisma.lead.findMany({
    where: { AND: [whereFor(q, user), range, { status: { notIn: [...CLOSED_STATUSES] } }] },
    include: listInclude,
    orderBy: [{ nextActionAt: 'asc' }, { score: { sort: 'desc', nulls: 'last' } }, { code: 'asc' }],
  })
  return rows.map(toListItem)
}
