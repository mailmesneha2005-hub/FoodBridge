export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'admin'
export type RecordStatus = 'Available' | 'Requested' | 'Matched' | 'Scheduled' | 'Picked up' | 'Delivered' | 'Pending review' | 'Approved' | 'Rejected' | 'Cancelled'

export interface WorkspaceRecord {
  id: string
  title: string
  detail: string
  status: RecordStatus
  updatedAt: string
}

export interface DonationDraft {
  title: string
  category: string
  quantity: number
  unit: string
  pickupBy: string
  pickupAddress: string
  notes?: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
