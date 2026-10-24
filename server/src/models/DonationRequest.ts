import { Schema, model, type Document } from 'mongoose'

export type DonationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export interface IDonationRequest extends Document {
  donationId: Schema.Types.ObjectId
  ngoId: Schema.Types.ObjectId
  status: DonationRequestStatus
  message?: string
  requestedAt: Date
  decidedAt?: Date
  decidedBy?: Schema.Types.ObjectId
  cancelledAt?: Date
  cancelledBy?: Schema.Types.ObjectId
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<IDonationRequest>({
  donationId: { type: Schema.Types.ObjectId, ref: 'Donation', required: true },
  ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', required: true, index: true },
  message: { type: String, trim: true, maxlength: 1000 },
  requestedAt: { type: Date, default: Date.now, required: true }, decidedAt: Date,
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User' }, cancelledAt: Date,
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' }, active: { type: Boolean, default: true, required: true },
}, { timestamps: true, versionKey: false })

// Different NGOs may request the same donation; one active request per NGO/donation pair.
schema.index({ donationId: 1, ngoId: 1 }, { unique: true, partialFilterExpression: { active: true } })
schema.index({ ngoId: 1, createdAt: -1 })
schema.index({ status: 1, createdAt: -1 })
export const DonationRequest = model<IDonationRequest>('DonationRequest', schema)
