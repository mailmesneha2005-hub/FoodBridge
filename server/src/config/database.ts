import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('bufferCommands', false)
mongoose.set('autoIndex', env.NODE_ENV !== 'production')

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; database-backed features are unavailable.')
    return false
  }
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  console.info('Connected to MongoDB.')
  return true
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export function databaseIsReady() {
  return mongoose.connection.readyState === 1
}
