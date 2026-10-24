import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import type { UserRole } from '../types/domain'
import { firebaseAuth, firebaseConfigured } from '../services/firebase'
import { apiRequest, type ApiError } from '../services/apiClient'

export interface FoodBridgeProfile {
  id: string
  firebaseUid: string
  displayName: string
  email: string
  role: UserRole
  accountStatus: 'active' | 'pending' | 'suspended'
}
const demoStorageKey = 'foodbridge-prototype-demo-role'
function readDemoRole(): UserRole | null {
  if (!import.meta.env.DEV) return null
  const role = sessionStorage.getItem(demoStorageKey)
  return role === 'donor' || role === 'ngo' || role === 'volunteer' || role === 'admin' ? role : null
}
interface AuthState {
  firebaseUser: FirebaseUser | null
  profile: FoodBridgeProfile | null
  loading: boolean
  configured: boolean
  isDemoSession: boolean
  profileError: string | null
  refreshProfile: () => Promise<FoodBridgeProfile>
  startDemoSession: (role: UserRole) => void
  logout: () => Promise<void>
}
const Context = createContext<AuthState | null>(null)

function profileId(value: Record<string, unknown>) { return String(value.id ?? value._id ?? '') }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [demoRole, setDemoRole] = useState<UserRole | null>(readDemoRole)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<FoodBridgeProfile | null>(null)
  const [loading, setLoading] = useState(() => Boolean(firebaseAuth) && !readDemoRole())
  const [profileError, setProfileError] = useState<string | null>(null)
  const refreshProfile = useCallback(async () => {
    if (!firebaseAuth?.currentUser) throw new Error('Sign in before loading your FoodBridge profile.')
    const raw = await apiRequest<Record<string, unknown>>('/users/me')
    const next: FoodBridgeProfile = {
      id: profileId(raw), firebaseUid: String(raw.firebaseUid), displayName: String(raw.displayName), email: String(raw.email),
      role: raw.role as UserRole, accountStatus: raw.accountStatus as FoodBridgeProfile['accountStatus'],
    }
    if (!next.id || !['donor', 'ngo', 'volunteer', 'admin'].includes(next.role)) throw new Error('The API did not return a valid FoodBridge account profile.')
    setProfile(next); setProfileError(null)
    return next
  }, [])

  useEffect(() => {
    if (!firebaseAuth || demoRole) { setLoading(false); return }
    let active = true
    const unsubscribe = onAuthStateChanged(firebaseAuth, async user => {
      setFirebaseUser(user)
      setProfile(null)
      setProfileError(null)
      if (!user) { if (active) setLoading(false); return }
      setLoading(true)
      try { await refreshProfile() }
      catch (error) { if (active) setProfileError(error instanceof Error ? error.message : 'Your FoodBridge profile could not be loaded.') }
      finally { if (active) setLoading(false) }
    })
    return () => { active = false; unsubscribe() }
  }, [demoRole, refreshProfile])

  const startDemoSession = useCallback((role: UserRole) => {
    if (!import.meta.env.DEV) throw new Error('Prototype preview is only available during local development.')
    if (firebaseConfigured) throw new Error('Prototype preview is only available while Firebase sign-in is not configured.')
    sessionStorage.setItem(demoStorageKey, role)
    setFirebaseUser(null); setProfile(null); setProfileError(null); setDemoRole(role); setLoading(false)
  }, [])
  const logout = useCallback(async () => {
    if (firebaseAuth?.currentUser) await signOut(firebaseAuth)
    sessionStorage.removeItem(demoStorageKey)
    setDemoRole(null); setProfile(null); setFirebaseUser(null)
  }, [])
  const demoProfile: FoodBridgeProfile | null = demoRole ? {
    id: `prototype-${demoRole}`, firebaseUid: `prototype-${demoRole}`, displayName: `${demoRole === 'ngo' ? 'Community NGO' : demoRole === 'admin' ? 'FoodBridge Admin' : `Demo ${demoRole}`}`,
    email: `${demoRole}@demo.foodbridge.local`, role: demoRole, accountStatus: 'active',
  } : null
  const visibleProfile = demoProfile ?? profile
  const value = useMemo(() => ({ firebaseUser, profile: visibleProfile, loading, configured: firebaseConfigured, isDemoSession: Boolean(demoRole), profileError, refreshProfile, startDemoSession, logout }), [firebaseUser, visibleProfile, loading, demoRole, profileError, refreshProfile, startDemoSession, logout])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAuth() {
  const context = useContext(Context)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as ApiError).code) : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account already uses this email. Try signing in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-login-credentials': 'The email or password is incorrect.',
    'auth/user-not-found': 'The email or password is incorrect.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled for this Firebase project.',
    'auth/user-disabled': 'This Firebase account has been disabled. Contact FoodBridge support.',
    'auth/invalid-api-key': 'Firebase rejected the web API key. Check VITE_FIREBASE_API_KEY against the Firebase Web app settings.',
    'auth/unauthorized-domain': 'This website domain is not authorized in Firebase Authentication. Add it under Authentication settings → Authorized domains.',
    'auth/operation-not-supported-in-this-environment': 'Firebase Authentication is unavailable in this browser context. Open FoodBridge in a regular browser tab and try again.',
    AUTH_NOT_CONFIGURED: 'Firebase sign-in is not configured for this app yet.',
    DATABASE_NOT_CONFIGURED: 'The account service is not connected to MongoDB yet.',
    DATABASE_UNAVAILABLE: 'The account service is temporarily unavailable. Try again shortly.',
  }
  if (messages[code]) return messages[code]
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return 'FoodBridge could not reach the API. Check that the backend and MongoDB are running, then try again.'
  return error instanceof Error ? error.message : 'Authentication could not be completed. Please try again.'
}
