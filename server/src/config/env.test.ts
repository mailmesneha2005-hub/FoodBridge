import { describe, expect, it } from 'vitest'
import { parseEnvironment } from './env.js'

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  CLIENT_ORIGIN: 'https://foodbridge.example,https://www.foodbridge.example',
  MONGODB_URI: 'mongodb+srv://example.mongodb.net/foodbridge',
  FIREBASE_PROJECT_ID: 'foodbridge-test-project',
  FIREBASE_SERVICE_ACCOUNT_PATH: '/run/secrets/firebase-admin.json',
  CLOUDINARY_CLOUD_NAME: 'foodbridge-test',
  CLOUDINARY_API_KEY: 'test-api-key',
  CLOUDINARY_API_SECRET: 'test-api-secret',
  CLOUDINARY_UPLOAD_PRESET: 'foodbridge-test-preset',
}

describe('environment configuration', () => {
  it('keeps local defaults when optional environment values are blank', () => {
    const parsed = parseEnvironment({ NODE_ENV: '', CLIENT_ORIGIN: '', PORT: '' })
    expect(parsed.NODE_ENV).toBe('development')
    expect(parsed.PORT).toBe(4000)
    expect(parsed.CLIENT_ORIGIN).toEqual(['http://localhost:5173'])
  })

  it('accepts complete production configuration and normalizes multiple allowed origins', () => {
    const parsed = parseEnvironment(validProductionEnvironment)
    expect(parsed.CLIENT_ORIGIN).toEqual(['https://foodbridge.example', 'https://www.foodbridge.example'])
  })

  it('fails fast in production when required external services are missing', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI.*Firebase project ID.*Cloudinary/)
  })

  it('rejects insecure or overly broad production CORS origins', () => {
    expect(() => parseEnvironment({ ...validProductionEnvironment, CLIENT_ORIGIN: 'http://localhost:5173' })).toThrow(/exact HTTPS origins/)
    expect(() => parseEnvironment({ ...validProductionEnvironment, CLIENT_ORIGIN: '*' })).toThrow(/exact HTTPS origins/)
  })
})
