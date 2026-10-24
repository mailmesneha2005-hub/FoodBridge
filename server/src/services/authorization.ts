import { AppError, forbidden } from '../utils/AppError.js'

export function assertRecordOwner(actorId: string, ownerId: string) {
  if (actorId !== ownerId) throw forbidden('You can only access your own records.')
}

export function assertCanApproveNgo(adminId: string, ngoUserId: string) {
  if (adminId === ngoUserId) throw forbidden('An administrator cannot approve their own NGO profile.')
}

export function assertAllowedInitialAdminBootstrap(hasExistingAdmin: boolean) {
  if (hasExistingAdmin) throw new AppError(409, 'ADMIN_ALREADY_BOOTSTRAPPED', 'An administrator already exists; use the controlled admin management process instead.')
}

export function assertVolunteerEnrollment(currentRole: string, accountStatus: string) {
  if (accountStatus !== 'active' || !['donor', 'volunteer'].includes(currentRole)) throw new AppError(403, 'ROLE_ENROLLMENT_DENIED', 'This account cannot enroll as a volunteer.')
}

export function assertNgoEnrollment(currentRole: string, accountStatus: string) {
  // NGO enrollment is self-service, but only a donor may apply and an NGO may
  // resume its pending application. This prevents role-switch endpoints from
  // demoting administrators, volunteers, suspended users, or verified NGOs.
  if ((currentRole === 'donor' && accountStatus === 'active') || (currentRole === 'ngo' && accountStatus === 'pending')) return
  throw new AppError(403, 'ROLE_ENROLLMENT_DENIED', 'This account cannot submit or resume an NGO application.')
}

export function assertEligibleNgoRequest(verificationStatus: string | undefined, accountStatus: string) {
  if (verificationStatus !== 'approved' || accountStatus !== 'active') throw forbidden('Your NGO must be verified before requesting food.')
}

export function assertActiveRole(actualRole: string, accountStatus: string, expectedRole: string) {
  if (actualRole !== expectedRole || accountStatus !== 'active') throw forbidden(`An active ${expectedRole} account is required for this action.`)
}
