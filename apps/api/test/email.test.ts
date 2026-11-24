import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { cleanBody, emailToLead, findPhone, ingestEmail } from '../src/ingest/email.ts'
import { resetDb } from './helpers.ts'

const raw = (headers: Record<string, string>, body: string) =>
  [
    ...Object.entries({
      From: 'Maria Solis <MSolis@FincaElSol.cr>',
      To: 'info@craisa.com',
      Subject: 'Cotizacion de tractor',
      Date: 'Wed, 18 Nov 2026 10:00:00 -0600',
      'Message-ID': '<abc123@fincaelsol.cr>',
      'Content-Type': 'text/plain; charset=utf-8',
      ...headers,
    }).map(([k, v]) => `${k}: ${v}`),
    '',
    body,
  ].join('\r\n')

describe('lectura del correo', () => {
  it('arma el lead con remitente, asunto, cuerpo y telefono', async () => {
    const lead = await emailToLead(
      raw({}, 'Buenas, necesito precio de un tractor Farmall.\r\nMi numero es +506 8812-3456.\r\n\r\nEl mar, 17 nov 2026 escribió:\r\n> mensaje anterior'),
    )
    expect(lead).toMatchObject({
      channel: 'CORREO',
      contactName: 'Maria Solis',
      email: 'msolis@fincaelsol.cr',
      externalRef: 'email:abc123@fincaelsol.cr',
      phone: '8812-3456',
    })
    expect(lead?.message).toBe('Asunto: Cotizacion de tractor\n\nBuenas, necesito precio de un tractor Farmall.\nMi numero es +506 8812-3456.')
  })

  it('ignora boletines, respuestas automaticas, no-reply y lo que envia el propio buzon', async () => {
    expect(await emailToLead(raw({ 'List-Unsubscribe': '<mailto:baja@x.com>' }, 'Ofertas'))).toBeNull()
    expect(await emailToLead(raw({ 'Auto-Submitted': 'auto-replied' }, 'Fuera de oficina'))).toBeNull()
    expect(await emailToLead(raw({ From: 'no-reply@banco.cr' }, 'Aviso'))).toBeNull()
    expect(await emailToLead(raw({ From: 'info@craisa.com' }, 'Respuesta'), 'info@craisa.com')).toBeNull()
  })

  it('corta el hilo citado y reconoce telefonos de Costa Rica', () => {
    expect(cleanBody('Hola\n\nOn Tue, Nov 17, 2026 Juan wrote:\n> viejo')).toBe('Hola')
    expect(findPhone('llamar al 2440 1234 en la tarde')).toBe('2440-1234')
    expect(findPhone('pedido 12345678')).toBeNull()
  })
})

describe('captura desde el correo', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('crea un lead automatico de canal Correo y no lo duplica si el correo se lee otra vez', async () => {
    const source = raw({ From: 'compras@agro.cr' }, 'Necesito repuestos para una cosechadora')
    const code = await ingestEmail(source, 'info@craisa.com')
    expect(code).toMatch(/^LEAD-\d{4}-\d{4}$/)
    expect(await ingestEmail(source, 'info@craisa.com')).toBe(code)

    const lead = await prisma.lead.findUniqueOrThrow({ where: { code: code! }, include: { assignedTo: true } })
    expect(lead).toMatchObject({ assignedToId: null, autoCaptured: true, channel: 'CORREO', contactName: 'compras', status: 'NUEVO' })
    expect(await prisma.lead.count()).toBe(1)
  })
})
