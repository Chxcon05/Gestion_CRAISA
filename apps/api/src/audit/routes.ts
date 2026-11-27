import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { auditQuerySchema, type AuditListResponse } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { parse } from '../lib/http.ts'
import { addDays } from '../lib/dates.ts'

export const auditRouter = Router()

// createdAt es un instante, no una fecha: el dia se corta a medianoche de Costa Rica (UTC-6, sin
// horario de verano), no a medianoche UTC, o lo de las 6 pm en adelante caeria en el dia siguiente.
const crMidnight = (iso: string) => new Date(`${iso}T00:00:00-06:00`)

auditRouter.get('/', async (req, res) => {
  const q = parse(auditQuerySchema, req.query)
  const where: Prisma.AuditLogWhereInput = {
    ...(q.action && { action: q.action }),
    ...(q.userId && { userId: q.userId }),
    ...((q.from || q.to) && {
      createdAt: { ...(q.from && { gte: crMidnight(q.from) }), ...(q.to && { lt: crMidnight(addDays(q.to, 1)) }) },
    }),
  }
  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ])
  const body: AuditListResponse = {
    items: rows.map((r) => ({
      action: r.action,
      createdAt: r.createdAt.toISOString(),
      detail: r.detail,
      id: r.id,
      user: r.user,
    })),
    page: q.page,
    pageSize: q.pageSize,
    total,
  }
  res.json(body)
})
