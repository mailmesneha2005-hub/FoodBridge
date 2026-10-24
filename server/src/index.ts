import { createServer } from 'node:http'
import { createApp } from './app.js'
import { connectDatabase } from './config/database.js'
import { env } from './config/env.js'
import { disconnectDatabase } from './config/database.js'
import { configureRealtime } from './realtime/socket.js'
import { isFirebaseAdminConfigured } from './middleware/authenticate.js'

const app = createApp()
const httpServer = createServer(app)
const io = configureRealtime(httpServer)

async function start() {
  try {
    if (env.NODE_ENV === 'production' && !isFirebaseAdminConfigured()) {
      throw new Error('Firebase Admin could not be initialized. Check FIREBASE_PROJECT_ID and the configured production credentials.')
    }
    try { await connectDatabase() } catch (error) {
      if (env.NODE_ENV === 'production') {
        console.error(JSON.stringify({ level: 'error', message: 'mongodb_connection_failed', errorName: error instanceof Error ? error.name : 'UnknownError' }))
        throw new Error('MongoDB connection failed. Check MONGODB_URI, database network access and credentials.')
      }
      console.error('MongoDB is not available; API will start with data routes returning 503.', error)
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject)
      httpServer.listen(env.PORT, () => {
        httpServer.removeListener('error', reject)
        console.info(JSON.stringify({ level: 'info', message: 'server_listening', port: env.PORT, environment: env.NODE_ENV }))
        resolve()
      })
    })
  } catch (error) {
    console.error('Failed to start FoodBridge API:', error)
    process.exitCode = 1
  }
}

let shuttingDown = false
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`${signal} received; shutting down FoodBridge API.`)
  const forceExit = setTimeout(() => process.exit(1), 10_000)
  forceExit.unref()
  try {
    await io.close()
    await disconnectDatabase()
    clearTimeout(forceExit)
    process.exit(0)
  } catch (error) { console.error('Error during shutdown:', error); process.exit(1) }
}
process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

void start()
