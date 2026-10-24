import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID()
  const startedAt = Date.now()
  res.setHeader('X-Request-Id', requestId)
  res.on('finish', () => {
    const statusCode = res.statusCode
    console.info(JSON.stringify({
      level: statusCode >= 500 ? 'error' : 'info',
      message: 'http_request',
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      durationMs: Date.now() - startedAt,
    }))
  })
  next()
}
