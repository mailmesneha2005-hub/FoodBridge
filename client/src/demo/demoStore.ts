export type DemoRole = 'donor' | 'ngo' | 'volunteer' | 'admin'
export type DemoRequestStatus = 'pending' | 'approved' | 'rejected'
export type DemoDonationStatus = 'available' | 'requested' | 'matched' | 'picked_up' | 'delivered' | 'cancelled'
export type DemoEvent = { label: string; actor: string; at: string }
export type DemoRequest = { id: string; status: DemoRequestStatus; createdAt: string; decidedAt?: string }
export type DemoDonation = {
  id: string; title: string; category: string; amount: number; unit: string; city: string; donor: string
  pickupBy: string; safeUseDeadline: string; pickupStart: string; pickupEnd: string; meals?: number; foodType: 'cooked'|'raw'; notes: string; status: DemoDonationStatus; request?: DemoRequest
  volunteer?: string; events: DemoEvent[]; createdAt: string
}
export type DemoNotification = { id: string; role: DemoRole; message: string; at: string; read: boolean }
export type DemoState = { version: 1; ngoVerified: boolean; donations: DemoDonation[]; notifications: DemoNotification[] }

// One shared localStorage key is used by every role in the demo; do not split
// donor/NGO state into per-role keys or data disappears when switching roles.
export const demoStorageKey = 'foodbridge-local-demo-v1'
const key = demoStorageKey
const initial: DemoState = { version: 1, ngoVerified: false, donations: [], notifications: [] }
export function readDemoState(): DemoState {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null') as Partial<DemoState> | null
    if (parsed?.version === 1 && Array.isArray(parsed.donations) && Array.isArray(parsed.notifications) && typeof parsed.ngoVerified === 'boolean') return parsed as DemoState
  } catch { /* damaged or unavailable local storage falls back to a clear empty demo */ }
  return initial
}
export function writeDemoState(state: DemoState) { localStorage.setItem(key, JSON.stringify(state)) }
export function addDemoNotification(state: DemoState, role: DemoRole, message: string): DemoState {
  return { ...state, notifications: [{ id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, message, at: new Date().toISOString(), read: false }, ...state.notifications] }
}
