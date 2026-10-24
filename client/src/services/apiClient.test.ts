import { describe, expect, it } from 'vitest'
import { resolveApiBase } from './apiClient'

describe('API URL resolution', () => {
  it('uses the local Vite proxy only during development', () => {
    expect(resolveApiBase(undefined, true)).toBe('/api')
    expect(resolveApiBase('  ', true)).toBe('/api')
  })

  it('requires an absolute HTTPS backend URL in production', () => {
    expect(resolveApiBase(undefined, false)).toBe('')
    expect(resolveApiBase('/api', false)).toBe('')
    expect(resolveApiBase('http://localhost:4000/api', false)).toBe('')
    expect(resolveApiBase('https://api.foodbridge.example/api/', false)).toBe('https://api.foodbridge.example/api')
  })
})
