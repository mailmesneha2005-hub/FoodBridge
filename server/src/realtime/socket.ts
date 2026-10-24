import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { env } from '../config/env.js'
import { authenticateSocketUser } from '../middleware/authenticate.js'
import type { RequestUser } from '../types/auth.js'

type TokenVerifier = (token: string) => Promise<RequestUser>
let realtime: Server | null = null

export function userRoom(userId: string) { return `user:${userId}` }
export function roleRoom(role: string) { return `role:${role}` }
export function authorizedRooms(user: Pick<RequestUser,'id'|'role'|'accountStatus'>) {
  return user.accountStatus === 'active' ? [userRoom(user.id), roleRoom(user.role)] : [userRoom(user.id)]
}
export function canAccessNotificationRoom(user: Pick<RequestUser,'id'>, recipientId: string) { return user.id === recipientId }

export function configureRealtime(httpServer: HttpServer, verifyToken: TokenVerifier = authenticateSocketUser) {
  const io = new Server(httpServer, { cors: { origin: env.CLIENT_ORIGIN, methods: ['GET','POST'], credentials: true } })
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string' || token.length < 20) return next(new Error('unauthorized'))
    try { socket.data.foodbridgeUser = await verifyToken(token); next() }
    catch { next(new Error('unauthorized')) }
  })
  io.on('connection', socket => {
    const user = socket.data.foodbridgeUser as RequestUser
    for (const room of authorizedRooms(user)) socket.join(room)
    socket.emit('ready', { service: 'foodbridge-api', recovered: Boolean(socket.recovered) })
  })
  realtime = io
  return io
}

export function publishToUser(userId: string, event: string, payload?: unknown) { realtime?.to(userRoom(userId)).emit(event, payload) }
export function publishToRole(role: string, event: string, payload?: unknown) { realtime?.to(roleRoom(role)).emit(event, payload) }
export function closeRealtime() { const current = realtime; realtime = null; return current?.close() }

export function socketUser(socket: Socket): RequestUser | undefined { return socket.data.foodbridgeUser as RequestUser | undefined }
