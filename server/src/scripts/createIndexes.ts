import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { AuditLog } from '../models/AuditLog.js'
import { Donation } from '../models/Donation.js'
import { DonationRequest } from '../models/DonationRequest.js'
import { NGOProfile } from '../models/NGOProfile.js'
import { Notification } from '../models/Notification.js'
import { PickupTask } from '../models/PickupTask.js'
import { User } from '../models/User.js'

if (!env.MONGODB_URI) throw new Error('Set MONGODB_URI before creating database indexes.')

mongoose.set('autoIndex', false)
await connectDatabase()
try {
  await Promise.all([
    User.createIndexes(),
    NGOProfile.createIndexes(),
    Donation.createIndexes(),
    DonationRequest.createIndexes(),
    PickupTask.createIndexes(),
    Notification.createIndexes(),
    AuditLog.createIndexes(),
  ])
  console.info('FoodBridge production indexes were created or confirmed.')
} finally {
  await disconnectDatabase()
}
