import mongoose, { Types } from 'mongoose'
import { User } from '../models/User.js'
import { NGOProfile } from '../models/NGOProfile.js'
import { Donation } from '../models/Donation.js'
import { DonationRequest } from '../models/DonationRequest.js'
import { PickupTask } from '../models/PickupTask.js'
import { Notification } from '../models/Notification.js'
import { AuditLog } from '../models/AuditLog.js'
import { AppError, forbidden, notFound } from '../utils/AppError.js'
import { assertDonationTransition, assertPickupTransition } from './workflow.js'
import { assertActiveRole, assertCanApproveNgo, assertEligibleNgoRequest, assertNgoEnrollment, assertRecordOwner, assertVolunteerEnrollment } from './authorization.js'
import { assertDonationDates, assertDonationEditable, assertDonationRequestable, assertNoDuplicateRequest, assertRequestDecision, reserveDonationAtomically } from './donationRules.js'
import { assertDonationImage } from '../config/cloudinary.js'
import { publishToRole, publishToUser } from '../realtime/socket.js'
import { assertAssignedVolunteer, claimPickupAtomically } from './pickupRules.js'

const oid = (id: string) => new Types.ObjectId(id)
const audit = (actorId: string, action: string, entityType: string, entityId: any, metadata?: Record<string, unknown>) => AuditLog.create({ actorId: oid(actorId), action, entityType, entityId, metadata })
const notify = async (recipientId: any, type: string, message: string, entityType: string, entityId: any) => { const notification = await Notification.create({ recipientId, type, message, entityType, entityId }); publishToUser(String(recipientId), 'notifications:refresh'); return notification }
export function actor(req: { authUser?: { id: string } }) { if (!req.authUser) throw new AppError(401,'UNAUTHORIZED','Authentication is required.'); return req.authUser.id }

