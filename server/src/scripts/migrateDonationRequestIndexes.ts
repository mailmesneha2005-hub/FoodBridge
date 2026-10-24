import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { DonationRequest } from '../models/DonationRequest.js'

if (!env.MONGODB_URI) throw new Error('Set MONGODB_URI before running this migration.')
await mongoose.connect(env.MONGODB_URI)
try {
  const indexes = await DonationRequest.collection.indexes()
  const legacy = indexes.find(index => index.name !== '_id_' && index.unique && Object.keys(index.key ?? {}).length === 1 && index.key?.donationId === 1)
  if (legacy?.name) {
    await DonationRequest.collection.dropIndex(legacy.name)
    console.log(`Dropped legacy donation-wide request index: ${legacy.name}`)
  }
  await DonationRequest.collection.createIndex({ donationId: 1, ngoId: 1 }, { unique: true, partialFilterExpression: { active: true } })
  console.log('Donation request indexes are ready for multiple NGOs per donation.')
} finally {
  await mongoose.disconnect()
}
