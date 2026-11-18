import type { Prisma } from '@prisma/client'
import { CLOSED_STATUSES, type NotificationsResponse, type NotificationType, type SessionUser } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { toDate, todayIso } from '../lib/dates.ts'
import { scopeWhere } from '../leads/permissions.ts'

type Tx = Prisma.TransactionClient

const RECENT = 20

interface NewNotification {
  actorId: string | null
  leadId: string
  message: string
  type: NotificationType
  userId: string | null | undefined
}

// Nadie recibe aviso de lo que hizo el mismo, y un lead sin responsable no tiene a quien avisar.
export async function notify(tx: Tx, n: NewNotification) {
  if (!n.userId || n.userId === n.actorId) return
  await tx.notification.create({
    data: { actorId: n.actorId, leadId: n.leadId, message: n.message, type: n.type, userId: n.userId },
  })
}

export async function listNotifications(user: SessionUser): Promise<NotificationsResponse> {
  // Filtra por alcance: si a un vendedor le quitan un lead, sus avisos viejos llevarian a un 404.
  const where: Prisma.NotificationWhereInput = { userId: user.id, lead: scopeWhere(user) }
  const [rows, unread, overdue] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: RECENT,
      include: {
        actor: { select: { id: true, name: true } },
        lead: { select: { code: true, contactName: true } },
      },
    }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
    prisma.lead.count({
      where: { ...scopeWhere(user), nextActionAt: { lt: toDate(todayIso()) }, status: { notIn: [...CLOSED_STATUSES] } },
    }),
  ])
  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      lead: r.lead,
      actor: r.actor,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    unread,
    overdue,
  }
}

export async function markRead(user: SessionUser, id?: string) {
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(id && { id }) },
    data: { readAt: new Date() },
  })
}
