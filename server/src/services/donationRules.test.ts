import { describe, expect, it } from 'vitest'
import { assertDonationDates, assertDonationEditable, assertDonationRequestable, assertNoDuplicateRequest, assertPendingRequest, assertRequestDecision, reserveDonationAtomically } from './donationRules.js'

const now = new Date('2030-01-01T10:00:00Z')
const validDonationDates = { preparationTime: new Date('2030-01-01T08:00:00Z'), safeUseDeadline: new Date('2030-01-01T18:00:00Z'), pickupWindow: { start: new Date('2030-01-01T10:30:00Z'), end: new Date('2030-01-01T14:00:00Z') } }

describe('donation lifecycle rules used by the API services', () => {
  it('accepts donation creation dates within a safe pickup window', () => expect(() => assertDonationDates(validDonationDates, now)).not.toThrow())
  it('rejects invalid or already expired creation/update date combinations', () => {
    expect(() => assertDonationDates({ ...validDonationDates, safeUseDeadline: new Date('2030-01-01T09:00:00Z') }, now)).toThrow(/safe-use deadline/i)
    expect(() => assertDonationDates({ ...validDonationDates, pickupWindow: { start: validDonationDates.pickupWindow.end, end: validDonationDates.pickupWindow.start } }, now)).toThrow(/safe-use deadline/i)
  })
  it('allows edits and cancellation only while a donation is available', () => {
    expect(() => assertDonationEditable('available')).not.toThrow()
    expect(() => assertDonationEditable('matched')).toThrow(/Only available donations/)
    expect(() => assertDonationEditable('cancelled')).toThrow(/Only available donations/)
  })
  it('rejects requests for unavailable or expired donations', () => {
    expect(() => assertDonationRequestable('available', new Date('2030-01-01T12:00:00Z'), now)).not.toThrow()
    expect(() => assertDonationRequestable('matched', new Date('2030-01-01T12:00:00Z'), now)).toThrow(/no longer available/i)
    expect(() => assertDonationRequestable('available', new Date('2029-12-31T12:00:00Z'), now)).toThrow(/no longer available/i)
  })
  it('allows only pending active requests to be approved or rejected', () => {
    expect(() => assertPendingRequest('pending', true)).not.toThrow()
    expect(() => assertPendingRequest('approved', false)).toThrow(/already been handled/i)
    expect(() => assertPendingRequest('pending', false)).toThrow(/already been handled/i)
  })
  it('approves only before another NGO claims the donation and permits rejection of a pending request', () => {
    expect(() => assertRequestDecision('pending',true,'available',new Date('2030-01-01T12:00:00Z'),'approve',now)).not.toThrow()
    expect(() => assertRequestDecision('pending',true,'matched',new Date('2030-01-01T12:00:00Z'),'approve',now)).toThrow(/no longer available/i)
    expect(() => assertRequestDecision('pending',true,'matched',new Date('2030-01-01T12:00:00Z'),'reject',now)).not.toThrow()
  })
  it('blocks a duplicate active NGO request', () => {
    expect(() => assertNoDuplicateRequest(null)).not.toThrow()
    expect(() => assertNoDuplicateRequest({ _id: 'existing' })).toThrow(/already has an active request/i)
  })
  it('atomically lets only one concurrent approval reserve an available donation', async () => {
    let status: 'available'|'matched' = 'available'
    const conditionalReserve = async () => { if (status !== 'available') return null; await Promise.resolve(); if (status !== 'available') return null; status = 'matched'; return { status } }
    const outcomes = await Promise.allSettled([reserveDonationAtomically(conditionalReserve), reserveDonationAtomically(conditionalReserve)])
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter(outcome => outcome.status === 'rejected')).toHaveLength(1)
    expect(status).toBe('matched')
  })
})