export async function updateMe(userId: string, input: Record<string, any>) {
  const user = await User.findByIdAndUpdate(userId, { $set: input }, { new: true, runValidators: true }).select('-__v')
  if (!user) throw notFound('FoodBridge profile was not found. Retry account setup or contact support.')
  return user
}
export async function enrollVolunteer(userId: string) {
  const user = await User.findById(userId)
  if (!user) throw notFound('User not found.')
  assertVolunteerEnrollment(user.role, user.accountStatus)
  user.role = 'volunteer'
  await user.save()
  return user
}
export async function saveNgoProfile(userId: string, input: Record<string, any>) {
  const user = await User.findById(userId)
  if (!user) throw notFound('User not found.')
  assertNgoEnrollment(user.role, user.accountStatus)
  // Recheck the allowed role/status in the write predicate to avoid a role
  // change race between loading the profile and saving the NGO application.
  const enrolled = await User.findOneAndUpdate(
    { _id: userId, $or: [{ role: 'donor', accountStatus: 'active' }, { role: 'ngo', accountStatus: 'pending' }] },
    { $set: { role: 'ngo', accountStatus: 'pending' } },
    { new: true },
  )
  if (!enrolled) throw forbidden('This account cannot submit or resume an NGO application.')
  const profile = await NGOProfile.findOneAndUpdate({ userId }, { $set: { ...input, verificationStatus: 'pending', verifiedBy: null, verifiedAt: null } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true })
  return profile
}
export async function createDonation(userId: string, input: Record<string, any>) {
  const actor = await User.findById(userId)
  if (!actor) throw forbidden()
  assertActiveRole(actor.role, actor.accountStatus, 'donor')
  assertDonationDates(input as { preparationTime: Date; safeUseDeadline: Date; pickupWindow: { start: Date; end: Date } })
  await assertDonationImage(actor.firebaseUid, input.imagePublicId, input.imageUrl)
  const data: Record<string, any> = { ...input, donorId: oid(userId) }
  if (input.coordinates) { data.location = { type: 'Point', coordinates: input.coordinates }; delete data.coordinates }
  const donation = await Donation.create(data)
  await audit(userId,'donation.created','Donation',donation._id)
  return donation
}
export async function updateDonation(userId: string, id: string, input: Record<string, any>, remove = false) {
  const [donation, actor] = await Promise.all([Donation.findById(id), User.findById(userId)]); if (!donation) throw notFound('Donation not found.')
  if (!actor) throw forbidden()
  assertActiveRole(actor.role, actor.accountStatus, 'donor')
  assertRecordOwner(userId, donation.donorId.toString())
  assertDonationEditable(donation.status)
  if (remove) {
    const session = await mongoose.startSession()
    let recipients = new Set<string>()
    try { await session.withTransaction(async () => {
      const cancelled = await Donation.findOneAndUpdate({ _id: donation._id, donorId: oid(userId), status: 'available' }, { $set: { status: 'cancelled' } }, { new: true, session })
      if (!cancelled) throw new AppError(409,'DONATION_LOCKED','This donation is no longer available to cancel.')
      const activeRequests = await DonationRequest.find({ donationId: donation._id, status: 'pending', active: true }).session(session)
      recipients = new Set(activeRequests.map(request => request.ngoId.toString()))
      await DonationRequest.updateMany({ donationId: donation._id, status: 'pending', active: true }, { $set: { status: 'cancelled', active: false, cancelledAt: new Date(), cancelledBy: oid(userId) } }, { session })
      if (activeRequests.length) await Notification.create(activeRequests.map(request => ({ recipientId: request.ngoId, type: 'request_decision', message: 'This donation was cancelled by the donor.', entityType: 'DonationRequest', entityId: request._id })), { session })
      await AuditLog.create([{ actorId: oid(userId), action: 'donation.cancelled', entityType: 'Donation', entityId: donation._id }], { session })
    }); for (const recipientId of recipients) publishToUser(recipientId,'notifications:refresh') } finally { await session.endSession() }
    return Donation.findById(id)
  }
  const merged = { preparationTime: input.preparationTime ?? donation.preparationTime, safeUseDeadline: input.safeUseDeadline ?? donation.safeUseDeadline, pickupWindow: input.pickupWindow ?? donation.pickupWindow }
  assertDonationDates(merged)
  await assertDonationImage(actor.firebaseUid, input.imagePublicId ?? donation.imagePublicId, input.imageUrl ?? donation.imageUrl)
  Object.assign(donation, input); if (input.coordinates) donation.location = { type: 'Point', coordinates: input.coordinates }; await donation.save(); await audit(userId,'donation.updated','Donation',donation._id); return donation
}
export async function requestDonation(userId: string, donationId: string, message?: string) {
  const [profile, user] = await Promise.all([NGOProfile.findOne({ userId }), User.findById(userId)])
  if (!user || user.role !== 'ngo') throw forbidden('Your NGO must be verified before requesting food.')
  assertEligibleNgoRequest(profile?.verificationStatus, user.accountStatus)
  const session = await mongoose.startSession()
  try {
    let result: any, donorId = ''
    await session.withTransaction(async () => {
      // This harmless write serializes request creation with approval/cancellation on the donation document.
      const donation = await Donation.findOneAndUpdate({ _id: donationId, status: 'available', claimedByNgoId: null, safeUseDeadline: { $gt: new Date() } }, { $inc: { requestRevision: 1 } }, { new: true, session })
      if (!donation) throw new AppError(409,'DONATION_UNAVAILABLE','This donation is no longer available or has expired.')
      donorId = donation.donorId.toString()
      assertDonationRequestable(donation.status, donation.safeUseDeadline)
      assertNoDuplicateRequest(await DonationRequest.findOne({ donationId: donation._id, ngoId: oid(userId), status: 'pending', active: true }).session(session))
      const [request] = await DonationRequest.create([{ donationId: donation._id, ngoId: oid(userId), message, status: 'pending', active: true }], { session })
      await Notification.create([{ recipientId: donation.donorId, type: 'donation_request', message: 'An NGO requested your donation.', entityType: 'DonationRequest', entityId: request._id }], { session })
      await AuditLog.create([{ actorId: oid(userId), action: 'request.created', entityType: 'DonationRequest', entityId: request._id }], { session })
      result = request
    })
    publishToUser(donorId, 'notifications:refresh')
    return result
  } catch (error) {
    if ((error as any)?.code === 11000) throw new AppError(409,'DUPLICATE_REQUEST','Your organization already has an active request for this donation.')
    throw error
  } finally { await session.endSession() }
}
export async function decideRequest(userId: string, requestId: string, decision: 'approve'|'reject') {
  const request = await DonationRequest.findById(requestId); if (!request) throw notFound('Request not found.')
  const donation = await Donation.findById(request.donationId); if (!donation) throw notFound('Donation not found.')
  const actor = await User.findById(userId); if (!actor) throw forbidden()
  assertActiveRole(actor.role, actor.accountStatus, 'donor')
  if (donation.donorId.toString() !== userId) throw forbidden('Only the donor can decide this request.')
  assertRequestDecision(request.status, request.active, donation.status, donation.safeUseDeadline, decision)
  const session = await mongoose.startSession()
  try { let result: any, recipients = new Set<string>(), taskId = ''; await session.withTransaction(async () => {
    const now = new Date()
    if (decision === 'approve') {
      assertDonationTransition(donation.status, 'matched')
      await reserveDonationAtomically(() => Donation.findOneAndUpdate({ _id: donation._id, status: 'available', claimedByNgoId: null, safeUseDeadline: { $gt: now } }, { $set: { status: 'matched', claimedByNgoId: request.ngoId } }, { new: true, session }))
    }
    const updated = await DonationRequest.findOneAndUpdate({ _id: requestId, status: 'pending', active: true }, { $set: { status: decision === 'approve' ? 'approved' : 'rejected', decidedAt: now, decidedBy: oid(userId), active: false } }, { new: true, session })
    if (!updated) throw new AppError(409,'REQUEST_ALREADY_DECIDED','This request has already been handled.')
    if (decision === 'approve') {
      const [task] = await PickupTask.create([{ donationId: donation._id, approvedRequestId: updated._id, assignmentStatus: 'unassigned' }], { session })
      taskId = task._id.toString()
      await Notification.create([{ recipientId: donation.donorId, type: 'pickup_update', message: 'An organization accepted your donation. A volunteer can now claim the pickup.', entityType: 'PickupTask', entityId: task._id }], { session })
      const otherRequests = await DonationRequest.find({ donationId: donation._id, _id: { $ne: updated._id }, status: 'pending', active: true }).session(session)
      recipients = new Set(otherRequests.map(other => other.ngoId.toString()))
      recipients.add(request.ngoId.toString()); recipients.add(donation.donorId.toString())
      await DonationRequest.updateMany({ donationId: donation._id, _id: { $ne: updated._id }, status: 'pending', active: true }, { $set: { status: 'rejected', active: false, decidedAt: now, decidedBy: oid(userId) } }, { session })
      if (otherRequests.length) await Notification.create(otherRequests.map(other => ({ recipientId: other.ngoId, type: 'request_decision', message: 'This donation was approved for another organization.', entityType: 'DonationRequest', entityId: other._id })), { session })
    }
    recipients.add(request.ngoId.toString())
    await Notification.create([{ recipientId: request.ngoId, type: 'request_decision', message: `Your donation request was ${decision === 'approve' ? 'approved' : 'declined'}.`, entityType: 'DonationRequest', entityId: request._id }], { session })
    await AuditLog.create([{ actorId: oid(userId), action: `request.${decision}d`, entityType: 'DonationRequest', entityId: request._id }], { session }); result = updated
  }); for (const recipientId of recipients) publishToUser(recipientId,'notifications:refresh'); if (decision === 'approve') publishToRole('volunteer','pickup:available',{taskId}); return result } finally { await session.endSession() }
}
export async function cancelRequest(userId: string, id: string) {
 const actor = await User.findById(userId); if (!actor) throw forbidden()
 assertActiveRole(actor.role, actor.accountStatus, 'ngo')
 const session=await mongoose.startSession(); let result:any, donorId=''
 try { await session.withTransaction(async()=>{
   const req=await DonationRequest.findOneAndUpdate({_id:id,ngoId:oid(userId),status:'pending',active:true},{$set:{status:'cancelled',active:false,cancelledAt:new Date(),cancelledBy:oid(userId)}},{new:true,session})
   if(!req) throw new AppError(409,'REQUEST_ALREADY_DECIDED','This request is no longer active.')
   const donation=await Donation.findById(req.donationId).session(session)
   if(donation) { donorId=donation.donorId.toString(); await Notification.create([{recipientId:donation.donorId,type:'donation_request',message:'An NGO withdrew its request for your donation.',entityType:'DonationRequest',entityId:req._id}],{session}) }
   await AuditLog.create([{actorId:oid(userId),action:'request.cancelled',entityType:'DonationRequest',entityId:req._id}],{session}); result=req
 }); if(donorId){publishToUser(donorId,'notifications:refresh');publishToUser(donorId,'donation:requests-updated')} } finally { await session.endSession() }
 return result
}
export async function claimPickup(userId: string, id: string) {
 const actor = await User.findById(userId); if (!actor) throw forbidden()
 assertActiveRole(actor.role, actor.accountStatus, 'volunteer')
 const session = await mongoose.startSession()
 let task: any, recipients = new Set<string>()
 try { await session.withTransaction(async () => {
   const now = new Date()
   task = await claimPickupAtomically(() => PickupTask.findOneAndUpdate({ _id:id, assignmentStatus:'unassigned', volunteerId:null }, { $set:{ assignmentStatus:'assigned', volunteerId:oid(userId), assignedBy:oid(userId), assignedAt:now } }, { new:true, session }))
   const [donation, request] = await Promise.all([Donation.findById(task.donationId).session(session),DonationRequest.findById(task.approvedRequestId).session(session)])
   if (!donation || !request || request.status !== 'approved') throw new AppError(409,'PICKUP_UNAVAILABLE','This pickup is no longer attached to an approved donation request.')
   if (donation.status !== 'matched' || donation.safeUseDeadline <= now || donation.pickupWindow.end <= now) throw new AppError(409,'PICKUP_EXPIRED','This pickup has passed its food safety deadline or collection window.')
   recipients = new Set([donation.donorId.toString(), request.ngoId.toString()])
   await Notification.create([{ recipientId:donation.donorId, type:'pickup_assigned', message:'A volunteer accepted your donation pickup.', entityType:'PickupTask', entityId:task._id },{ recipientId:request.ngoId, type:'pickup_assigned', message:'A volunteer accepted your organization’s pickup.', entityType:'PickupTask', entityId:task._id }],{session})
   await AuditLog.create([{ actorId:oid(userId), action:'pickup.claimed', entityType:'PickupTask', entityId:task._id }],{session})
 }); for(const recipientId of recipients) { publishToUser(recipientId,'notifications:refresh'); publishToUser(recipientId,'pickup:updated',{taskId:id,status:'assigned'}) }; publishToUser(userId,'pickup:updated',{taskId:id,status:'assigned'}); publishToRole('volunteer','pickup:updated',{taskId:id,status:'assigned'}) } finally { await session.endSession() }
 return task
}
export async function pickupAction(userId: string, id: string, action: 'picked_up'|'delivered', note?: string) {
 const task = await PickupTask.findById(id); if (!task) throw notFound('Pickup task not found.')
 const actor = await User.findById(userId); if (!actor) throw forbidden()
 assertActiveRole(actor.role, actor.accountStatus, 'volunteer')
 assertAssignedVolunteer(task.volunteerId?.toString(), userId)
 const target = action; assertPickupTransition(task.assignmentStatus,target)
 if (action === 'picked_up') {
   const donation = await Donation.findById(task.donationId)
   if (!donation || donation.safeUseDeadline <= new Date() || donation.pickupWindow.end <= new Date()) throw new AppError(409,'PICKUP_EXPIRED','This pickup has passed its food safety deadline or collection window.')
 }
 const session = await mongoose.startSession(); let recipients = new Set<string>(), updatedTask: any
 try { await session.withTransaction(async () => {
  const now = new Date()
  const updated = await PickupTask.findOneAndUpdate({ _id:id, volunteerId:oid(userId), assignmentStatus:task.assignmentStatus }, { $set: action==='picked_up' ? { assignmentStatus: action, pickedUpAt:now, pickedUpBy:oid(userId) } : { assignmentStatus: action, deliveredAt:now, deliveredBy:oid(userId), deliveryConfirmation:{ confirmedBy:oid(userId), note, confirmedAt:now } } }, { new:true, session })
  if (!updated) throw new AppError(409,'PICKUP_UPDATED','Pickup status changed. Refresh and try again.')
  const donationStatus = action; assertDonationTransition(action==='picked_up'?'matched':'picked_up',donationStatus)
  const donationFilter: Record<string, any> = { _id:task.donationId, status: action==='picked_up'?'matched':'picked_up' }
  if (action === 'picked_up') { donationFilter.safeUseDeadline={ $gt:now }; donationFilter['pickupWindow.end']={ $gt:now } }
  const donation = await Donation.findOneAndUpdate(donationFilter, { $set:{ status:donationStatus } }, { new:true, session })
  if (!donation) throw new AppError(409,'DONATION_STATUS_CHANGED','Donation status changed unexpectedly.')
  const request = await DonationRequest.findById(task.approvedRequestId).session(session)
  if (!request || request.status !== 'approved') throw new AppError(409,'PICKUP_REQUEST_INVALID','This pickup no longer has an approved request.')
  recipients = new Set([donation.donorId.toString(),request.ngoId.toString()])
  const message = action==='picked_up' ? 'The volunteer confirmed food pickup.' : 'The volunteer confirmed food delivery. The donation is complete.'
  await Notification.create([{ recipientId:donation.donorId, type:'pickup_update', message, entityType:'PickupTask', entityId:task._id },{ recipientId:request.ngoId, type:'pickup_update', message, entityType:'PickupTask', entityId:task._id }], { session })
  if (action==='delivered') await DonationRequest.updateOne({ _id:task.approvedRequestId }, { $set:{ active:false } }, { session })
  await AuditLog.create([{ actorId:oid(userId), action:`pickup.${action}`, entityType:'PickupTask', entityId:task._id }], { session })
  updatedTask = updated
 }); for(const recipientId of recipients) { publishToUser(recipientId,'notifications:refresh'); publishToUser(recipientId,'pickup:updated',{taskId:id,status:action}) }; publishToUser(userId,'pickup:updated',{taskId:id,status:action}); publishToRole('volunteer','pickup:updated',{taskId:id,status:action}) } finally { await session.endSession() }
 return updatedTask
}
export async function decideVerification(adminId: string, profileId: string, decision:'approve'|'reject') {
 const profile = await NGOProfile.findById(profileId); if (!profile) throw notFound('NGO profile not found.')
 const actor = await User.findById(adminId); if (!actor) throw forbidden()
 assertActiveRole(actor.role, actor.accountStatus, 'admin')
 assertCanApproveNgo(adminId, profile.userId.toString())
 if (profile.verificationStatus!=='pending') throw new AppError(409,'VERIFICATION_DECIDED','This profile has already been reviewed.')
 profile.verificationStatus=decision==='approve'?'approved':'rejected'; profile.verifiedBy=oid(adminId) as any; profile.verifiedAt=new Date(); await profile.save()
 await User.findByIdAndUpdate(profile.userId,{ role:'ngo', accountStatus:decision==='approve'?'active':'pending' })
 await Promise.all([notify(profile.userId,'verification_update',`Your NGO verification was ${decision==='approve'?'approved':'not approved'}.`,'NGOProfile',profile._id),audit(adminId,`ngo.${decision}`, 'NGOProfile',profile._id)])
 return profile
}
