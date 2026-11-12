import { Router } from 'express'
import { dashboardQuerySchema } from '@craisa/shared'
import { parse } from '../lib/http.ts'
import { currentUser } from '../auth/session.ts'
import { getDashboard } from './service.ts'

export const dashboardRouter = Router()

dashboardRouter.get('/', async (req, res) => {
  res.json(await getDashboard(parse(dashboardQuerySchema, req.query), currentUser(req)))
})
