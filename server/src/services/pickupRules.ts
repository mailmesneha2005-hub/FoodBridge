import { AppError, forbidden } from '../utils/AppError.js'

export async function claimPickupAtomically<T>(claim: () => Promise<T|null|undefined>): Promise<T> {
  const task = await claim()
  if (!task) throw new AppError(409,'PICKUP_UNAVAILABLE','This pickup has already been assigned or is unavailable.')
  return task
}

export function assertAssignedVolunteer(assignedVolunteerId: string|null|undefined, actorId: string) {
  if (!assignedVolunteerId || assignedVolunteerId !== actorId) throw forbidden('Only the volunteer assigned to this pickup can confirm its status.')
}
