import type { Prisma } from '@prisma/client'
import {
  LEAD_STATUSES,
  STATUS_LABELS,
  type LeadCreate,
  type LeadFilters,
  type LeadListResponse,
  type LeadStatus,
  type LeadUpdate,
  type SessionUser,
  type StatusChange,
} from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { HttpError, forbidden, notFound } from '../lib/http.ts'
import { toDate } from '../lib/dates.ts'
import { audit } from '../lib/audit.ts'
import { notify } from '../notifications/service.ts'
import { buildOrderBy, buildWhere } from './query.ts'
import { canAssignTo, canDelete, canEdit, scopeWhere } from './permissions.ts'
import { detailInclude, listInclude, toDetail, toListItem } from './serialize.ts'

type Tx = Prisma.TransactionClient

export async function listLeads(f: LeadFilters, user: SessionUser): Promise<LeadListResponse> {
  const where = buildWhere(f, user)
  // Los conteos de las pestanas ignoran el filtro de estado: cada pestana muestra cuantos leads tendria.
  const countsWhere = buildWhere({ ...f, status: [] }, user)
  const [total, rows, byStatus] = await prisma.$transaction([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: listInclude,
      orderBy: buildOrderBy(f),
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    prisma.lead.groupBy({ by: ['status'], where: countsWhere, orderBy: { status: 'asc' }, _count: { _all: true } }),
  ])
  const statusCounts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>
  for (const r of byStatus) statusCounts[r.status] = (r._count as { _all: number })._all
  return { items: rows.map(toListItem), total, page: f.page, pageSize: f.pageSize, statusCounts }
}

async function findVisible(code: string, user: SessionUser) {
  // Un lead fuera del alcance responde 404, no 403: no se confirma que exista.
  const lead = await prisma.lead.findFirst({ where: { code, ...scopeWhere(user) }, include: detailInclude })
  if (!lead) throw notFound('Lead')
  return lead
}

export async function getLead(code: string, user: SessionUser) {
  return toDetail(await findVisible(code, user), user)
}

async function assertReferences(
  tx: Tx,
  user: SessionUser,
  data: { assignedToId?: string; businessLineId?: string; productId?: string | null },
  currentLineId?: string,
) {
  if (data.assignedToId) {
    if (!canAssignTo(user, data.assignedToId)) throw forbidden('Solo puede asignarse leads a usted mismo')
    const assignee = await tx.user.findFirst({ where: { id: data.assignedToId, active: true } })
    if (!assignee) throw new HttpError(400, 'VALIDATION', 'Responsable no valido', { assignedToId: 'Responsable no valido' })
  }
  const lineId = data.businessLineId ?? currentLineId
  if (data.businessLineId) {
    const line = await tx.businessLine.findFirst({ where: { id: data.businessLineId, active: true } })
    if (!line) throw new HttpError(400, 'VALIDATION', 'Linea no valida', { businessLineId: 'Linea no valida' })
  }
  if (data.productId) {
    const product = await tx.product.findFirst({ where: { id: data.productId, businessLineId: lineId } })
    if (!product) {
      throw new HttpError(400, 'VALIDATION', 'El producto no pertenece a la linea', { productId: 'Producto no valido para la linea' })
    }
  }
}

// Secuencial por anio con upsert atomico: el prototipo anterior usaba un numero aleatorio y podia repetir codigos.
export async function nextCode(tx: Tx, entryDate: string) {
  const year = Number(entryDate.slice(0, 4))
  const seq = await tx.leadSequence.upsert({
    where: { year },
    create: { year, last: 1 },
    update: { last: { increment: 1 } },
  })
  return `LEAD-${year}-${String(seq.last).padStart(4, '0')}`
}

