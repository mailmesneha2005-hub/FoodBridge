import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore'
import { createOrResumeProfileInDb } from './profileStore'

const projectId = 'demo-foodbridge-rules'
let testEnv: RulesTestEnvironment

const userProfile = (uid: string, role: string, accountStatus = 'active') => ({
  firebaseUid: uid,
  displayName: 'FoodBridge User',
  email: `${uid}@example.test`,
  role,
  accountStatus,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

const ngoProfile = (uid: string, verificationStatus = 'pending') => ({
  ownerUid: uid,
  organizationName: 'Community Kitchen',
  address: { line1: '12 Green Road', city: 'Pune', region: 'Maharashtra', country: 'India' },
  registration: { number: 'NGO-123' },
  capacity: { mealsPerDay: 100 },
  verificationStatus,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

async function seedAdmin() {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users', 'trusted-admin'), {
      firebaseUid: 'trusted-admin', displayName: 'Trusted Admin', email: 'admin@example.test',
      role: 'admin', accountStatus: 'active', createdAt: new Date(), updatedAt: new Date(),
    })
  })
}

describe('Firestore user and NGO profile rules', () => {
  beforeAll(async () => {
    const rules = await readFile(resolve(process.cwd(), '..', 'firestore.rules'), 'utf8')
    testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } })
  })

  beforeEach(async () => testEnv.clearFirestore())
  afterAll(async () => testEnv.cleanup())

  it('allows a user to create and read only their own ordinary profile', async () => {
    const db = testEnv.authenticatedContext('donor-1', { email: 'donor-1@example.test' }).firestore()
    const modularDb = db as unknown as Firestore
    const created = await assertSucceeds(createOrResumeProfileInDb(modularDb, {
      uid: 'donor-1', email: 'donor-1@example.test', displayName: 'FoodBridge User',
    }, { role: 'donor' }))
    expect(created.role).toBe('donor')
    await expect(createOrResumeProfileInDb(modularDb, {
      uid: 'donor-1', email: 'donor-1@example.test', displayName: 'Changed Name',
    }, { role: 'admin' } as never)).rejects.toThrow(/cannot assign administrator/i)
    await assertSucceeds(updateDoc(doc(db, 'users', 'donor-1'), { displayName: 'Updated User', updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(db, 'users', 'someone-else'), userProfile('someone-else', 'donor')))
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'users', 'donor-1')))
  })

  it('rejects public admin assignment and owner changes to role or account status', async () => {
    const db = testEnv.authenticatedContext('user-1', { email: 'user-1@example.test' }).firestore()
    await assertFails(setDoc(doc(db, 'users', 'user-1'), userProfile('user-1', 'admin')))
    await assertSucceeds(setDoc(doc(db, 'users', 'user-1'), userProfile('user-1', 'donor')))
    await assertFails(updateDoc(doc(db, 'users', 'user-1'), { role: 'admin', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db, 'users', 'user-1'), { accountStatus: 'active', role: 'ngo', updatedAt: serverTimestamp() }))
  })

  it('allows an NGO to submit pending details but prevents self-approval', async () => {
    const db = testEnv.authenticatedContext('ngo-1', { email: 'ngo-1@example.test' }).firestore()
    const created = await assertSucceeds(createOrResumeProfileInDb(db as unknown as Firestore, {
      uid: 'ngo-1', email: 'ngo-1@example.test', displayName: 'FoodBridge User',
    }, {
      role: 'ngo',
      organization: {
        organizationName: 'Community Kitchen',
        address: { line1: '12 Green Road', city: 'Pune', region: 'Maharashtra', country: 'India' },
        registration: { number: 'NGO-123' },
        capacity: { mealsPerDay: 100 },
      },
    }))
    expect(created.accountStatus).toBe('pending')

    await assertFails(updateDoc(doc(db, 'ngoProfiles', 'ngo-1'), {
      verificationStatus: 'approved', verifiedBy: 'ngo-1', verifiedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  it('allows a different active admin to approve an NGO in one consistent batch', async () => {
    await seedAdmin()
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users', 'ngo-2'), {
        firebaseUid: 'ngo-2', displayName: 'NGO', email: 'ngo-2@example.test', role: 'ngo', accountStatus: 'pending', createdAt: new Date(), updatedAt: new Date(),
      })
      await setDoc(doc(context.firestore(), 'ngoProfiles', 'ngo-2'), {
        ...ngoProfile('ngo-2'), createdAt: new Date(), updatedAt: new Date(),
      })
    })

    const db = testEnv.authenticatedContext('trusted-admin', { email: 'admin@example.test' }).firestore()
    const batch = writeBatch(db)
    batch.update(doc(db, 'ngoProfiles', 'ngo-2'), {
      verificationStatus: 'approved', verifiedBy: 'trusted-admin', verifiedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    batch.update(doc(db, 'users', 'ngo-2'), { accountStatus: 'active', updatedAt: serverTimestamp() })
    await assertSucceeds(batch.commit())

    const retried = await createOrResumeProfileInDb(db as unknown as Firestore, {
      uid: 'ngo-2', email: 'ngo-2@example.test', displayName: 'Changed Name',
    }, { role: 'donor' })
    expect(retried).toMatchObject({ role: 'ngo', accountStatus: 'active', displayName: 'NGO' })
    const verifiedNgo = await getDoc(doc(db, 'ngoProfiles', 'ngo-2'))
    expect(verifiedNgo.data()).toMatchObject({ verificationStatus: 'approved', verifiedBy: 'trusted-admin' })
  })
})
