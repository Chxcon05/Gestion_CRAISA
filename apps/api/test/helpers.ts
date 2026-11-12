import { hash } from 'bcryptjs'
import request from 'supertest'
import type { Role } from '@craisa/shared'
import { createApp } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'

export const app = createApp()
export const PASSWORD = 'clave-de-prueba'

export async function resetDb() {
  await prisma.$transaction([
    prisma.interaction.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.leadSequence.deleteMany(),
    prisma.product.deleteMany(),
    prisma.businessLine.deleteMany(),
    prisma.user.deleteMany(),
  ])
  const passwordHash = await hash(PASSWORD, 4)
  const mk = (name: string, email: string, role: Role) => prisma.user.create({ data: { name, email, role, passwordHash } })
  const [admin, mercadeo, ana, beto] = await Promise.all([
    mk('Admin', 'admin@t.cr', 'ADMIN'),
    mk('Mercadeo', 'mercadeo@t.cr', 'MERCADEO'),
    mk('Ana Vendedora', 'ana@t.cr', 'VENDEDOR'),
    mk('Beto Vendedor', 'beto@t.cr', 'VENDEDOR'),
  ])
  const agricola = await prisma.businessLine.create({
    data: { name: 'Agricola', products: { create: [{ name: 'Tractor' }] } },
    include: { products: true },
  })
  const carga = await prisma.businessLine.create({ data: { name: 'Carga' } })
  return { admin, mercadeo, ana, beto, agricola, carga, tractor: agricola.products[0]! }
}

export async function login(email: string) {
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD })
  if (res.status !== 200) throw new Error(`login ${email}: ${res.status}`)
  return agent
}

export const leadInput = (over: Record<string, unknown> = {}) => ({
  entryDate: '2026-11-02',
  contactName: 'Cliente Prueba',
  company: 'Finca Prueba',
  phone: '8888-0000',
  channel: 'WHATSAPP',
  description: 'Consulta por tractor',
  ...over,
})
