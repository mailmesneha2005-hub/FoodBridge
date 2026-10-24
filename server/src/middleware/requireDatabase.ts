import type { RequestHandler } from 'express'
import { databaseIsReady } from '../config/database.js'
import { env } from '../config/env.js'
import { unavailable } from '../utils/AppError.js'

export const requireDatabase: RequestHandler = (_req, _res, next) => {
  if (!env.MONGODB_URI) return next(unavailable('DATABASE_NOT_CONFIGURED', 'MongoDB is not configured. Set MONGODB_URI to use this endpoint.'))
  if (!databaseIsReady()) return next(unavailable('DATABASE_UNAVAILABLE', 'MongoDB is not currently available.'))
  next()
}
