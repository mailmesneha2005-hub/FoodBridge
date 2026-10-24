import type { RecordStatus, UserRole, WorkspaceRecord } from '../types/domain'

/** Layout-only sample content. This module is not imported by the API service layer. */
const records = (items: Array<[string, string, RecordStatus, string]>): WorkspaceRecord[] => items.map(([title, detail, status, updatedAt], index) => ({ id: `preview-${index + 1}`, title, detail, status, updatedAt }))

export const previewRecords: Record<string, WorkspaceRecord[]> = {
  donations: records([
    ['Seasonal vegetables', '18 kg · North Market', 'Available', 'Today, 10:30 AM'],
    ['Bakery assortments', '42 packs · Riverside Bakery', 'Requested', 'Today, 9:15 AM'],
    ['Fresh produce boxes', '12 crates · Green Basket', 'Matched', 'Yesterday, 4:20 PM'],
    ['Prepared lunch meals', '30 servings · Community Kitchen', 'Scheduled', 'Yesterday, 1:00 PM'],
    ['Dairy and pantry staples', '25 items · Oak Street Grocer', 'Delivered', 'Oct 18, 11:40 AM'],
  ]),
  requests: records([
    ['Vegetable boxes', 'Eastside Community Pantry', 'Pending review', 'Today, 9:45 AM'],
    ['Bread and pastries', 'Harbor Youth Center', 'Approved', 'Yesterday, 3:10 PM'],
    ['Ready-to-eat meals', 'New Hope Outreach', 'Rejected', 'Oct 18, 2:30 PM'],
  ]),
  pickups: records([
    ['North Market collection', 'Volunteer team · 2:00 PM', 'Scheduled', 'Today, 8:30 AM'],
    ['Riverside Bakery handoff', 'Community Pantry · 11:15 AM', 'Picked up', 'Yesterday, 11:20 AM'],
    ['Green Basket delivery', 'Eastside Pantry · 4:00 PM', 'Delivered', 'Oct 18, 4:12 PM'],
  ]),
  tasks: records([
    ['Collect bakery boxes', 'Riverside Bakery → Harbor Youth Center', 'Available', 'Today, 10:00 AM'],
    ['Deliver produce crates', 'Green Basket → Eastside Pantry', 'Matched', 'Today, 8:45 AM'],
    ['Community kitchen pickup', 'Community Kitchen → New Hope Outreach', 'Delivered', 'Yesterday, 1:40 PM'],
  ]),
  users: records([
    ['Green Basket Co-op', 'Donor · North District', 'Approved', 'Today, 9:00 AM'],
    ['Eastside Community Pantry', 'NGO · East District', 'Pending review', 'Yesterday, 3:30 PM'],
    ['Avery Morgan', 'Volunteer · Central District', 'Approved', 'Oct 18, 12:00 PM'],
  ]),
  verifications: records([
    ['Eastside Community Pantry', 'NGO registration · 3 documents', 'Pending review', 'Today, 9:20 AM'],
    ['Harbor Youth Center', 'NGO registration · 2 documents', 'Approved', 'Yesterday, 2:15 PM'],
  ]),
  history: records([
    ['Bakery assortments', '42 packs · Harbor Youth Center', 'Delivered', 'Oct 18, 11:40 AM'],
    ['Seasonal vegetables', '18 kg · Eastside Community Pantry', 'Delivered', 'Oct 16, 2:05 PM'],
    ['Prepared lunch meals', '30 servings · New Hope Outreach', 'Cancelled', 'Oct 14, 12:30 PM'],
  ]),
  analytics: records([
    ['Food diverted from waste', 'Illustrative preview metric', 'Delivered', 'Current period'],
    ['Successful community handoffs', 'Illustrative preview metric', 'Matched', 'Current period'],
    ['Active local partners', 'Illustrative preview metric', 'Approved', 'Current period'],
  ]),
}

export const dashboardSummary: Record<UserRole, { active: string; completed: string; attention: string }> = {
  donor: { active: '12', completed: '38', attention: '3' },
  ngo: { active: '8', completed: '24', attention: '2' },
  volunteer: { active: '4', completed: '16', attention: '1' },
  admin: { active: '26', completed: '104', attention: '5' },
}
