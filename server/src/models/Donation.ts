import { Schema, model, type Document } from 'mongoose'

export type DonationStatus = 'available' | 'requested' | 'matched' | 'picked_up' | 'delivered' | 'cancelled' | 'expired'
export interface IDonation extends Document {
  donorId: Schema.Types.ObjectId
  title: string
  category: string
  description: string
  quantity: { amount: number; unit: string }
  preparationTime: Date
  safeUseDeadline: Date
  pickupWindow: { start: Date; end: Date }
  imageUrl?: string
  imagePublicId?: string
  address: { line1: string; line2?: string; city: string; region: string; postalCode?: string; country: string }
  location?: { type: 'Point'; coordinates: [number, number] }
  status: DonationStatus
  claimedByNgoId?: Schema.Types.ObjectId | null
  requestRevision: number
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<IDonation>({
  donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, required: true, trim: true, maxlength: 80, index: true },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  quantity: { amount: { type: Number, required: true, min: 0.01 }, unit: { type: String, required: true, trim: true, maxlength: 40 } },
  preparationTime: { type: Date, required: true }, safeUseDeadline: { type: Date, required: true, index: true },
  pickupWindow: { start: { type: Date, required: true }, end: { type: Date, required: true } },
  imageUrl: { type: String, trim: true, maxlength: 2048 },
  imagePublicId: { type: String, trim: true, maxlength: 255 },
  address: {
    line1: { type: String, required: true, trim: true, maxlength: 180 }, line2: { type: String, trim: true, maxlength: 180 },
    city: { type: String, required: true, trim: true, maxlength: 100 }, region: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 24 }, country: { type: String, required: true, trim: true, maxlength: 100 },
  },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], validate: { validator: (v: number[]) => v.length === 2 } } },
  status: { type: String, enum: ['available', 'requested', 'matched', 'picked_up', 'delivered', 'cancelled', 'expired'], default: 'available', required: true, index: true },
  claimedByNgoId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  requestRevision: { type: Number, default: 0, min: 0 },
}, { timestamps: true, versionKey: false })

schema.index({ location: '2dsphere' })
schema.index({ status: 1, safeUseDeadline: 1, createdAt: -1 })
schema.index({ donorId: 1, createdAt: -1 })
schema.index({ title: 'text', description: 'text', 'address.city': 'text' })
export const Donation = model<IDonation>('Donation', schema)
