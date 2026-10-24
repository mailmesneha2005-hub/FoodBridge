import { readFileSync } from 'node:fs'
import type { RequestHandler } from 'express'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import type { RequestUser } from '../types/auth.js'
import { unavailable, unauthorized, forbidden } from '../utils/AppError.js'

export interface FirebasePrincipal { uid: string; email?: string; name?: string }
export interface AuthenticationDependencies {
  configured: () => boolean
  verify: (token: string) => Promise<FirebasePrincipal>
  provision: (principal: FirebasePrincipal) => Promise<RequestUser>
}

export function extractBearerToken(header: string | undefined) {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw unauthorized()
  return token
}

export function createAuthenticate(dependencies: AuthenticationDependencies): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!dependencies.configured()) return next(unavailable('AUTH_NOT_CONFIGURED', 'Firebase Admin is not configured. Set server Firebase credentials to enable protected routes.'))
      const token = extractBearerToken(req.header('authorization'))
      let principal: FirebasePrincipal
      try { principal = await dependencies.verify(token) }
      catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
        if (code === 'auth/user-disabled') return next(forbidden('This Firebase account is disabled.'))
        if (code.startsWith('auth/')) return next(unauthorized('The Firebase ID token is invalid, expired, revoked or disabled.'))
        if (code.includes('credential')) return next(unavailable('AUTH_CREDENTIALS_UNAVAILABLE', 'Firebase Admin credentials could not be loaded.'))
        throw error
      }
      req.authUser = await dependencies.provision(principal)
      next()
    } catch (error) { next(error) }
  }
}

let firebaseReady = false
function ensureFirebase() {
  if (firebaseReady) return true
  try {
    let credential
    let projectId = env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const account = JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))
      if (projectId && account.project_id && account.project_id !== projectId) throw new Error('Firebase service account project does not match the configured project ID.')
      credential = cert(account)
      projectId ||= account.project_id
    } else {
      if (!env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT && !process.env.GCP_PROJECT) return false
      credential = applicationDefault()
    }
    if (!projectId) return false
    if (!getApps().length) initializeApp({ credential, ...(projectId ? { projectId } : {}) })
    firebaseReady = true
    return true
  } catch {
    console.error('Firebase Admin configuration could not be loaded. Check the configured credential source and project ID.')
    return false
  }
}

export function isFirebaseAdminConfigured() { return ensureFirebase() }

export async function provisionFirebaseUser(principal: FirebasePrincipal): Promise<RequestUser> {
  const email = (principal.email || `${principal.uid}@unknown.invalid`).toLowerCase()
  const user = await User.findOneAndUpdate(
    { firebaseUid: principal.uid },
    { $set: { email, displayName: principal.name || principal.email || 'FoodBridge user' }, $setOnInsert: { firebaseUid: principal.uid, role: 'donor', accountStatus: 'active' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  if (!user) throw unauthorized()
  return { id: user.id, firebaseUid: user.firebaseUid, email: user.email, displayName: user.displayName, role: user.role, accountStatus: user.accountStatus }
}

export const authenticate = createAuthenticate({
  configured: ensureFirebase,
  verify: async token => getAuth().verifyIdToken(token, true),
  provision: provisionFirebaseUser,
})

export async function authenticateSocketUser(token: string): Promise<RequestUser> {
  if (!ensureFirebase()) throw unavailable('AUTH_NOT_CONFIGURED', 'Firebase Admin is not configured.')
  try {
    const principal = await getAuth().verifyIdToken(token, true)
    const user = await provisionFirebaseUser({ uid: principal.uid, email: principal.email, name: principal.name })
    if (user.accountStatus !== 'active') throw forbidden('This FoodBridge account is not active.')
    return user
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    if (code.startsWith('auth/')) throw unauthorized('The Firebase ID token is invalid, expired, revoked or disabled.')
    throw error
  }
}

