import { Schema, model, type Document } from 'mongoose'

export interface IAuditLog extends Document {
  actorId: Schema.Types.ObjectId
  action: string
  entityType: string
  entityId: Schema.Types.ObjectId
  metadata?: Record<string, unknown>
  createdAt: Date
}

const schema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true, maxlength: 100 },
  entityType: { type: String, required: true, trim: true, maxlength: 80 },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false })

schema.index({ createdAt: -1 })
export const AuditLog = model<IAuditLog>('AuditLog', schema)
