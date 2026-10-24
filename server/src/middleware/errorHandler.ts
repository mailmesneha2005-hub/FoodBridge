import type { ErrorRequestHandler, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found.'))

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  let normalized: AppError
  if (error instanceof AppError) normalized = error
  else if (error instanceof ZodError) normalized = new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })))
  else if (error instanceof mongoose.Error.ValidationError) normalized = new AppError(400, 'VALIDATION_ERROR', 'The submitted data is invalid.', Object.values(error.errors).map(issue => ({ path: issue.path, message: issue.message })))
  else if (error instanceof mongoose.Error.CastError) normalized = new AppError(400, 'INVALID_ID', `Invalid value for ${error.path}.`)
  else if (isDuplicateKey(error)) normalized = new AppError(409, 'DUPLICATE_RESOURCE', 'A record with these details already exists.')
  else if (isMalformedJson(error)) normalized = new AppError(400, 'INVALID_JSON', 'Request body contains invalid JSON.')
  else {
    if (env.NODE_ENV !== 'test') console.error(JSON.stringify({
      level: 'error',
      message: 'unhandled_api_error',
      requestId: res.getHeader('X-Request-Id'),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
    normalized = new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  }
  res.status(normalized.statusCode).json({ error: { code: normalized.code, message: normalized.message, ...(normalized.details ? { details: normalized.details } : {}) } })
}

function isDuplicateKey(error: unknown): error is { code: number } { return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000 }
function isMalformedJson(error: unknown): error is { type: string } { return typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed' }