export async function createLead(input: LeadCreate, user: SessionUser) {
  const code = await prisma.$transaction(async (tx) => {
    await assertReferences(tx, user, input)
    const newCode = await nextCode(tx, input.entryDate)
    const created = await tx.lead.create({
      data: {
        ...input,
        code: newCode,
        entryDate: toDate(input.entryDate),
        nextActionAt: input.nextActionAt ? toDate(input.nextActionAt) : null,
        lossReason: input.status === 'PERDIDO' ? input.lossReason : null,
        createdById: user.id,
        interactions: {
          create: { type: 'CREACION', userId: user.id, toStatus: input.status, content: 'Lead registrado' },
        },
      },
    })
    await notify(tx, {
      actorId: user.id,
      leadId: created.id,
      message: `${user.name} le asigno un lead nuevo`,
      type: 'ASIGNACION',
      userId: input.assignedToId,
    })
    return newCode
  })
  return getLead(code, user)
}

async function findEditable(code: string, user: SessionUser) {
  const lead = await findVisible(code, user)
  if (!canEdit(user, lead)) throw forbidden('No puede modificar este lead')
  return lead
}

export async function updateLead(code: string, input: LeadUpdate, user: SessionUser) {
  const lead = await findEditable(code, user)
  await prisma.$transaction(async (tx) => {
    await assertReferences(tx, user, input, lead.businessLineId)
    const lineChanged = input.businessLineId && input.businessLineId !== lead.businessLineId
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        ...input,
        ...(input.entryDate && { entryDate: toDate(input.entryDate) }),
        ...(input.nextActionAt !== undefined && { nextActionAt: input.nextActionAt ? toDate(input.nextActionAt) : null }),
        // Si cambia la linea y no se envio producto, el anterior ya no aplica.
        ...(lineChanged && input.productId === undefined && { productId: null }),
      },
    })
    if (input.assignedToId && input.assignedToId !== lead.assignedToId) {
      const assignee = await tx.user.findUniqueOrThrow({ where: { id: input.assignedToId }, select: { name: true } })
      await tx.interaction.create({
        data: { leadId: lead.id, userId: user.id, type: 'ASIGNACION', content: `Asignado a ${assignee.name}` },
      })
      await notify(tx, {
        actorId: user.id,
        leadId: lead.id,
        message: `${user.name} le asigno este lead`,
        type: 'ASIGNACION',
        userId: input.assignedToId,
      })
    }
  })
  return getLead(code, user)
}

export async function changeStatus(code: string, input: StatusChange, user: SessionUser) {
  const lead = await findEditable(code, user)
  if (lead.status === input.status && !input.note) return toDetail(lead, user)
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: input.status, lossReason: input.status === 'PERDIDO' ? input.lossReason : null },
    })
    await tx.interaction.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: 'CAMBIO_ESTADO',
        fromStatus: lead.status,
        toStatus: input.status,
        content:
          input.note ??
          (input.status === 'PERDIDO'
            ? `Motivo: ${input.lossReason}`
            : `${STATUS_LABELS[lead.status]} a ${STATUS_LABELS[input.status]}`),
      },
    })
    if (lead.status !== input.status) {
      await notify(tx, {
        actorId: user.id,
        leadId: lead.id,
        message: `${user.name} cambio el estado a ${STATUS_LABELS[input.status]}`,
        type: 'ACTIVIDAD',
        userId: lead.assignedToId,
      })
    }
  })
  return getLead(code, user)
}

export async function addNote(code: string, content: string, user: SessionUser) {
  const lead = await findEditable(code, user)
  await prisma.$transaction(async (tx) => {
    await tx.interaction.create({ data: { leadId: lead.id, userId: user.id, type: 'NOTA', content } })
    // Una nota es gestion: debe mover la fecha de ultima actualizacion del lead.
    await tx.lead.update({ where: { id: lead.id }, data: { updatedAt: new Date() } })
    await notify(tx, {
      actorId: user.id,
      leadId: lead.id,
      message: `${user.name} agrego una nota`,
      type: 'ACTIVIDAD',
      userId: lead.assignedToId,
    })
  })
  return getLead(code, user)
}

export async function deleteLead(code: string, user: SessionUser) {
  if (!canDelete(user)) throw forbidden('Solo un administrador puede eliminar leads')
  const lead = await findVisible(code, user)
  await prisma.lead.delete({ where: { id: lead.id } })
  await audit(user.id, 'LEAD_ELIMINADO', `${lead.code} - ${lead.contactName}`)
}
