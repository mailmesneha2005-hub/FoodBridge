import type { Request, Response } from 'express'
import { Donation } from '../models/Donation.js'
import { DonationRequest } from '../models/DonationRequest.js'
import { PickupTask } from '../models/PickupTask.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { NGOProfile } from '../models/NGOProfile.js'
import { databaseIsReady } from '../config/database.js'
import { env } from '../config/env.js'
import { forbidden, notFound } from '../utils/AppError.js'
import { paginationMeta, sortObject } from '../utils/pagination.js'
import * as service from '../services/api.js'
import { createDonationUploadSignature } from '../config/cloudinary.js'
import { publishToUser } from '../realtime/socket.js'

const data = (res: Response, value: unknown, status=200) => res.status(status).json({ data: value })
const list = async (req: Request, res: Response, model: any, filter: any = {}) => { const page=Number(req.query.page)||1, limit=Math.min(Number(req.query.limit)||20,100), sort=String(req.query.sort||'-createdAt'); const [items,total]=await Promise.all([model.find(filter).sort(sortObject(sort)).skip((page-1)*limit).limit(limit).lean(),model.countDocuments(filter)]); res.json({data:items,meta:paginationMeta(page,limit,total)}) }
const requestList = async (req: Request, res: Response, filter: any) => { const page=Number(req.query.page)||1, limit=Math.min(Number(req.query.limit)||20,100), sort=String(req.query.sort||'-createdAt'); const [items,total]=await Promise.all([DonationRequest.find(filter).populate('donationId').populate('ngoId','displayName email').sort(sortObject(sort)).skip((page-1)*limit).limit(limit).lean(),DonationRequest.countDocuments(filter)]); res.json({data:items,meta:paginationMeta(page,limit,total)}) }
const pickupList = async (req: Request, res: Response, filter: any) => { const page=Number(req.query.page)||1, limit=Math.min(Number(req.query.limit)||20,100), sort=String(req.query.sort||'-createdAt'); const [items,total]=await Promise.all([PickupTask.find(filter).populate('donationId').populate({path:'approvedRequestId',populate:{path:'ngoId',select:'displayName email'}}).sort(sortObject(sort)).skip((page-1)*limit).limit(limit).lean(),PickupTask.countDocuments(filter)]); res.json({data:items,meta:paginationMeta(page,limit,total)}) }
const me = (req: Request) => service.actor(req)
const routeId = (req: Request, name='id') => String(req.params[name])

