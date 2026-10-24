import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigVariables = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const

export const missingFirebaseConfig = Object.entries(config)
  .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
  .map(([key]) => firebaseConfigVariables[key as keyof typeof firebaseConfigVariables])

export const firebaseConfigured = missingFirebaseConfig.length === 0
export const firebaseApp = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null

export async function getFoodBridgeFirestore() {
  if (!firebaseApp) throw new Error('Firebase is not configured for this client.')
  const { getFirestore } = await import('firebase/firestore')
  return getFirestore(firebaseApp)
}

// Keep production on the existing profile API until MongoDB profiles have been
// migrated and verified. Opt into Firestore explicitly after that migration.
export const profileStoreMode = import.meta.env.VITE_PROFILE_STORE === 'firestore' ? 'firestore' : 'api'
