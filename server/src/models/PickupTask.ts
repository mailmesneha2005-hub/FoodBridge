import { Schema, model, type Document } from 'mongoose'

export type PickupStatus = 'unassigned' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled'
export interface IPickupTask extends Document {
  donationId: Schema.Types.ObjectId
  approvedRequestId: Schema.Types.ObjectId
  volunteerId?: Schema.Types.ObjectId | null
  assignedBy?: Schema.Types.ObjectId
  assignmentStatus: PickupStatus
  assignedAt?: Date
  pickupTime?: Date
  pickedUpAt?: Date
  pickedUpBy?: Schema.Types.ObjectId
  deliveredAt?: Date
  deliveredBy?: Schema.Types.ObjectId
  deliveryConfirmation?: { confirmedBy: Schema.Types.ObjectId; note?: string; confirmedAt: Date }
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<IPickupTask>({
  donationId: { type: Schema.Types.ObjectId, ref: 'Donation', required: true, unique: true },
  approvedRequestId: { type: Schema.Types.ObjectId, ref: 'DonationRequest', required: true, unique: true },
  volunteerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  assignmentStatus: { type: String, enum: ['unassigned', 'assigned', 'picked_up', 'delivered', 'cancelled'], default: 'unassigned', required: true, index: true },
  assignedAt: Date, pickupTime: Date, pickedUpAt: Date,
  pickedUpBy: { type: Schema.Types.ObjectId, ref: 'User' }, deliveredAt: Date, deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deliveryConfirmation: { confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' }, note: { type: String, trim: true, maxlength: 500 }, confirmedAt: Date },
}, { timestamps: true, versionKey: false })

schema.index({ assignmentStatus: 1, createdAt: -1 })
schema.index({ volunteerId: 1, assignmentStatus: 1, pickupTime: 1 })
export const PickupTask = model<IPickupTask>('PickupTask', schema)
