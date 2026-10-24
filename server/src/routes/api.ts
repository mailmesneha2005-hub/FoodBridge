import { Router } from 'express'
import * as controller from '../controllers/api.js'
import { authenticate } from '../middleware/authenticate.js'
import { requireDatabase } from '../middleware/requireDatabase.js'
import { requireRole } from '../middleware/requireRole.js'
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { decisionInput, donationInput, donationPatch, donationParams, idParams, listQuery, ngoProfileInput, pickupInput, requestInput, uploadSignatureInput, userUpdate, verificationInput } from '../validators/schemas.js'

export const apiRouter = Router()
const c = new Proxy(controller, { get(target, property: keyof typeof controller) { const handler = target[property]; return typeof handler === 'function' ? asyncHandler(handler as any) : handler } })
apiRouter.get('/health', c.health)
apiRouter.use(requireDatabase, authenticate)

apiRouter.get('/users/me', c.getMe)
apiRouter.patch('/users/me', validateBody(userUpdate), c.patchMe)
apiRouter.put('/users/me/volunteer', c.putVolunteerRole)
apiRouter.get('/users/me/ngo-profile', requireRole('ngo','admin'), c.getNgoProfile)
apiRouter.put('/users/me/ngo-profile', validateBody(ngoProfileInput), c.putNgoProfile)

apiRouter.get('/donations', validateQuery(listQuery), c.getDonations)
apiRouter.get('/donor/donations', requireRole('donor'), validateQuery(listQuery), c.getDonorDonations)
apiRouter.get('/donor/summary', requireRole('donor'), c.getDonorSummary)
apiRouter.post('/donations', requireRole('donor'), validateBody(donationInput), c.postDonation)
apiRouter.post('/donations/image-upload-signature', requireRole('donor'), validateBody(uploadSignatureInput), c.postDonationUploadSignature)
apiRouter.get('/donations/:id', validateParams(idParams), c.getDonation)
apiRouter.patch('/donations/:id', requireRole('donor'), validateParams(idParams), validateBody(donationPatch), c.patchDonation)
apiRouter.delete('/donations/:id', requireRole('donor'), validateParams(idParams), c.deleteDonation)

apiRouter.get('/ngo/requests', requireRole('ngo'), validateQuery(listQuery), c.getNgoRequests)
apiRouter.get('/ngo/summary', requireRole('ngo'), c.getNgoSummary)
apiRouter.post('/ngo/donations/:donationId/requests', requireRole('ngo'), validateParams(donationParams), validateBody(requestInput), c.postNgoRequest)
apiRouter.patch('/ngo/requests/:id/cancel', requireRole('ngo'), validateParams(idParams), c.postCancelRequest)
apiRouter.get('/donor/requests', requireRole('donor'), validateQuery(listQuery), c.getDonorRequests)
apiRouter.get('/donor/donations/:id/requests', requireRole('donor'), validateParams(idParams), c.removeDonationRequest)
apiRouter.patch('/donor/requests/:id/decision', requireRole('donor'), validateParams(idParams), validateBody(decisionInput), c.patchDecision)

apiRouter.get('/pickups', requireRole('volunteer','ngo','donor','admin'), validateQuery(listQuery), c.getPickups)
apiRouter.post('/pickups/:id/claim', requireRole('volunteer'), validateParams(idParams), c.postClaimPickup)
apiRouter.patch('/pickups/:id/pickup', requireRole('volunteer'), validateParams(idParams), c.patchPickup)
apiRouter.patch('/pickups/:id/deliver', requireRole('volunteer'), validateParams(idParams), validateBody(pickupInput), c.patchDelivery)

apiRouter.get('/notifications', validateQuery(listQuery), c.getNotifications)
apiRouter.patch('/notifications/read-all', c.patchReadAll)
apiRouter.patch('/notifications/:id/read', validateParams(idParams), c.patchNotificationRead)

apiRouter.get('/admin/verifications', requireRole('admin'), validateQuery(listQuery), c.getVerifications)
apiRouter.patch('/admin/verifications/:id/decision', requireRole('admin'), validateParams(idParams), validateBody(verificationInput), c.patchVerification)
apiRouter.get('/admin/users', requireRole('admin'), validateQuery(listQuery), c.getAdminUsers)
apiRouter.get('/admin/donations', requireRole('admin'), validateQuery(listQuery), c.getAdminDonations)
apiRouter.get('/admin/analytics', requireRole('admin'), c.getAnalytics)
