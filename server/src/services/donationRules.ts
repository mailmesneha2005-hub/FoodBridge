import { AppError } from '../utils/AppError.js'

export function assertDonationDates(value: { preparationTime: Date; safeUseDeadline: Date; pickupWindow: { start: Date; end: Date } }, now = new Date()) {
  if (!(value.preparationTime instanceof Date) || Number.isNaN(value.preparationTime.getTime()) || !(value.safeUseDeadline instanceof Date) || Number.isNaN(value.safeUseDeadline.getTime()) || !(value.pickupWindow.start instanceof Date) || Number.isNaN(value.pickupWindow.start.getTime()) || !(value.pickupWindow.end instanceof Date) || Number.isNaN(value.pickupWindow.end.getTime())) throw new AppError(400, 'INVALID_DONATION_DATES', 'Enter valid preparation, safe-use and pickup dates.')
  if (value.safeUseDeadline <= now || value.safeUseDeadline <= value.preparationTime || value.pickupWindow.start < value.preparationTime || value.pickupWindow.end <= value.pickupWindow.start || value.pickupWindow.end > value.safeUseDeadline) throw new AppError(400, 'INVALID_DONATION_DATES', 'The safe-use deadline and pickup window must follow preparation time and remain within the food safety deadline.')
}

export function assertDonationEditable(status: string) { if (status !== 'available') throw new AppError(409, 'DONATION_LOCKED', 'Only available donations can be edited or cancelled.') }
export function assertDonationRequestable(status: string, deadline: Date, now = new Date()) { if (status !== 'available' || deadline <= now) throw new AppError(409, 'DONATION_UNAVAILABLE', 'This donation is no longer available or has passed its safe-use deadline.') }
export function assertPendingRequest(status: string, active: boolean) { if (status !== 'pending' || !active) throw new AppError(409, 'REQUEST_ALREADY_DECIDED', 'This request has already been handled.') }
export function assertRequestDecision(status: string, active: boolean, donationStatus: string, deadline: Date, decision: 'approve'|'reject', now = new Date()) { assertPendingRequest(status, active); if (decision === 'approve') assertDonationRequestable(donationStatus, deadline, now) }
export function assertAtomicReservation(result: unknown) { if (!result) throw new AppError(409, 'DONATION_UNAVAILABLE', 'Another request was approved first, or the donation has expired.') }
export async function reserveDonationAtomically<T>(reserve: () => Promise<T | null | undefined>): Promise<T> { const result = await reserve(); assertAtomicReservation(result); return result as T }
export function assertNoDuplicateRequest(existing: unknown) { if (existing) throw new AppError(409, 'DUPLICATE_REQUEST', 'Your organization already has an active request for this donation.') }
