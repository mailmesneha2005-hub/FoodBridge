import { describe, expect, it } from 'vitest'
import { assertAssignedVolunteer, claimPickupAtomically } from './pickupRules.js'
import { assertPickupTransition } from './workflow.js'

describe('volunteer pickup rules', () => {
  it('allows one task assignment and returns a conflict when the conditional claim loses', async () => {
    let assigned = false
    const claim = async () => { if (assigned) return null; assigned = true; return { assignmentStatus:'assigned' } }
    expect(await claimPickupAtomically(claim)).toEqual({assignmentStatus:'assigned'})
    await expect(claimPickupAtomically(claim)).rejects.toMatchObject({statusCode:409,code:'PICKUP_UNAVAILABLE'})
  })
  it('rejects pickup and delivery transitions that skip required steps', () => {
    expect(() => assertPickupTransition('unassigned','picked_up')).toThrow(/Cannot move/)
    expect(() => assertPickupTransition('assigned','delivered')).toThrow(/Cannot move/)
    expect(() => assertPickupTransition('assigned','picked_up')).not.toThrow()
    expect(() => assertPickupTransition('picked_up','delivered')).not.toThrow()
  })
  it('allows status confirmation only from the assigned volunteer', () => {
    expect(() => assertAssignedVolunteer('volunteer-1','volunteer-1')).not.toThrow()
    expect(() => assertAssignedVolunteer('volunteer-1','volunteer-2')).toThrow(/assigned to this pickup/)
    expect(() => assertAssignedVolunteer(null,'volunteer-1')).toThrow(/assigned to this pickup/)
  })
})
