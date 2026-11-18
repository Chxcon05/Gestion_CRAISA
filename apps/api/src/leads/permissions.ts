import type { Prisma } from '@prisma/client'
import { ROLES_WITH_GLOBAL_SCOPE, type SessionUser } from '@craisa/shared'

const hasGlobalScope = (u: SessionUser) => ROLES_WITH_GLOBAL_SCOPE.includes(u.role)

/** Filtro base que limita los leads visibles segun el rol; se aplica en toda consulta. */
export function scopeWhere(u: SessionUser): Prisma.LeadWhereInput {
  if (hasGlobalScope(u)) return {}
  return { OR: [{ assignedToId: u.id }, { createdById: u.id }] }
}

export function canEdit(u: SessionUser, lead: { assignedToId: string | null; createdById: string | null }) {
  return hasGlobalScope(u) || lead.assignedToId === u.id || lead.createdById === u.id
}

export const canDelete = (u: SessionUser) => u.role === 'ADMIN'

/** Un vendedor solo puede asignarse leads a si mismo; el administrador reparte. */
export const canAssignTo = (u: SessionUser, assigneeId: string) => hasGlobalScope(u) || assigneeId === u.id
