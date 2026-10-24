import type { Request } from 'express'

export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'admin'
export type AccountStatus = 'active' | 'pending' | 'suspended'

export interface RequestUser {
  id: string
  firebaseUid: string
  email: string
  displayName: string
  role: UserRole
  accountStatus: AccountStatus
}

declare global {
  namespace Express {
    interface Request { authUser?: RequestUser }
  }
}

export type AuthenticatedRequest = Request & { authUser: RequestUser }
