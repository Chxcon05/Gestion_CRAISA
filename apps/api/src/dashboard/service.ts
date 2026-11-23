import type { Prisma } from '@prisma/client'
import {
  CHANNELS,
  CHANNEL_LABELS,
  CLOSED_STATUSES,
  LEAD_STATUSES,
  STATUS_LABELS,
  type DashboardData,
  type LeadStatus,
  type ResponseTimeRow,
  type SessionUser,
} from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { addDays, toDate, toIsoDate, todayIso } from '../lib/dates.ts'
import { scopeWhere } from '../leads/permissions.ts'

type Granularity = 'day' | 'week' | 'month'

const CONTACTED: LeadStatus[] = ['CONTACTADO', 'EN_SEGUIMIENTO', 'OPORTUNIDAD', 'GANADO', 'PERDIDO']
const HOUR = 3_600_000

interface Contacted {
  channel: (typeof CHANNELS)[number]
  hours: number
  seller: { id: string; name: string } | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

function averageBy(rows: Contacted[], keyOf: (r: Contacted) => [string, string] | null): ResponseTimeRow[] {
  const acc = new Map<string, { label: string; sum: number; n: number }>()
  for (const r of rows) {
    const k = keyOf(r)
    if (!k) continue
    const cur = acc.get(k[0]) ?? { label: k[1], sum: 0, n: 0 }
    cur.sum += r.hours
    cur.n += 1
    acc.set(k[0], cur)
  }
  return [...acc]
    .map(([key, v]) => ({ key, label: v.label, avgHours: round1(v.sum / v.n), contacted: v.n }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/**
 * Del registro del lead a su primer paso a Contactado o mas alla. Los que se registraron ya
 * contactados (una visita anotada despues) quedan fuera: medirian cero sin que nadie respondiera.
 */
async function responseTimes(where: Prisma.LeadWhereInput): Promise<DashboardData['response']> {
  const leads = await prisma.lead.findMany({
    where,
    select: {
      channel: true,
      createdAt: true,
      status: true,
      assignedTo: { select: { id: true, name: true } },
      interactions: {
        where: { toStatus: { in: CONTACTED } },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true, type: true },
      },
    },
  })
  const contacted: Contacted[] = []
  let pending = 0
  for (const l of leads) {
    const first = l.interactions[0]
    if (!first) {
      if (!CLOSED_STATUSES.includes(l.status)) pending += 1
      continue
    }
    if (first.type === 'CREACION') continue
    contacted.push({
      channel: l.channel,
      hours: Math.max(0, (first.createdAt.getTime() - l.createdAt.getTime()) / HOUR),
      seller: l.assignedTo,
    })
  }
  const total = contacted.reduce((n, r) => n + r.hours, 0)
  return {
    avgHours: contacted.length ? round1(total / contacted.length) : null,
    byChannel: averageBy(contacted, (r) => [r.channel, CHANNEL_LABELS[r.channel]]),
    bySeller: averageBy(contacted, (r) => (r.seller ? [r.seller.id, r.seller.name] : null)),
    contacted: contacted.length,
    pending,
    within24h: contacted.length ? Math.round((contacted.filter((r) => r.hours < 24).length / contacted.length) * 100) : 0,
  }
}

export function bucketOf(iso: string, g: Granularity): string {
  if (g === 'day') return iso
  if (g === 'month') return iso.slice(0, 7)
  // Semana ISO: se agrupa por el lunes que la inicia.
  const d = toDate(iso)
  const dow = (d.getUTCDay() + 6) % 7
  return addDays(iso, -dow)
}

export function buckets(from: string, to: string, g: Granularity): string[] {
  const out: string[] = []
  let cur = bucketOf(from, g)
  const last = bucketOf(to, g)
  while (cur <= last) {
    out.push(cur)
    if (g === 'day') cur = addDays(cur, 1)
    else if (g === 'week') cur = addDays(cur, 7)
    else {
      const [y, m] = cur.split('-').map(Number) as [number, number]
      cur = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    }
  }
  return out
}

export async function getDashboard(
  q: { from?: string; to?: string; granularity: Granularity },
  user: SessionUser,
): Promise<DashboardData> {
  const today = todayIso()
  const scope = scopeWhere(user)
  const to = q.to ?? today
  // Sin "desde" el tablero cubre todo el historial visible, igual que el listado de leads sin filtros.
  const first = q.from ? null : await prisma.lead.aggregate({ where: scope, _min: { entryDate: true } })
  const from = q.from ?? toIsoDate(first?._min.entryDate ?? null) ?? to
  const where: Prisma.LeadWhereInput = { ...scope, entryDate: { gte: toDate(from), lte: toDate(to) } }
  const openScope: Prisma.LeadWhereInput = { ...scope, status: { notIn: [...CLOSED_STATUSES] } }

  const [byStatusRaw, byChannelRaw, byLineRaw, lines, dates, overdue, dueToday, dueWeek, upcoming, response] = await Promise.all([
    prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['channel'], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['businessLineId'], where, _count: { _all: true } }),
    prisma.businessLine.findMany({ orderBy: { name: 'asc' } }),
    prisma.lead.findMany({ where, select: { entryDate: true } }),
    prisma.lead.count({ where: { ...openScope, nextActionAt: { lt: toDate(today) } } }),
    prisma.lead.count({ where: { ...openScope, nextActionAt: toDate(today) } }),
    prisma.lead.count({ where: { ...openScope, nextActionAt: { gt: toDate(today), lte: toDate(addDays(today, 7)) } } }),
    prisma.lead.findMany({
      where: { ...openScope, nextActionAt: { not: null, lte: toDate(addDays(today, 7)) } },
      orderBy: { nextActionAt: 'asc' },
      take: 8,
      select: {
        code: true,
        contactName: true,
        company: true,
        nextAction: true,
        nextActionAt: true,
        status: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    responseTimes(where),
  ])

  const statusCount = new Map(byStatusRaw.map((r) => [r.status, r._count._all]))
  const channelCount = new Map(byChannelRaw.map((r) => [r.channel, r._count._all]))
  const lineCount = new Map(byLineRaw.map((r) => [r.businessLineId, r._count._all]))
  const n = (s: (typeof LEAD_STATUSES)[number]) => statusCount.get(s) ?? 0

  const total = byStatusRaw.reduce((a, r) => a + r._count._all, 0)
  const won = n('GANADO')
  const lost = n('PERDIDO')

  const seriesMap = new Map(buckets(from, to, q.granularity).map((b) => [b, 0]))
  for (const { entryDate } of dates) {
    const b = bucketOf(toIsoDate(entryDate)!, q.granularity)
    seriesMap.set(b, (seriesMap.get(b) ?? 0) + 1)
  }

  return {
    range: { from, to },
    kpis: {
      total,
      open: total - won - lost,
      opportunities: n('OPORTUNIDAD'),
      won,
      lost,
      winRate: won + lost ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
      overdue,
      dueToday,
      dueWeek,
    },
    byStatus: LEAD_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], count: n(s) })),
    byChannel: CHANNELS.map((c) => ({ key: c, label: CHANNEL_LABELS[c], count: channelCount.get(c) ?? 0 })),
    byLine: lines
      .filter((l) => l.active || lineCount.has(l.id))
      .map((l) => ({ key: l.id, label: l.name, count: lineCount.get(l.id) ?? 0 })),
    response,
    series: [...seriesMap].map(([period, count]) => ({ period, count })),
    upcoming: upcoming.map((u) => ({ ...u, nextActionAt: toIsoDate(u.nextActionAt) })),
  }
}
