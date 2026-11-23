import type { Prisma } from '@prisma/client'
import { CLOSED_STATUSES, type LeadFilters, type SessionUser } from '@craisa/shared'
import { addDays, toDate, todayIso } from '../lib/dates.ts'
import { scopeWhere } from './permissions.ts'

// Lo usan el listado y la exportacion, para que el CSV contenga exactamente lo que se ve filtrado.
export function buildWhere(f: LeadFilters, user: SessionUser): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [scopeWhere(user)]
  if (f.q) {
    const contains = { contains: f.q, mode: 'insensitive' as const }
    and.push({
      OR: [{ contactName: contains }, { company: contains }, { code: contains }, { email: contains }, { phone: contains }],
    })
  }
  if (f.status.length) and.push({ status: { in: f.status } })
  if (f.channel.length) and.push({ channel: { in: f.channel } })
  if (f.businessLineId.length) and.push({ businessLineId: { in: f.businessLineId } })
  if (f.assignedToId) and.push({ assignedToId: f.assignedToId === 'none' ? null : f.assignedToId })
  if (f.from || f.to) {
    and.push({ entryDate: { ...(f.from && { gte: toDate(f.from) }), ...(f.to && { lte: toDate(f.to) }) } })
  }
  if (f.overdue) {
    and.push({ nextActionAt: { lt: toDate(todayIso()) }, status: { notIn: [...CLOSED_STATUSES] } })
  }
  if (f.due) {
    const today = todayIso()
    const nextActionAt = f.due === 'today' ? toDate(today) : { gt: toDate(today), lte: toDate(addDays(today, 7)) }
    and.push({ nextActionAt, status: { notIn: [...CLOSED_STATUSES] } })
  }
  return { AND: and }
}

export function buildOrderBy(f: LeadFilters): Prisma.LeadOrderByWithRelationInput[] {
  const primary: Prisma.LeadOrderByWithRelationInput =
    f.sort === 'nextActionAt' || f.sort === 'score' ? { [f.sort]: { sort: f.dir, nulls: 'last' } } : { [f.sort]: f.dir }
  // El codigo desempata: sin el, la paginacion puede repetir u omitir filas con la misma fecha.
  return [primary, { code: 'desc' }]
}
