import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import type { UserRole } from '../../types/domain'
import { useAuth } from '../../contexts/AuthContext'
import { missingFirebaseConfig, profileStoreMode } from '../../services/firebase'
import { Button } from '../Button'
import { DemoWorkspacePage } from '../../pages/DemoWorkspacePage'

const roleName: Record<UserRole, string> = { donor: 'Donor', ngo: 'NGO', volunteer: 'Volunteer', admin: 'Administrator' }
export function ProtectedRoute({ role, children }: { role?: UserRole; children: ReactNode }) {
  const { firebaseUser, profile, loading, configured, isDemoSession, profileError, logout } = useAuth()
  const location = useLocation()
  if (isDemoSession && profile) {
    if (role && profile.role !== role) return <Navigate to="/unauthorized" replace/>
    return <DemoWorkspacePage role={profile.role} pathname={location.pathname}/>
  }
  if (!configured) return <AuthUnavailable/>
  if (loading) return <main className="grid min-h-[50vh] place-items-center px-5"><p role="status" className="text-sm font-semibold text-muted">Restoring your secure FoodBridge session…</p></main>
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location.pathname }}/>
  if (!profile) return <main className="mx-auto grid min-h-[50vh] max-w-xl place-items-center px-5 py-12"><section role="alert" className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><h1 className="font-display text-xl font-extrabold">Your account profile is unavailable</h1><p className="mt-2 text-sm leading-6">{profileError || (profileStoreMode === 'firestore' ? 'FoodBridge could not read your profile from Cloud Firestore.' : 'FoodBridge could not verify your account with the backend.')} Protected pages stay closed until your account profile and role are available.</p><Button onClick={() => void logout()} variant="secondary" className="mt-4">Sign out</Button></section></main>
  if (role && profile.role !== role) return <Navigate to="/unauthorized" replace/>
  if (profile.accountStatus !== 'active') return <main className="mx-auto grid min-h-[50vh] max-w-xl place-items-center px-5 py-12"><section role="status" className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><ShieldAlert size={22}/><h1 className="mt-3 font-display text-xl font-extrabold">{profile.accountStatus === 'pending' ? 'Your account is awaiting verification' : 'This account is currently unavailable'}</h1><p className="mt-2 text-sm leading-6">{profile.role === 'ngo' ? 'An administrator must verify your organization before you can use NGO services.' : `${roleName[profile.role]} workspace access is unavailable while this account is ${profile.accountStatus}.`}</p><Button onClick={() => void logout()} variant="secondary" className="mt-4">Sign out</Button></section></main>
  return <>{children}</>
}

function AuthUnavailable() {
  return <main className="mx-auto grid min-h-[50vh] max-w-xl place-items-center px-5 py-12"><section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><h1 className="font-display text-xl font-extrabold">Sign-in is not configured</h1><p className="mt-2 text-sm leading-6">Public FoodBridge pages remain available. Add the missing Firebase Web App values to the repository-root <code>.env</code>, then restart Vite:</p><code className="mt-2 block break-words text-xs font-semibold">{missingFirebaseConfig.join(', ')}</code><p className="mt-3 text-sm leading-6">The API also requires Firebase Admin credentials and MongoDB configuration before a profile can be created.</p><Button to="/" variant="secondary" className="mt-4">Return home</Button></section></main>
}
