import type { Prisma } from '@prisma/client'
import type { Interaction, LeadDetail, LeadListItem, SessionUser } from '@craisa/shared'
import { toIsoDate } from '../lib/dates.ts'
import { canDelete, canEdit } from './permissions.ts'

const userRef = { select: { id: true, name: true } } as const

export const listInclude = {
  businessLine: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
  assignedTo: userRef,
} satisfies Prisma.LeadInclude

export const detailInclude = {
  ...listInclude,
  createdBy: userRef,
  interactions: { orderBy: { createdAt: 'desc' }, include: { user: userRef } },
} satisfies Prisma.LeadInclude

type ListRow = Prisma.LeadGetPayload<{ include: typeof listInclude }>
type DetailRow = Prisma.LeadGetPayload<{ include: typeof detailInclude }>

export function toListItem(l: ListRow): LeadListItem {
  return {
    id: l.id,
    code: l.code,
    autoCaptured: l.autoCaptured,
    entryDate: toIsoDate(l.entryDate)!,
    contactName: l.contactName,
    company: l.company,
    phone: l.phone,
    email: l.email,
    channel: l.channel,
    businessLine: l.businessLine,
    product: l.product,
    status: l.status,
    assignedTo: l.assignedTo,
    nextAction: l.nextAction,
    nextActionAt: toIsoDate(l.nextActionAt),
    updatedAt: l.updatedAt.toISOString(),
  }
}

export function toDetail(l: DetailRow, user: SessionUser): LeadDetail {
  return {
    ...toListItem(l),
    description: l.description,
    lossReason: l.lossReason,
    createdBy: l.createdBy,
    createdAt: l.createdAt.toISOString(),
    interactions: l.interactions.map(
      (i): Interaction => ({
        id: i.id,
        type: i.type,
        content: i.content,
        fromStatus: i.fromStatus,
        toStatus: i.toStatus,
        user: i.user,
        createdAt: i.createdAt.toISOString(),
      }),
    ),
    canEdit: canEdit(user, l),
    canDelete: canDelete(user),
  }
}
