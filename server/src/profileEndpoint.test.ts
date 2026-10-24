import express, { type RequestHandler } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { User } from './models/User.js'
import { createApiRouter } from './routes/api.js'
import { provisionFirebaseUser, createAuthenticate } from './middleware/authenticate.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const verifiedUser = {
  id: 'mongo-user-1',
  firebaseUid: 'verified-firebase-uid',
  email: 'person@example.com',
  displayName: 'FoodBridge Person',
  role: 'donor' as const,
  accountStatus: 'active' as const,
}

function profileApp() {
  const requireDatabase: RequestHandler = (_req, _res, next) => next()
  const authenticate = createAuthenticate({
    configured: () => true,
    verify: async token => {
      if (token !== 'valid-firebase-id-token') throw Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' })
      return { uid: verifiedUser.firebaseUid, email: verifiedUser.email, name: verifiedUser.displayName }
    },
    provision: provisionFirebaseUser,
  })
  const app = express()
  app.use(express.json())
  app.use('/api/v1', createApiRouter({ requireDatabase, authenticate }))
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

describe('authenticated current-user profile endpoint', () => {
  beforeEach(() => {
    vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue(verifiedUser as never)
    vi.spyOn(User, 'findByIdAndUpdate').mockReturnValue({ select: vi.fn().mockResolvedValue(verifiedUser) } as never)
  })

  afterEach(() => vi.restoreAllMocks())

  it('accepts PATCH and updates only the verified user profile fields', async () => {
    const response = await request(profileApp())
      .patch('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-firebase-id-token')
      .send({ displayName: 'Updated name', firebaseUid: 'spoofed-uid', role: 'admin' })

    expect(response.status).toBe(200)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      verifiedUser.id,
      { $set: { displayName: 'Updated name' } },
      { new: true, runValidators: true },
    )
  })

  it('rejects missing and invalid Firebase ID tokens', async () => {
    const app = profileApp()
    expect((await request(app).patch('/api/v1/users/me').send({ displayName: 'Updated name' })).status).toBe(401)
    expect((await request(app).patch('/api/v1/users/me').set('Authorization', 'Bearer invalid-token').send({ displayName: 'Updated name' })).status).toBe(401)
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('returns 405 and the supported methods for unsupported profile methods', async () => {
    const response = await request(profileApp())
      .post('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-firebase-id-token')
      .send({ displayName: 'Updated name' })

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('GET, PATCH')
  })

  it('safely retries profile setup for the same verified Firebase UID', async () => {
    const app = profileApp()
    const sendUpdate = () => request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-firebase-id-token')
      .send({ displayName: 'FoodBridge Person' })

    expect((await sendUpdate()).status).toBe(200)
    expect((await sendUpdate()).status).toBe(200)
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(2)
    for (const [filter, update, options] of vi.mocked(User.findOneAndUpdate).mock.calls) {
      expect(filter).toEqual({ firebaseUid: verifiedUser.firebaseUid })
      expect(update).toMatchObject({ $setOnInsert: { firebaseUid: verifiedUser.firebaseUid, role: 'donor', accountStatus: 'active' } })
      expect(options).toMatchObject({ upsert: true })
    }
    expect(User.findByIdAndUpdate).toHaveBeenNthCalledWith(1, verifiedUser.id, expect.any(Object), expect.any(Object))
    expect(User.findByIdAndUpdate).toHaveBeenNthCalledWith(2, verifiedUser.id, expect.any(Object), expect.any(Object))
  })

  it('returns an error instead of success when the profile update finds no user', async () => {
    vi.spyOn(User, 'findByIdAndUpdate').mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never)
    const response = await request(profileApp())
      .patch('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-firebase-id-token')
      .send({ displayName: 'Updated name' })

    expect(response.status).toBe(404)
    expect(response.body.error.message).toMatch(/profile was not found/i)
  })
})
