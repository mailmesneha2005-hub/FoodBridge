import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './config/env.js'
import { healthRouter } from './routes/health.js'
import { apiRouter } from './routes/api.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(requestLogger)
  app.use(express.json({ limit: '1mb' }))
  app.use('/api', rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX, standardHeaders: 'draft-7', legacyHeaders: false }))
  app.use('/api/v1', apiRouter)
  app.use('/api/health', healthRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
