import { Schema, model, type Document } from 'mongoose'

export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export interface INGOProfile extends Document {
  userId: Schema.Types.ObjectId
  organizationName: string
  address: { line1: string; line2?: string; city: string; region: string; postalCode?: string; country: string }
  registration: { number: string; documentUrl?: string }
  capacity: { mealsPerDay: number; storageNotes?: string }
  verificationStatus: VerificationStatus
  verifiedBy?: Schema.Types.ObjectId
  verifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<INGOProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  organizationName: { type: String, required: true, trim: true, maxlength: 180 },
  address: {
    line1: { type: String, required: true, trim: true, maxlength: 180 }, line2: { type: String, trim: true, maxlength: 180 },
    city: { type: String, required: true, trim: true, maxlength: 100 }, region: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 24 }, country: { type: String, required: true, trim: true, maxlength: 100 },
  },
  registration: { number: { type: String, required: true, trim: true, maxlength: 100 }, documentUrl: { type: String, trim: true, maxlength: 2048 } },
  capacity: { mealsPerDay: { type: Number, required: true, min: 0 }, storageNotes: { type: String, trim: true, maxlength: 500 } },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', required: true, index: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }, verifiedAt: Date,
}, { timestamps: true, versionKey: false })

schema.index({ organizationName: 'text', 'address.city': 'text' })
export const NGOProfile = model<INGOProfile>('NGOProfile', schema)
