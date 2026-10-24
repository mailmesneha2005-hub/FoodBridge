import { Schema, model, type Document } from 'mongoose'

export type NotificationType = 'donation_request' | 'request_decision' | 'pickup_assigned' | 'pickup_update' | 'verification_update' | 'system'
export interface INotification extends Document {
  recipientId: Schema.Types.ObjectId
  type: NotificationType
  message: string
  entityType?: string
  entityId?: Schema.Types.ObjectId
  read: boolean
  readAt?: Date
  createdAt: Date
}

const schema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['donation_request', 'request_decision', 'pickup_assigned', 'pickup_update', 'verification_update', 'system'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  entityType: { type: String, trim: true, maxlength: 60 }, entityId: { type: Schema.Types.ObjectId },
  read: { type: Boolean, default: false, required: true, index: true }, readAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false })

schema.index({ recipientId: 1, read: 1, createdAt: -1 })
export const Notification = model<INotification>('Notification', schema)
