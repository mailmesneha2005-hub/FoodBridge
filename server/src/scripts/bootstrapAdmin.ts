import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { readFile } from 'node:fs/promises'
import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { User } from '../models/User.js'
import { AuditLog } from '../models/AuditLog.js'
import { assertAllowedInitialAdminBootstrap } from '../services/authorization.js'

async function bootstrap() {
  const uid = env.ADMIN_BOOTSTRAP_FIREBASE_UID?.trim()
  if (!uid) throw new Error('Set ADMIN_BOOTSTRAP_FIREBASE_UID to the verified Firebase UID for the administrator.')
  if (!env.MONGODB_URI) throw new Error('Set MONGODB_URI before running admin bootstrap.')
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH && !env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT && !process.env.GCP_PROJECT) throw new Error('Configure Firebase Admin credentials before running admin bootstrap.')
  let credential
  let projectId = env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const account = JSON.parse(await readFile(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))
    credential = cert(account)
    projectId ||= account.project_id
  } else credential = applicationDefault()
  if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID or use a service account that contains its project ID.')
  if (!getApps().length) initializeApp({ credential, projectId })

  const firebaseUser = await getAuth().getUser(uid)
  if (firebaseUser.disabled || !firebaseUser.email || !firebaseUser.emailVerified) throw new Error('The Firebase administrator account must be enabled and have a verified email address.')
  await connectDatabase()
  assertAllowedInitialAdminBootstrap(await User.exists({ role: 'admin' }).then(Boolean))
  const existing = await User.findOne({ firebaseUid: firebaseUser.uid })
  if (existing && existing.email !== firebaseUser.email.toLowerCase()) throw new Error('Firebase and FoodBridge profile emails do not match; resolve the identity mismatch manually before bootstrapping.')
  await User.findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    { $set: { email: firebaseUser.email.toLowerCase(), displayName: firebaseUser.displayName || firebaseUser.email, role: 'admin', accountStatus: 'active' }, $setOnInsert: { firebaseUid: firebaseUser.uid } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  )
  const adminProfile = await User.findOne({ firebaseUid: uid })
  if (adminProfile) await AuditLog.create({ actorId: adminProfile._id, action: 'admin.initial_bootstrap', entityType: 'User', entityId: adminProfile._id, metadata: { method: 'controlled-cli-bootstrap' } })
  console.info(`Initial FoodBridge administrator bootstrapped for Firebase UID ${uid}. Remove ADMIN_BOOTSTRAP_FIREBASE_UID from the environment now.`)
}

void bootstrap().catch(error => { console.error('Admin bootstrap failed:', error); process.exitCode = 1 }).finally(async () => { await disconnectDatabase() })
