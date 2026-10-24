import { AppError } from '../utils/AppError.js'

export type DonationState = 'available' | 'requested' | 'matched' | 'picked_up' | 'delivered' | 'cancelled' | 'expired'
const allowed: Record<DonationState, DonationState[]> = { available: ['requested','matched','cancelled','expired'], requested: ['matched','available','cancelled','expired'], matched: ['picked_up','cancelled'], picked_up: ['delivered'], delivered: [], cancelled: [], expired: [] }
export function assertDonationTransition(from: DonationState, to: DonationState) { if (!allowed[from].includes(to)) throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot move a donation from ${from} to ${to}.`) }
export function assertPickupTransition(from: string, to: string) { const transitions: Record<string,string[]> = { unassigned: ['assigned','cancelled'], assigned: ['picked_up','unassigned','cancelled'], picked_up: ['delivered'] }; if (!transitions[from]?.includes(to)) throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot move a pickup from ${from} to ${to}.`) }
