import type { DonationDraft, PageResult, UserRole, WorkspaceRecord } from '../types/domain'

/** Typed contracts for the future API adapter. Dashboard preview fixtures live in ../fixtures, never here. */
export interface ListQuery {
  search?: string
  status?: string
  sortBy?: 'title' | 'updatedAt'
  direction?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface FoodBridgeApi {
  getDashboard(role: UserRole): Promise<{ role: UserRole; activeCount: number; completedCount: number }>
  listRecords(scope: string, query: ListQuery): Promise<PageResult<WorkspaceRecord>>
  createDonation(input: DonationDraft): Promise<WorkspaceRecord>
  listNotifications(query: ListQuery): Promise<PageResult<WorkspaceRecord>>
}
