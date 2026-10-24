import { describe, expect, it, vi } from 'vitest'
import type { Request, RequestHandler } from 'express'
import { createAuthenticate } from './authenticate.js'
import { requireRole } from './requireRole.js'
import { assertActiveRole, assertAllowedInitialAdminBootstrap, assertCanApproveNgo, assertEligibleNgoRequest, assertNgoEnrollment, assertRecordOwner, assertVolunteerEnrollment } from '../services/authorization.js'
import { AppError } from '../utils/AppError.js'

async function invoke(middleware: RequestHandler, request: Record<string, unknown>) {
  const next = vi.fn()
  await middleware(request as Request, {} as never, next)
  return next.mock.calls[0]?.[0] as AppError | undefined
}

describe('Firebase authentication and authorization policies', () => {
  it('rejects protected requests with a missing bearer token', async () => {
    const middleware = createAuthenticate({ configured: () => true, verify: vi.fn(), provision: vi.fn() })
    const error = await invoke(middleware, { header: () => undefined })
    expect(error?.statusCode).toBe(401)
  })

  it('rejects invalid Firebase ID tokens', async () => {
    const middleware = createAuthenticate({ configured: () => true, verify: async () => { throw Object.assign(new Error('bad token'), { code: 'auth/invalid-id-token' }) }, provision: vi.fn() })
    const error = await invoke(middleware, { header: () => 'Bearer invalid' })
    expect(error?.statusCode).toBe(401)
  })

  it('rejects disabled Firebase accounts', async () => {
    const middleware = createAuthenticate({ configured: () => true, verify: async () => { throw Object.assign(new Error('disabled'), { code: 'auth/user-disabled' }) }, provision: vi.fn() })
    const error = await invoke(middleware, { header: () => 'Bearer token' })
    expect(error?.statusCode).toBe(403)
  })

  it('uses the backend profile returned from the verified identity', async () => {
    const provisioned = { id: 'mongo-1', firebaseUid: 'firebase-1', email: 'user@example.com', displayName: 'FoodBridge user', role: 'volunteer' as const, accountStatus: 'active' as const }
    const provision = vi.fn(async () => provisioned)
    const middleware = createAuthenticate({ configured: () => true, verify: async () => ({ uid: 'firebase-1', email: 'user@example.com' }), provision })
    const req = { header: () => 'Bearer verified-token' } as unknown as Request
    const next = vi.fn()
    await middleware(req, {} as never, next)
    expect(req.authUser).toEqual(provisioned)
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects missing Firebase Admin configuration rather than simulating authentication', async () => {
    const middleware = createAuthenticate({ configured: () => false, verify: vi.fn(), provision: vi.fn() })
    const error = await invoke(middleware, { header: () => 'Bearer token' })
    expect(error?.statusCode).toBe(503)
  })

  it('denies roles outside the server-loaded profile role', () => {
    const next = vi.fn()
    requireRole('admin')({ authUser: { id: 'u1', firebaseUid: 'fb1', email: 'a@b.com', displayName: 'A', role: 'donor', accountStatus: 'active' } } as never, {} as never, next)
    expect((next.mock.calls[0]?.[0] as AppError).statusCode).toBe(403)
  })

  it('prevents record access by a different owner and NGO self-approval', () => {
    expect(() => assertRecordOwner('actor-1', 'actor-2')).toThrow(/own records/)
    expect(() => assertCanApproveNgo('same-user', 'same-user')).toThrow(/own NGO/)
    expect(() => assertCanApproveNgo('admin-1', 'ngo-2')).not.toThrow()
  })

  it('allows only server-defined donor-to-volunteer enrollment', () => {
    expect(() => assertVolunteerEnrollment('donor', 'active')).not.toThrow()
    expect(() => assertVolunteerEnrollment('admin', 'active')).toThrow(/cannot enroll/)
    expect(() => assertVolunteerEnrollment('donor', 'suspended')).toThrow(/cannot enroll/)
  })

  it('allows donor NGO applications and pending application retries without allowing role changes by other roles', () => {
    expect(() => assertNgoEnrollment('donor','active')).not.toThrow()
    expect(() => assertNgoEnrollment('ngo','pending')).not.toThrow()
    expect(() => assertNgoEnrollment('admin','active')).toThrow(/cannot submit or resume/)
    expect(() => assertNgoEnrollment('volunteer','active')).toThrow(/cannot submit or resume/)
    expect(() => assertNgoEnrollment('ngo','active')).toThrow(/cannot submit or resume/)
    expect(() => assertNgoEnrollment('donor','suspended')).toThrow(/cannot submit or resume/)
  })

  it('requires an active, verified NGO before a donation request', () => {
    expect(() => assertEligibleNgoRequest('pending', 'active')).toThrow(/must be verified/)
    expect(() => assertEligibleNgoRequest('approved', 'pending')).toThrow(/must be verified/)
    expect(() => assertEligibleNgoRequest('approved', 'active')).not.toThrow()
  })

  it('permits only a one-time initial administrator bootstrap', () => {
    expect(() => assertAllowedInitialAdminBootstrap(false)).not.toThrow()
    expect(() => assertAllowedInitialAdminBootstrap(true)).toThrow(/already exists/)
  })

  it('checks the persisted active role again in business services', () => {
    expect(() => assertActiveRole('admin', 'active', 'admin')).not.toThrow()
    expect(() => assertActiveRole('donor', 'active', 'admin')).toThrow(/active admin/)
    expect(() => assertActiveRole('admin', 'suspended', 'admin')).toThrow(/active admin/)
  })
})
