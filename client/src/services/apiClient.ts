import { firebaseAuth } from './firebase'

export function resolveApiBase(apiUrl: string | undefined, isDevelopment: boolean) {
  const configured = apiUrl?.trim()
  if (!configured) return isDevelopment ? '/api' : ''

  const normalized = configured.replace(/\/+$/, '')
  if (isDevelopment) return normalized

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return ''
    return normalized
  } catch {
    return ''
  }
}

const apiBase = resolveApiBase(import.meta.env.VITE_API_URL, import.meta.env.DEV)

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = 'ApiError' }
}

export interface ApiPage<T> { items: T[]; page: number; limit: number; total: number; pages: number }

async function authenticatedFetch(path: string, options: RequestInit = {}) {
  if (!apiBase) throw new ApiError('FoodBridge is not connected to its API. Set VITE_API_URL to the deployed API base URL ending in /api, then rebuild the client.', 503, 'API_NOT_CONFIGURED')
  if (!firebaseAuth?.currentUser) throw new ApiError('Your FoodBridge session is not available. Sign in and try again.', 401, 'NO_SESSION')
  const token = await firebaseAuth.currentUser.getIdToken()
  const response = await fetch(`${apiBase}/v1${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${token}`, ...options.headers },
  })
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError('FoodBridge received a web page instead of an API response. Check that VITE_API_URL points to the deployed backend, not the frontend site.', response.ok ? 502 : response.status, 'API_NOT_REACHED')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body.error?.message || `The request failed (${response.status}).`, response.status, body.error?.code)
  return body
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const body = await authenticatedFetch(path, options)
  return body.data as T
}

export async function apiList<T>(path: string): Promise<ApiPage<T>> {
  const body = await authenticatedFetch(path)
  return { items: body.data as T[], page: body.meta?.page ?? 1, limit: body.meta?.limit ?? 20, total: body.meta?.total ?? 0, pages: body.meta?.pages ?? 0 }
}
