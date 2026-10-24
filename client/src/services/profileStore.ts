import type { DocumentData, Firestore } from 'firebase/firestore'
import type { User as FirebaseUser } from 'firebase/auth'
import { getFoodBridgeFirestore } from './firebase'
import type { UserRole } from '../types/domain'

export type AccountStatus = 'active' | 'pending' | 'suspended'
export type ProfileRole = UserRole

export interface FoodBridgeProfile {
  id: string
  firebaseUid: string
  displayName: string
  email: string
  phone?: string
  role: ProfileRole
  accountStatus: AccountStatus
  profile?: { avatarUrl?: string; address?: string; bio?: string }
}

export interface NgoProfile {
  ownerUid: string
  organizationName: string
  address: { line1: string; line2?: string; city: string; region: string; postalCode?: string; country: string }
  registration: { number: string; documentUrl?: string }
  capacity: { mealsPerDay: number; storageNotes?: string }
  verificationStatus: 'pending' | 'approved' | 'rejected'
  verifiedBy?: string
  verifiedAt?: string
}

export interface RegistrationProfileInput {
  role: Exclude<UserRole, 'admin'>
  organization?: Omit<NgoProfile, 'ownerUid' | 'verificationStatus' | 'verifiedBy' | 'verifiedAt'>
}

const allowedRoles: UserRole[] = ['donor', 'ngo', 'volunteer', 'admin']
const allowedStatuses: AccountStatus[] = ['active', 'pending', 'suspended']

function profileFrom(uid: string, data: DocumentData): FoodBridgeProfile {
  if (data.firebaseUid !== uid || !allowedRoles.includes(data.role) || !allowedStatuses.includes(data.accountStatus)) {
    throw new Error('The saved FoodBridge profile is incomplete or invalid. Contact support before changing account access.')
  }
  return {
    id: uid,
    firebaseUid: uid,
    displayName: String(data.displayName ?? ''),
    email: String(data.email ?? ''),
    ...(typeof data.phone === 'string' ? { phone: data.phone } : {}),
    role: data.role,
    accountStatus: data.accountStatus,
    ...(data.profile && typeof data.profile === 'object' ? { profile: data.profile } : {}),
  }
}

function validateRegistration(user: Pick<FirebaseUser, 'uid' | 'email' | 'displayName'>, input: RegistrationProfileInput) {
  if (!user.uid || !user.email) throw new Error('A signed-in Firebase account with an email address is required to create a FoodBridge profile.')
  if (!['donor', 'ngo', 'volunteer'].includes(input.role)) throw new Error('Public registration cannot assign administrator access.')
  if (input.role === 'ngo' && !input.organization) throw new Error('Organization details are required for NGO registration.')
  if (input.organization && input.role !== 'ngo') throw new Error('Organization details can only be submitted for an NGO profile.')
}

/**
 * Create a profile only when it is absent. A retry returns the stored profile
 * unchanged, preserving role, account status and all NGO verification fields.
 */
export async function createOrResumeProfileInDb(
  firestoreDb: Firestore,
  user: Pick<FirebaseUser, 'uid' | 'email' | 'displayName'>,
  input: RegistrationProfileInput,
): Promise<FoodBridgeProfile> {
  validateRegistration(user, input)
  const { doc, runTransaction, serverTimestamp } = await import('firebase/firestore')
  const userRef = doc(firestoreDb, 'users', user.uid)
  const ngoRef = doc(firestoreDb, 'ngoProfiles', user.uid)

  return runTransaction(firestoreDb, async transaction => {
    const existingSnapshot = await transaction.get(userRef)
    if (existingSnapshot.exists()) {
      const existing = profileFrom(user.uid, existingSnapshot.data())
      if (existing.role === 'ngo' && existing.accountStatus === 'pending' && input.organization) {
        const ngoSnapshot = await transaction.get(ngoRef)
        if (!ngoSnapshot.exists()) {
          transaction.set(ngoRef, {
            ...input.organization,
            ownerUid: user.uid,
            verificationStatus: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
      }
      return existing
    }

    const now = serverTimestamp()
    const profile = {
      firebaseUid: user.uid,
      displayName: user.displayName?.trim() || user.email!.split('@')[0],
      email: user.email!.trim().toLowerCase(),
      role: input.role,
      accountStatus: input.role === 'ngo' ? 'pending' : 'active',
      createdAt: now,
      updatedAt: now,
    }
    transaction.set(userRef, profile)
    if (input.role === 'ngo' && input.organization) {
      transaction.set(ngoRef, {
        ...input.organization,
        ownerUid: user.uid,
        verificationStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    }
    return profileFrom(user.uid, profile)
  })
}

export async function createOrResumeProfile(user: FirebaseUser, input: RegistrationProfileInput): Promise<FoodBridgeProfile> {
  return createOrResumeProfileInDb(await getFoodBridgeFirestore(), user, input)
}

export async function readProfile(uid: string): Promise<FoodBridgeProfile> {
  const { doc, getDoc } = await import('firebase/firestore')
  const snapshot = await getDoc(doc(await getFoodBridgeFirestore(), 'users', uid))
  if (!snapshot.exists()) throw new Error('Your FoodBridge profile is not in Firestore yet. Existing MongoDB profiles must be migrated before enabling Firestore profile mode.')
  return profileFrom(uid, snapshot.data())
}

export async function updateProfile(uid: string, changes: {
  displayName: string
  phone?: string
  profile: { address?: string; bio?: string }
}): Promise<FoodBridgeProfile> {
  const { doc, runTransaction, serverTimestamp } = await import('firebase/firestore')
  const displayName = changes.displayName.trim()
  if (displayName.length < 2 || displayName.length > 120) throw new Error('Display name must be between 2 and 120 characters.')
  if (changes.phone && changes.phone.length > 32) throw new Error('Phone number must be 32 characters or fewer.')
  if ((changes.profile.address?.length ?? 0) > 500 || (changes.profile.bio?.length ?? 0) > 1000) throw new Error('Profile address or description is too long.')
  const firestoreDb = await getFoodBridgeFirestore()
  const ref = doc(firestoreDb, 'users', uid)
  await runTransaction(firestoreDb, async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new Error('Your FoodBridge profile is not available to update.')
    // Explicit field allowlist: role, account status, email and verification
    // information are never included in this client update.
    const existingProfile = snapshot.data().profile && typeof snapshot.data().profile === 'object' ? snapshot.data().profile : {}
    transaction.update(ref, {
      displayName,
      phone: changes.phone ?? '',
      profile: {
        ...existingProfile,
        address: changes.profile.address ?? '',
        bio: changes.profile.bio ?? '',
      },
      updatedAt: serverTimestamp(),
    })
  })
  return readProfile(uid)
}

export async function readNgoProfile(uid: string): Promise<NgoProfile | null> {
  const { doc, getDoc } = await import('firebase/firestore')
  const snapshot = await getDoc(doc(await getFoodBridgeFirestore(), 'ngoProfiles', uid))
  return snapshot.exists() ? snapshot.data() as NgoProfile : null
}
