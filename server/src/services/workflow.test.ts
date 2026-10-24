import { describe, expect, it } from 'vitest'
import { assertDonationTransition, assertPickupTransition } from './workflow.js'

describe('workflow transitions', () => {
  it('allows expected donation progress', () => {
    expect(() => assertDonationTransition('available', 'requested')).not.toThrow()
    expect(() => assertDonationTransition('matched', 'picked_up')).not.toThrow()
  })
  it('rejects unsafe donation transitions', () => {
    expect(() => assertDonationTransition('delivered', 'available')).toThrow(/Cannot move/)
    expect(() => assertDonationTransition('cancelled', 'matched')).toThrow(/Cannot move/)
  })
  it('requires an assigned pickup before pickup or delivery', () => {
    expect(() => assertPickupTransition('unassigned', 'picked_up')).toThrow(/Cannot move/)
    expect(() => assertPickupTransition('assigned', 'picked_up')).not.toThrow()
    expect(() => assertPickupTransition('picked_up', 'delivered')).not.toThrow()
  })
})
