import { beforeEach, describe, expect, it } from 'vitest'
import type { Interaction } from '@craisa/shared'
import { prisma } from '../src/lib/prisma.ts'
import { leadInput, login, resetDb } from './helpers.ts'

let ctx: Awaited<ReturnType<typeof resetDb>>
let admin: Awaited<ReturnType<typeof login>>

// PNG de 1x1: la nota con captura prueba que los adjuntos viajan con su interaccion.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

beforeEach(async () => {
  ctx = await resetDb()
  admin = await login('admin@t.cr')
})

const create = async (over: Record<string, unknown> = {}) => {
  const res = await admin.post('/api/leads').send(leadInput({ assignedToId: ctx.ana.id, businessLineId: ctx.agricola.id, ...over }))
  if (res.status !== 201) throw new Error(`crear lead: ${res.status}`)
  return res.body as { code: string; id: string }
}

describe('fusionar duplicados', () => {
  it('pasa bitacora, adjuntos y notificaciones al conservado y borra el otro', async () => {
    const keep = await create({ email: '' })
    const from = await create({ email: 'otro@t.cr' })
    expect((await admin.post(`/api/leads/${from.code}/notes`).send({ content: 'Captura del chat', images: [PNG] })).status).toBe(201)
    const notifications = await prisma.notification.count({ where: { leadId: { in: [keep.id, from.id] } } })
    const res = await admin.post(`/api/leads/${keep.code}/merge`).send({ from: from.code })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('otro@t.cr')
    expect(res.body.interactions[0].content).toMatch(new RegExp(`^Fusionado con ${from.code} \\(Cliente Prueba\\)`))
    expect(res.body.interactions.some((i: Interaction) => i.attachments.length === 1)).toBe(true)
    expect(res.body.interactions.filter((i: Interaction) => i.type === 'CREACION')).toHaveLength(2)
    expect(await prisma.lead.findUnique({ where: { code: from.code } })).toBeNull()
    expect(await prisma.notification.count({ where: { leadId: keep.id } })).toBe(notifications)
    expect(await prisma.auditLog.count({ where: { action: 'LEAD_FUSIONADO' } })).toBe(1)
  })

  it('no pisa datos que el conservado ya tiene', async () => {
    const keep = await create({ company: 'Finca Uno', phone: '8888-0000' })
    const from = await create({ company: 'Finca Dos', phone: '8888-9999' })
    const res = await admin.post(`/api/leads/${keep.code}/merge`).send({ from: from.code })
    expect(res.body).toMatchObject({ company: 'Finca Uno', phone: '8888-0000' })
  })

  it('lleva contactRef y externalRef sin violar la restriccion unica', async () => {
    const keep = await create()
    const from = await create()
    await prisma.lead.update({ where: { id: from.id }, data: { contactRef: 'facebook:1', externalRef: 'wamid.X' } })
    expect((await admin.post(`/api/leads/${keep.code}/merge`).send({ from: from.code })).status).toBe(200)
    expect(await prisma.lead.findUniqueOrThrow({ where: { id: keep.id } })).toMatchObject({ contactRef: 'facebook:1', externalRef: 'wamid.X' })

    const other = await create()
    await prisma.lead.update({ where: { id: other.id }, data: { externalRef: 'wamid.Y' } })
    expect((await admin.post(`/api/leads/${keep.code}/merge`).send({ from: other.code })).status).toBe(200)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: keep.id } })).externalRef).toBe('wamid.X')
  })

  it('si ambos tienen externalRef, el del otro queda en la nota para que la reingesta no recree el lead', async () => {
    const keep = await create()
    const from = await create()
    await prisma.lead.update({ where: { id: keep.id }, data: { externalRef: 'email:a@x' } })
    await prisma.lead.update({ where: { id: from.id }, data: { externalRef: 'email:b@x' } })
    expect((await admin.post(`/api/leads/${keep.code}/merge`).send({ from: from.code })).status).toBe(200)
    const note = await prisma.interaction.findUniqueOrThrow({ where: { externalRef: 'email:b@x' } })
    expect(note.leadId).toBe(keep.id)
  })

  it('la nota guarda la consulta del otro y los datos que no se pasaron', async () => {
    const keep = await create({ phone: '8888-0000' })
    const from = await create({ description: 'Pregunta por repuestos de cosechadora', phone: '8888-9999' })
    const res = await admin.post(`/api/leads/${keep.code}/merge`).send({ from: from.code })
    const content: string = res.body.interactions[0].content
    expect(content).toContain(`Fusionado con ${from.code} (Cliente Prueba)`)
    expect(content).toContain('Pregunta por repuestos de cosechadora')
    expect(content).toContain('Telefono del otro: 8888-9999')
  })

  it('rechaza fusionar consigo mismo, un codigo inexistente y a un vendedor', async () => {
    const keep = await create()
    const from = await create()
    expect((await admin.post(`/api/leads/${keep.code}/merge`).send({ from: keep.code })).status).toBe(400)
    expect((await admin.post(`/api/leads/${keep.code}/merge`).send({ from: 'LEAD-2026-9999' })).status).toBe(404)
    const ana = await login('ana@t.cr')
    expect((await ana.post(`/api/leads/${keep.code}/merge`).send({ from: from.code })).status).toBe(403)
  })
})
