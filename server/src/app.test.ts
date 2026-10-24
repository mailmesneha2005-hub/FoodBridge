import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'

describe('GET /api/v1/health', () => {
  it('returns the API status and database configuration state', async () => {
    const response = await request(createApp()).get('/api/v1/health')
    expect([200,503]).toContain(response.status)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body.data.service).toBe('foodbridge-api')
    expect(response.body.data).toHaveProperty('database')
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i)
  })
})
