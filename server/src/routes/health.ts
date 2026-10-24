import { Router } from 'express'
import { databaseIsReady } from '../config/database.js'
import { env } from '../config/env.js'

export const healthRouter = Router()
healthRouter.get('/', (_req,res) => {
  const database = databaseIsReady()
  res.status(database ? 200 : 503).json({ status: database ? 'ok' : 'degraded', service: 'foodbridge-api', database: database ? 'connected' : env.MONGODB_URI ? 'disconnected' : 'not-configured' })
})
