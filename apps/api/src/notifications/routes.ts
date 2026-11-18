import { Router } from 'express'
import { currentUser } from '../auth/session.ts'
import { param } from '../lib/http.ts'
import { listNotifications, markRead } from './service.ts'

export const notificationsRouter = Router()

notificationsRouter.get('/', async (req, res) => {
  res.json(await listNotifications(currentUser(req)))
})

notificationsRouter.post('/read-all', async (req, res) => {
  await markRead(currentUser(req))
  res.status(204).end()
})

notificationsRouter.post('/:id/read', async (req, res) => {
  await markRead(currentUser(req), param(req, 'id'))
  res.status(204).end()
})