export const health = (_req: Request,res: Response) => { const connected=databaseIsReady(); const configured=Boolean(env.MONGODB_URI); res.status(connected?200:503).json({ data:{ service:'foodbridge-api', status:connected?'ok':'degraded', database:connected?'connected':configured?'disconnected':'not-configured', timestamp:new Date().toISOString() } }) }
export const getMe = async (req: Request,res: Response) => data(res,await User.findById(me(req)).select('-__v'))
export const patchMe = async (req: Request,res: Response) => data(res,await service.updateMe(me(req),req.body))
export const putVolunteerRole = async (req: Request,res: Response) => data(res,await service.enrollVolunteer(me(req)))
export const getNgoProfile = async (req: Request,res: Response) => { const profile=await NGOProfile.findOne({userId:me(req)}); if(!profile) throw notFound('NGO profile not found.'); data(res,profile) }
export const putNgoProfile = async (req: Request,res: Response) => data(res,await service.saveNgoProfile(me(req),req.body))
export const getDonations = async (req: Request,res: Response) => {
  const q=req.query, page=Number(q.page)||1, limit=Math.min(Number(q.limit)||20,100), filter: any={status:q.status || 'available', safeUseDeadline: { $gt: new Date() }}
  if(q.category) filter.category=q.category
  if(q.city) filter['address.city']=new RegExp(String(q.city).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i')
  if(q.deadlineBefore) filter.safeUseDeadline={ ...filter.safeUseDeadline, $lte: new Date(String(q.deadlineBefore)) }
  if(q.search) filter.$text={$search:String(q.search)}
  if(q.latitude !== undefined && q.longitude !== undefined) {
    const radiusKm = Number(q.radiusKm) || 50
    const [result] = await Donation.aggregate([{ $geoNear: { near: { type:'Point', coordinates:[Number(q.longitude),Number(q.latitude)] }, key:'location', distanceField:'distanceMeters', maxDistance:radiusKm*1000, spherical:true, query:filter } }, { $sort: sortObject(String(q.sort||'-createdAt')) }, { $facet: { items:[{ $skip:(page-1)*limit },{ $limit:limit }], total:[{ $count:'count' }] } }])
    return res.json({data:result?.items||[],meta:paginationMeta(page,limit,result?.total?.[0]?.count||0)})
  }
  await list(req,res,Donation,filter)
}
export const getDonation = async (req: Request,res: Response) => { const item=await Donation.findById(routeId(req)).lean(); if(!item) throw notFound('Donation not found.'); data(res,item) }
export const postDonation = async (req: Request,res: Response) => data(res,await service.createDonation(me(req),req.body),201)
export const postDonationUploadSignature = async (req: Request,res: Response) => data(res,createDonationUploadSignature(req.authUser!.firebaseUid,req.body))
export const patchDonation = async (req: Request,res: Response) => data(res,await service.updateDonation(me(req),routeId(req),req.body))
export const deleteDonation = async (req: Request,res: Response) => data(res,await service.updateDonation(me(req),routeId(req),{},true))
export const getNgoRequests = async (req: Request,res: Response) => requestList(req,res,{ngoId:me(req)})
export const postNgoRequest = async (req: Request,res: Response) => data(res,await service.requestDonation(me(req),routeId(req,'donationId'),req.body.message),201)
export const postCancelRequest = async (req: Request,res: Response) => data(res,await service.cancelRequest(me(req),routeId(req)))
export const getDonorRequests = async (req: Request,res: Response) => { const donations=await Donation.find({donorId:me(req)}).distinct('_id'); await requestList(req,res,{donationId:{$in:donations}}) }
export const getDonorDonations = async (req: Request,res: Response) => { const q=req.query; const filter: any={donorId:me(req)}; if(q.status) filter.status=q.status; if(q.category) filter.category=q.category; if(q.city) filter['address.city']=new RegExp(String(q.city).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'); if(q.deadlineBefore) filter.safeUseDeadline={ $lte:new Date(String(q.deadlineBefore)) }; if(q.search) filter.$text={$search:String(q.search)}; await list(req,res,Donation,filter) }
export const getDonorSummary = async (req: Request,res: Response) => { const ids=await Donation.find({donorId:me(req)}).distinct('_id'); const [availableDonations,completedHandoffs,requestsToReview]=await Promise.all([Donation.countDocuments({donorId:me(req),status:'available'}),Donation.countDocuments({donorId:me(req),status:'delivered'}),DonationRequest.countDocuments({donationId:{$in:ids},status:'pending',active:true})]); data(res,{availableDonations,completedHandoffs,requestsToReview}) }
export const getNgoSummary = async (req: Request,res: Response) => { const [availableFoodOffers,openRequests,approvedPickups]=await Promise.all([Donation.countDocuments({status:'available',safeUseDeadline:{$gt:new Date()}}),DonationRequest.countDocuments({ngoId:me(req),status:'pending',active:true}),DonationRequest.countDocuments({ngoId:me(req),status:'approved'})]); data(res,{availableFoodOffers,openRequests,approvedPickups}) }
export const patchDecision = async (req: Request,res: Response) => data(res,await service.decideRequest(me(req),routeId(req),req.body.decision))
export const getPickups = async (req: Request,res: Response) => {
  const role=req.authUser?.role
  let filter: any={}
  if(role==='volunteer') { const allowed: any={$or:[{assignmentStatus:'unassigned'},{volunteerId:me(req)}]}; filter=req.query.status?{$and:[allowed,{assignmentStatus:req.query.status}]}:allowed }
  else if(role==='ngo') { const requests=await DonationRequest.find({ngoId:me(req),status:'approved'}).distinct('_id'); filter={approvedRequestId:{$in:requests}} }
  else if(role==='donor') { const donations=await Donation.find({donorId:me(req)}).distinct('_id'); filter={donationId:{$in:donations}} }
  if(req.query.status && role!=='volunteer') filter.assignmentStatus=req.query.status
  await pickupList(req,res,filter)
}
export const postClaimPickup = async (req: Request,res: Response) => data(res,await service.claimPickup(me(req),routeId(req)),200)
export const patchPickup = async (req: Request,res: Response) => data(res,await service.pickupAction(me(req),routeId(req),'picked_up'))
export const patchDelivery = async (req: Request,res: Response) => data(res,await service.pickupAction(me(req),routeId(req),'delivered',req.body.note))
export const getNotifications = async (req: Request,res: Response) => { const filter: any={recipientId:me(req)}; if(req.query.unread==='true') filter.read=false; if(req.query.unread==='false') filter.read=true; await list(req,res,Notification,filter) }
export const patchNotificationRead = async (req: Request,res: Response) => { const n=await Notification.findOneAndUpdate({_id:routeId(req),recipientId:me(req)},{$set:{read:true,readAt:new Date()}},{new:true}); if(!n) throw notFound('Notification not found.'); publishToUser(me(req),'notifications:refresh'); data(res,n) }
export const patchReadAll = async (req: Request,res: Response) => { const result=await Notification.updateMany({recipientId:me(req),read:false},{$set:{read:true,readAt:new Date()}}); publishToUser(me(req),'notifications:refresh'); data(res,{modifiedCount:result.modifiedCount}) }
export const getVerifications = async (req: Request,res: Response) => list(req,res,NGOProfile,{verificationStatus:'pending'})
export const patchVerification = async (req: Request,res: Response) => data(res,await service.decideVerification(me(req),routeId(req),req.body.decision))
export const getAnalytics = async (_req: Request,res: Response) => { const [donations,byStatus,users,ngos,delivered]=await Promise.all([Donation.countDocuments(),Donation.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),User.countDocuments(),NGOProfile.countDocuments({verificationStatus:'approved'}),Donation.countDocuments({status:'delivered'})]); data(res,{donations,users,verifiedNgos:ngos,deliveredDonations:delivered,donationsByStatus:byStatus}) }
export const removeDonationRequest = async (req: Request,res: Response) => { const donation=await Donation.findById(routeId(req)); if(!donation) throw notFound('Donation not found.'); if(donation.donorId.toString()!==me(req)) throw forbidden(); data(res,{requests:await DonationRequest.find({donationId:donation._id}).sort('-createdAt')}) }
export const getAdminUsers = async (req: Request,res: Response) => list(req,res,User,{})
export const getAdminDonations = async (req: Request,res: Response) => list(req,res,Donation,req.query.status?{status:req.query.status}:{})
