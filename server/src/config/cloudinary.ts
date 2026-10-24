import { v2 as cloudinary } from 'cloudinary'
import { randomUUID } from 'node:crypto'
import { env } from './env.js'
import { AppError } from '../utils/AppError.js'

const isConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET && env.CLOUDINARY_UPLOAD_PRESET)
if (isConfigured) cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true })

export function createDonationUploadSignature(firebaseUid: string, upload: { contentType: string; size: number }) {
  if (!isConfigured) throw new AppError(503, 'UPLOADS_NOT_CONFIGURED', 'Food image uploads are not configured. Contact the FoodBridge administrator.')
  if (!['image/jpeg','image/png','image/webp'].includes(upload.contentType) || upload.size > env.CLOUDINARY_MAX_IMAGE_BYTES) throw new AppError(400, 'INVALID_UPLOAD', `Choose a JPG, PNG or WebP image smaller than ${env.CLOUDINARY_MAX_IMAGE_BYTES} bytes.`)
  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `${env.CLOUDINARY_UPLOAD_FOLDER}/${firebaseUid}/${randomUUID()}`
  const context = `foodbridge_owner=${firebaseUid}`
  const params = { timestamp, public_id: publicId, context, overwrite: false, upload_preset: env.CLOUDINARY_UPLOAD_PRESET! }
  return { timestamp, publicId, context, overwrite: false, uploadPreset: env.CLOUDINARY_UPLOAD_PRESET!, signature: cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!), apiKey: env.CLOUDINARY_API_KEY!, cloudName: env.CLOUDINARY_CLOUD_NAME!, uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, maxBytes: env.CLOUDINARY_MAX_IMAGE_BYTES, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] }
}

export async function assertDonationImage(uid: string, publicId?: string, imageUrl?: string) {
  if (!publicId && !imageUrl) return
  if (!isConfigured || !publicId || !imageUrl || !publicId.startsWith(`${env.CLOUDINARY_UPLOAD_FOLDER}/${uid}/`)) throw new AppError(400, 'INVALID_DONATION_IMAGE', 'Upload an image using the FoodBridge image uploader.')
  try {
    const asset = await cloudinary.api.resource(publicId, { resource_type: 'image' })
    const expectedUrl = asset.secure_url as string | undefined
    if (asset.resource_type !== 'image' || !['jpg', 'jpeg', 'png', 'webp'].includes(String(asset.format).toLowerCase()) || Number(asset.bytes) > env.CLOUDINARY_MAX_IMAGE_BYTES || asset.context?.custom?.foodbridge_owner !== uid || expectedUrl !== imageUrl) throw new Error('asset validation failed')
  } catch {
    throw new AppError(400, 'INVALID_DONATION_IMAGE', 'The uploaded image could not be verified. Upload it again and retry.')
  }
}
