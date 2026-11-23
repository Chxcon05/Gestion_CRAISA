import type { Prisma } from '@prisma/client'
import { scoreLead, type DuplicateMatch, type SessionUser } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { toIsoDate } from '../lib/dates.ts'
import { scopeWhere } from './permissions.ts'

type Db = Prisma.TransactionClient | typeof prisma

const scoreFields = {
  channel: true,
  company: true,
  description: true,
  email: true,
  phone: true,
  productId: true,
  status: true,
} as const

/** Recalcula y guarda el puntaje despues de cualquier cambio que lo afecte. */
export async function refreshScore(db: Db, id: string) {
  const lead = await db.lead.findUniqueOrThrow({ where: { id }, select: scoreFields })
  await db.lead.update({ where: { id }, data: { score: scoreLead(lead).score }, select: { id: true } })
}

// Los leads creados antes de la columna quedan en null; el arranque los completa una vez.
export async function backfillScores() {
  const pending = await prisma.lead.findMany({ where: { score: null }, select: { id: true, ...scoreFields } })
  for (const { id, ...lead } of pending) {
    await prisma.lead.update({ where: { id }, data: { score: scoreLead(lead).score }, select: { id: true } })
  }
  return pending.length
}

/** Ultimos 8 digitos: el formato local de Costa Rica, con o sin +506, espacios o guiones. */
export const phoneKey = (phone: string | null | undefined) => {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 7 ? digits.slice(-8) : null
}

// La busqueda cruza todos los leads, no solo los del vendedor: el punto es avisarle que el cliente
// ya lo atiende un companero. Solo se devuelve lo justo para coordinar, y canOpen dice si puede abrirlo.
export async function findDuplicates(
  q: { email?: string; exclude?: string; phone?: string },
  user: SessionUser,
): Promise<DuplicateMatch[]> {
  const email = q.email?.trim().toLowerCase() || null
  const phone = phoneKey(q.phone)
  if (!email && !phone) return []

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM leads
    WHERE (
      (${email}::text IS NOT NULL AND lower(email) = ${email})
      OR (${phone}::text IS NOT NULL AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 8) = ${phone})
    )
    AND code <> ${q.exclude ?? ''}
    ORDER BY "createdAt" DESC
    LIMIT 5`
  if (!rows.length) return []

  const ids = rows.map((r) => r.id)
  const [leads, visible] = await Promise.all([
    prisma.lead.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        company: true,
        contactName: true,
        email: true,
        entryDate: true,
        phone: true,
        status: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.findMany({ where: { id: { in: ids }, ...scopeWhere(user) }, select: { id: true } }),
  ])
  const open = new Set(visible.map((v) => v.id))
  return leads.map((l) => ({
    assignedTo: l.assignedTo,
    canOpen: open.has(l.id),
    code: l.code,
    company: l.company,
    contactName: l.contactName,
    entryDate: toIsoDate(l.entryDate)!,
    matchedBy: [
      ...(email && l.email?.toLowerCase() === email ? (['email'] as const) : []),
      ...(phone && phoneKey(l.phone) === phone ? (['phone'] as const) : []),
    ],
    status: l.status,
  }))
}
