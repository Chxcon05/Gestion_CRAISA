import type { LeadDetail, SessionUser } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { HttpError, notFound } from '../lib/http.ts'
import { audit } from '../lib/audit.ts'
import { refreshScore } from './insights.ts'
import { getLead } from './service.ts'

/**
 * El lead `keepCode` se queda con sus datos y solo completa los vacios con los del otro; la bitacora,
 * las capturas y los avisos del otro pasan a el, y el otro se borra.
 */
export async function mergeLeads(keepCode: string, fromCode: string, user: SessionUser): Promise<LeadDetail> {
  if (keepCode === fromCode) throw new HttpError(400, 'VALIDATION', 'No se puede fusionar un lead consigo mismo')
  await prisma.$transaction(async (tx) => {
    const [keep, from] = await Promise.all([
      tx.lead.findUnique({ where: { code: keepCode }, include: { product: true } }),
      tx.lead.findUnique({ where: { code: fromCode }, include: { product: true } }),
    ])
    if (!keep || !from) throw notFound('Lead')

    // externalRef es unico: hay que soltarlo del otro antes de pasarlo, o choca en el mismo update. Si el
    // conservado ya tiene uno, el del otro va a la nota: la ingesta tambien lo busca ahi y no recrea el lead.
    const takeExternal = !keep.externalRef && from.externalRef
    if (from.externalRef) await tx.lead.update({ where: { id: from.id }, data: { externalRef: null } })
    const takeAction = !keep.nextAction && !keep.nextActionAt && from.nextAction
    await tx.lead.update({
      where: { id: keep.id },
      data: {
        company: keep.company ?? from.company,
        contactRef: keep.contactRef ?? from.contactRef,
        email: keep.email ?? from.email,
        phone: keep.phone ?? from.phone,
        ...(takeExternal && { externalRef: from.externalRef }),
        ...(takeAction && { nextAction: from.nextAction, nextActionAt: from.nextActionAt }),
        // Un producto de otra linea no aplica al conservado.
        ...(!keep.productId && from.product?.businessLineId === keep.businessLineId && { productId: from.productId }),
      },
    })
    await tx.interaction.updateMany({ where: { leadId: from.id }, data: { leadId: keep.id } })
    await tx.notification.updateMany({ where: { leadId: from.id }, data: { leadId: keep.id } })
    // En los leads automaticos el primer mensaje del cliente solo vive en la descripcion; sin esto se perderia.
    const dropped = [
      keep.phone && from.phone && keep.phone !== from.phone && `Telefono del otro: ${from.phone}`,
      keep.email && from.email && keep.email !== from.email && `Correo del otro: ${from.email}`,
      keep.company && from.company && keep.company !== from.company && `Empresa del otro: ${from.company}`,
    ].filter(Boolean)
    await tx.interaction.create({
      data: {
        content: [`Fusionado con ${from.code} (${from.contactName})`, `Consulta: ${from.description}`, ...dropped].join('\n'),
        externalRef: takeExternal ? null : from.externalRef,
        leadId: keep.id,
        type: 'NOTA',
        userId: user.id,
      },
    })
    await tx.lead.delete({ where: { id: from.id } })
    await refreshScore(tx, keep.id)
  })
  await audit(user.id, 'LEAD_FUSIONADO', `${fromCode} en ${keepCode}`)
  return getLead(keepCode, user)
}
