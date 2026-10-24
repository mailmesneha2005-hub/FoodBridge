import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

export const validateBody = (schema: ZodType): RequestHandler => (req, _res, next) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return next(parsed.error)
  req.body = parsed.data
  next()
}

export const validateQuery = (schema: ZodType): RequestHandler => (req, _res, next) => {
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return next(parsed.error)
  Object.assign(req.query, parsed.data)
  next()
}

export const validateParams = (schema: ZodType): RequestHandler => (req, _res, next) => {
  const parsed = schema.safeParse(req.params)
  if (!parsed.success) return next(parsed.error)
  Object.assign(req.params, parsed.data)
  next()
}
