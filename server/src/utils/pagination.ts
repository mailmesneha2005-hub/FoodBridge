import type { Request } from 'express'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().regex(/^-?[a-zA-Z][a-zA-Z0-9]*$/).default('-createdAt'),
})

export function parsePagination(req: Request) {
  return querySchema.parse(req.query)
}

export function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) }
}

export function sortObject(sort: string): Record<string, 1 | -1> {
  const descending = sort.startsWith('-')
  return { [descending ? sort.slice(1) : sort]: descending ? -1 : 1 }
}
