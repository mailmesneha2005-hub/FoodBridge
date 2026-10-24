import { Schema, model, type Document, type Types } from 'mongoose'
import type { AccountStatus, UserRole } from '../types/auth.js'

export interface IUser extends Document {
  firebaseUid: string
  displayName: string
  email: string
  phone?: string
  role: UserRole
  accountStatus: AccountStatus
  profile: { avatarUrl?: string; address?: string; bio?: string }
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<IUser>({
  firebaseUid: { type: String, required: true, unique: true, index: true, trim: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 32 },
  role: { type: String, enum: ['donor', 'ngo', 'volunteer', 'admin'], default: 'donor', required: true, index: true },
  accountStatus: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active', required: true, index: true },
  profile: { avatarUrl: { type: String, maxlength: 2048 }, address: { type: String, maxlength: 500 }, bio: { type: String, maxlength: 1000 } },
}, { timestamps: true, versionKey: false })

export const User = model<IUser>('User', schema)

export function userIdentity(user: IUser) {
  return { id: (user._id as Types.ObjectId).toString(), firebaseUid: user.firebaseUid, email: user.email, displayName: user.displayName, role: user.role, accountStatus: user.accountStatus }
}
