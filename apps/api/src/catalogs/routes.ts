import { Router } from 'express'
import { catalogItemSchema, productSchema, type Catalogs } from '@craisa/shared'
import { prisma } from '../lib/prisma.ts'
import { param, parse } from '../lib/http.ts'
import { requireRole } from '../auth/session.ts'

export const catalogsRouter = Router()

// Un solo endpoint alimenta todos los selects del formulario y de los filtros.
catalogsRouter.get('/', async (_req, res) => {
  const [lines, products, users] = await Promise.all([
    prisma.businessLine.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, active: true } }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, active: true, businessLineId: true },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true },
    }),
  ])
  const body: Catalogs = { lines, products, users }
  res.json(body)
})

const adminOnly = requireRole('ADMIN')

catalogsRouter.post('/lines', adminOnly, async (req, res) => {
  res.status(201).json(await prisma.businessLine.create({ data: parse(catalogItemSchema, req.body) }))
})

catalogsRouter.patch('/lines/:id', adminOnly, async (req, res) => {
  const data = parse(catalogItemSchema.partial(), req.body)
  res.json(await prisma.businessLine.update({ where: { id: param(req, 'id') }, data }))
})

catalogsRouter.post('/products', adminOnly, async (req, res) => {
  res.status(201).json(await prisma.product.create({ data: parse(productSchema, req.body) }))
})

catalogsRouter.patch('/products/:id', adminOnly, async (req, res) => {
  const data = parse(productSchema.partial(), req.body)
  res.json(await prisma.product.update({ where: { id: param(req, 'id') }, data }))
})
