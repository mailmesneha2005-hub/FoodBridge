import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { firebaseAuth } from '../services/firebase'

type RealtimeState = { socket: Socket | null; revision: number; connected: boolean }
const Context = createContext<RealtimeState>({ socket: null, revision: 0, connected: false })

function socketOrigin() {
  const configured = import.meta.env.VITE_API_URL || '/api'
  return configured.startsWith('http') ? new URL(configured).origin : window.location.origin
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, profile } = useAuth()
  const [socket, setSocket] = useState<Socket|null>(null)
  const [revision, setRevision] = useState(0)
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    const auth = firebaseAuth
    if (!firebaseUser || !profile || !auth) { setSocket(null); setConnected(false); return }
    let active=true, connection:Socket|null=null
    void import('socket.io-client').then(({io})=>{
      if(!active)return
      connection=io(socketOrigin(), {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        auth: callback => { void auth.currentUser?.getIdToken().then(token => callback({token})).catch(() => callback({token:''})) },
      })
      connection.on('connect', () => { setConnected(true); setRevision(value => value + 1) })
      connection.on('disconnect', () => setConnected(false))
      setSocket(connection)
      connection.connect()
    })
    return () => { active=false; connection?.removeAllListeners(); connection?.disconnect(); setSocket(null); setConnected(false) }
  }, [firebaseUser?.uid, profile?.id, profile?.role, profile?.accountStatus])
  const value = useMemo(() => ({socket,revision,connected}),[socket,revision,connected])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useRealtime() { return useContext(Context) }
