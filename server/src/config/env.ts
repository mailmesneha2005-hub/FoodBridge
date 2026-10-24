import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { z } from 'zod'

dotenv.config()
dotenv.config({ path: resolve(process.cwd(), '..', '.env'), override: false })

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173').transform(value => value.split(',').map(origin => origin.trim()).filter(Boolean)),
  MONGODB_URI: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GCLOUD_PROJECT: z.string().optional(),
  GCP_PROJECT: z.string().optional(),
  ADMIN_BOOTSTRAP_FIREBASE_UID: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('foodbridge/donations'),
  CLOUDINARY_MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(5000000),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return

  if (!value.MONGODB_URI || !/^mongodb(?:\+srv)?:\/\//i.test(value.MONGODB_URI)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['MONGODB_URI'], message: 'Set a production MongoDB connection URI.' })
  }

  const projectId = value.FIREBASE_PROJECT_ID || value.GOOGLE_CLOUD_PROJECT || value.GCLOUD_PROJECT || value.GCP_PROJECT
  if (!projectId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['FIREBASE_PROJECT_ID'], message: 'Set the Firebase project ID.' })
  if (!value.FIREBASE_SERVICE_ACCOUNT_PATH && !value.GOOGLE_APPLICATION_CREDENTIALS && !value.GOOGLE_CLOUD_PROJECT && !value.GCLOUD_PROJECT && !value.GCP_PROJECT) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['FIREBASE_SERVICE_ACCOUNT_PATH'], message: 'Configure a Firebase service-account file or Google Application Default Credentials.' })
  }

  if (value.CLIENT_ORIGIN.length === 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['CLIENT_ORIGIN'], message: 'Allow at least one HTTPS frontend origin.' })
  value.CLIENT_ORIGIN.forEach((origin, index) => {
    let parsed: URL | undefined
    try { parsed = new URL(origin) } catch { /* reported below */ }
    if (!parsed || origin.includes('*') || parsed.origin !== origin || parsed.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['CLIENT_ORIGIN', index], message: 'Production origins must be exact HTTPS origins without paths or localhost.' })
    }
  })

  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_UPLOAD_PRESET'] as const) {
    if (!value[key]) context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Configure Cloudinary for production food image uploads.' })
  }
})

export function parseEnvironment(source: NodeJS.ProcessEnv) {
  const sanitized = { ...source }
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string' && value.trim() === '') delete sanitized[key]
  }

  const result = environmentSchema.safeParse(sanitized)
  if (!result.success) {
    const issues = result.error.issues.map(issue => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    throw new Error(`Invalid environment configuration: ${issues.join('; ')}`)
  }
  return result.data
}

export const env = parseEnvironment(process.env)
