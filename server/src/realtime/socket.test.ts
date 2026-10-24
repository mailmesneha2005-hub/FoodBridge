import { createServer, type AddressInfo } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'
import type { Server as SocketServer } from 'socket.io'
import type { RequestUser } from '../types/auth.js'
import { authorizedRooms, canAccessNotificationRoom, configureRealtime, publishToRole, publishToUser, roleRoom, userRoom } from './socket.js'

const donor:RequestUser={id:'user-donor-1',firebaseUid:'firebase-1',email:'donor@example.test',displayName:'Donor',role:'donor',accountStatus:'active'}
const volunteer:RequestUser={id:'volunteer-1',firebaseUid:'firebase-2',email:'volunteer@example.test',displayName:'Volunteer',role:'volunteer',accountStatus:'active'}
let httpServer:ReturnType<typeof createServer>, socketServer:SocketServer, origin:string, clients:ClientSocket[]
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

function connect(token:string, options:Record<string,unknown>={}) {
  const client=createClient(origin,{autoConnect:false,transports:['websocket'],reconnection:false,timeout:1500,...options,auth:{token}})
  clients.push(client)
  client.connect()
  return client
}
function ready(client:ClientSocket) { return new Promise<void>((resolve,reject)=>{client.once('ready',()=>resolve());client.once('connect_error',reject)}) }

beforeEach(async()=>{
  clients=[]; httpServer=createServer()
  socketServer=configureRealtime(httpServer,async token=>{if(token==='donor-token-12345678901234567890')return donor;if(token==='volunteer-token-12345678901234567890')return volunteer;throw new Error('invalid token')})
  await new Promise<void>(resolve=>httpServer.listen(0,'127.0.0.1',resolve))
  origin=`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
})
afterEach(async()=>{
  clients.forEach(client=>client.disconnect())
  await new Promise<void>(resolve=>socketServer.close(()=>resolve()))
})

describe('authenticated Socket.IO notifications and pickup events',()=>{
  it('rejects missing and invalid credentials before joining any room',async()=>{
    const client=connect('invalid-token-12345678901234567890')
    const missing=createClient(origin,{autoConnect:false,transports:['websocket'],reconnection:false,auth:{}});clients.push(missing);missing.connect()
    await Promise.all([client,missing].map(socket=>expect(new Promise((resolve,reject)=>{socket.once('ready',resolve);socket.once('connect_error',reject)})).rejects.toThrow(/unauthorized/)))
    expect(socketServer.sockets.sockets.size).toBe(0)
  })

  it('joins only server-authorized identity and role rooms and isolates private notifications',async()=>{
    const donorClient=connect('donor-token-12345678901234567890'), volunteerClient=connect('volunteer-token-12345678901234567890')
    await Promise.all([ready(donorClient),ready(volunteerClient)])
    const rooms=authorizedRooms(volunteer)
    expect(rooms).toEqual([userRoom(volunteer.id),roleRoom('volunteer')])
    expect(canAccessNotificationRoom(volunteer,volunteer.id)).toBe(true)
    expect(canAccessNotificationRoom(volunteer,donor.id)).toBe(false)
    const donorReceived=vi.fn(), volunteerReceived=vi.fn()
    donorClient.on('notifications:refresh',donorReceived); volunteerClient.on('notifications:refresh',volunteerReceived)
    publishToUser(donor.id,'notifications:refresh')
    await sleep(40)
    expect(donorReceived).toHaveBeenCalledTimes(1)
    expect(volunteerReceived).not.toHaveBeenCalled()
    const availableForVolunteer=vi.fn(), leakedToDonor=vi.fn()
    volunteerClient.on('pickup:available',availableForVolunteer);donorClient.on('pickup:available',leakedToDonor)
    publishToRole('volunteer','pickup:available',{taskId:'task-1'})
    await sleep(40)
    expect(availableForVolunteer).toHaveBeenCalledTimes(1)
    expect(leakedToDonor).not.toHaveBeenCalled()
  })

  it('reauthenticates on reconnect and announces a fresh connection for API state recovery',async()=>{
    const verify=vi.fn(async token=>{if(token==='volunteer-token-12345678901234567890')return volunteer;throw new Error('invalid token')})
    await new Promise<void>(resolve=>socketServer.close(()=>resolve()))
    httpServer=createServer()
    socketServer=configureRealtime(httpServer,verify)
    await new Promise<void>(resolve=>httpServer.listen(0,'127.0.0.1',resolve))
    origin=`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`
    const client=createClient(origin,{autoConnect:false,transports:['websocket'],reconnection:true,reconnectionDelay:30,reconnectionDelayMax:60,auth:{token:'volunteer-token-12345678901234567890'}})
    clients.push(client)
    let connects=0, readyEvents=0
    client.on('connect',()=>{connects++; if(connects===1) setTimeout(()=>{const serverSocket=[...socketServer.sockets.sockets.values()][0];serverSocket?.conn.close()},30)})
    client.on('ready',()=>{readyEvents++})
    client.connect()
    await vi.waitFor(()=>expect(readyEvents).toBeGreaterThanOrEqual(2),{timeout:3000})
    expect(connects).toBeGreaterThanOrEqual(2)
    expect(verify).toHaveBeenCalledTimes(2)
  })
})
