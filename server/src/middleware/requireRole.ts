import type { RequestHandler } from 'express'
import type { UserRole } from '../types/auth.js'
import { forbidden, unauthorized } from '../utils/AppError.js'

export const requireRole = (...roles: UserRole[]): RequestHandler => (req, _res, next) => {
  if (!req.authUser) return next(unauthorized())
  if (req.authUser.accountStatus !== 'active') return next(forbidden('This account is not active.'))
  if (!roles.includes(req.authUser.role)) return next(forbidden())
  next()
}
