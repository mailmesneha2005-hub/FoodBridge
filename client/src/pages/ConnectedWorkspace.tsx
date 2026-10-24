import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { EmptyState, ErrorState, PageHeader } from '../components/ui/FeedbackState'
import { FormField } from '../components/ui/FormField'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { ResponsiveTable, type TableColumn } from '../components/ui/ResponsiveTable'
import { Button } from '../components/Button'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import { apiList, apiRequest } from '../services/apiClient'
import { firebaseAuth, profileStoreMode } from '../services/firebase'
import { readNgoProfile, readProfile, updateProfile } from '../services/profileStore'
import type { UserRole } from '../types/domain'

type DonationRecord = { _id: string; title: string; category: string; status: string; quantity: { amount: number; unit: string }; safeUseDeadline: string; address: { city: string; region: string }; updatedAt: string }
type DonationRef = string | { title?: string; category?: string; quantity?: { amount: number; unit: string }; address?: { city?: string; region?: string } }
type PickupRecord = { _id: string; donationId: DonationRef; assignmentStatus: string; pickupTime?: string; updatedAt: string }
type AccountRecord = { displayName: string; email: string; phone?: string; role: UserRole; accountStatus: string; profile?: { address?: string; bio?: string } }
type OrganizationRecord = { ownerUid?: string; organizationName: string; address: { line1: string; line2?: string; city: string; region: string; postalCode?: string; country: string }; registration: { number: string }; capacity: { mealsPerDay: number; storageNotes?: string }; verificationStatus: string }

const stateStyle = (state: string): 'success' | 'warning' | 'danger' | 'neutral' => state === 'delivered' || state === 'approved' || state === 'active' ? 'success' : state === 'pending' || state === 'assigned' || state === 'picked_up' ? 'warning' : state === 'cancelled' || state === 'expired' || state === 'rejected' ? 'danger' : 'neutral'
const readable = (value: string) => value.replaceAll('_', ' ')
const date = (value?: string) => value ? new Date(value).toLocaleDateString([], { dateStyle: 'medium' }) : 'Not scheduled'

export function ConnectedWorkspace({ pathname, role }: { pathname: string; role: UserRole }) {
  if (pathname === '/donor/history') return <DonorHistory/>
  if (pathname === '/ngo/pickups') return <NgoPickups/>
  if (pathname === '/ngo/history') return <NgoPickups history/>
  if (pathname.endsWith('/profile')) return <AccountProfile role={role}/>
  return <EmptyState title="This section is unavailable" description="Choose another section from the workspace navigation."/>
}

function DonorHistory() {
  const [rows, setRows] = useState<DonationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const pages = await Promise.all(['delivered','cancelled','expired'].map(status => apiList<DonationRecord>(`/donor/donations?status=${status}&limit=100`)))
      setRows(pages.flatMap(result => result.items).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load donation history.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const columns: TableColumn<DonationRecord>[] = [
    { key: 'food', header: 'Food offer', cell: row => <span className="font-bold">{row.title}</span> },
    { key: 'category', header: 'Category', cell: row => row.category },
    { key: 'quantity', header: 'Quantity', cell: row => `${row.quantity.amount} ${row.quantity.unit}` },
    { key: 'location', header: 'Pickup area', cell: row => `${row.address.city}, ${row.address.region}` },
    { key: 'deadline', header: 'Safe-use deadline', cell: row => date(row.safeUseDeadline) },
    { key: 'status', header: 'Final status', cell: row => <Badge variant={stateStyle(row.status)}><span className="capitalize">{readable(row.status)}</span></Badge> },
  ]
  return <div className="space-y-5"><PageHeader eyebrow="Donor workspace" title="Donation history" description="Completed, cancelled and expired offers from your FoodBridge account."/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<Card className="p-2 sm:p-4">{loading ? <div className="space-y-3 p-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-14"/>)}</div> : <ResponsiveTable columns={columns} rows={rows} rowKey={row => row._id} empty={<EmptyState title="No completed donation history" description="Donations will appear here when they are delivered, cancelled or expire."/>}/>}</Card></div>
}

function NgoPickups({ history = false }: { history?: boolean }) {
  const [rows, setRows] = useState<PickupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await apiList<PickupRecord>(`/pickups?limit=100${history ? '&status=delivered' : ''}`)
      setRows(result.items)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load pickup records.') }
    finally { setLoading(false) }
  }, [history])
  useEffect(() => { void load() }, [load])
  const columns: TableColumn<PickupRecord>[] = [
    { key: 'food', header: 'Donation', cell: row => <span className="font-bold">{typeof row.donationId === 'string' ? 'Food donation' : row.donationId.title || 'Food donation'}</span> },
    { key: 'category', header: 'Category', cell: row => typeof row.donationId === 'string' ? '—' : row.donationId.category || '—' },
    { key: 'quantity', header: 'Quantity', cell: row => typeof row.donationId === 'string' || !row.donationId.quantity ? '—' : `${row.donationId.quantity.amount} ${row.donationId.quantity.unit}` },
    { key: 'location', header: 'Pickup area', cell: row => typeof row.donationId === 'string' ? '—' : `${row.donationId.address?.city || '—'}, ${row.donationId.address?.region || ''}` },
    { key: 'pickup', header: 'Pickup time', cell: row => date(row.pickupTime) },
    { key: 'status', header: 'Status', cell: row => <Badge variant={stateStyle(row.assignmentStatus)}><span className="capitalize">{readable(row.assignmentStatus)}</span></Badge> },
  ]
  return <div className="space-y-5"><PageHeader eyebrow="NGO workspace" title={history ? 'Pickup history' : 'Pickups'} description={history ? 'Completed deliveries linked to your approved donation requests.' : 'Track the pickup and delivery progress for your approved requests.'}/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<Card className="p-2 sm:p-4">{loading ? <div className="space-y-3 p-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-14"/>)}</div> : <ResponsiveTable columns={columns} rows={rows} rowKey={row => row._id} empty={<EmptyState title={history ? 'No completed pickups yet' : 'No pickups scheduled'} description={history ? 'Completed handoffs for your organization will appear here.' : 'A pickup record appears here after a donor approves your request.'}/>}/>}</Card></div>
}

function AccountProfile({ role }: { role: UserRole }) {
  const { refreshProfile } = useAuth()
  const toast = useToast()
  const [account, setAccount] = useState<AccountRecord | null>(null)
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const currentUser = firebaseAuth?.currentUser
      if (profileStoreMode === 'firestore' && !currentUser) throw new Error('Sign in again to load your profile.')
      const user = profileStoreMode === 'firestore'
        ? await readProfile(currentUser!.uid)
        : await apiRequest<AccountRecord>('/users/me')
      setAccount(user)
      if (role === 'ngo') {
        try {
          const value = profileStoreMode === 'firestore'
            ? await readNgoProfile(currentUser!.uid)
            : await apiRequest<OrganizationRecord>('/users/me/ngo-profile')
          setOrganization(value)
        }
        catch (reason) { if (reason instanceof Error && !/not found/i.test(reason.message)) throw reason; setOrganization(null) }
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load your profile.') }
    finally { setLoading(false) }
  }, [role])
  useEffect(() => { void load() }, [load])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!account) return
    setSaving(true); setError('')
    const values = new FormData(event.currentTarget)
    try {
      const changes = { displayName: String(values.get('displayName') || '').trim(), phone: String(values.get('phone') || '').trim() || undefined, profile: { address: String(values.get('address') || '').trim() || undefined, bio: String(values.get('bio') || '').trim() || undefined } }
      const updated = profileStoreMode === 'firestore'
        ? await updateProfile(firebaseAuth!.currentUser!.uid, changes)
        : await apiRequest<AccountRecord>('/users/me', { method: 'PATCH', body: JSON.stringify(changes) })
      setAccount(updated); await refreshProfile(); toast({ title: 'Profile saved', message: 'Your account details were updated.', variant: 'success' })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your profile could not be saved.') }
    finally { setSaving(false) }
  }
  return <div className="space-y-5"><PageHeader eyebrow={`${role} workspace`} title={role === 'ngo' ? 'Organization profile' : 'My profile'} description="Manage the contact information associated with your verified FoodBridge account."/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">{loading ? <LoadingSkeleton className="h-80"/> : account && <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-extrabold text-ink">Account details</h2><p className="mt-1 text-sm text-muted">Your role and email identity are managed by FoodBridge and Firebase.</p><form onSubmit={event => void submit(event)} className="mt-5 space-y-4"><FormField id="profile-name" name="displayName" label="Display name" required defaultValue={account.displayName}/><FormField id="profile-email" label="Email address" type="email" value={account.email} disabled/><FormField id="profile-phone" name="phone" label="Phone number" type="tel" defaultValue={account.phone || ''}/><FormField id="profile-address" name="address" label="Address" defaultValue={account.profile?.address || ''}/><FormField id="profile-bio" name="bio" label="About you" defaultValue={account.profile?.bio || ''}><textarea id="profile-bio" name="bio" rows={3} defaultValue={account.profile?.bio || ''} className="field-control" maxLength={1000}/></FormField><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button><Badge variant={stateStyle(account.accountStatus)}><span className="capitalize">{readable(account.accountStatus)} account</span></Badge></div></form></Card>}{role === 'ngo' && !loading && <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-extrabold text-ink">Organization details</h2>{organization ? <><p className="mt-1 text-sm text-muted">Submitted verification information on file.</p><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Organization</dt><dd className="mt-1 font-semibold text-ink">{organization.organizationName}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Registration number</dt><dd className="mt-1 text-ink">{organization.registration.number}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Service location</dt><dd className="mt-1 text-ink">{organization.address.line1}, {organization.address.city}, {organization.address.region}, {organization.address.country}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Capacity</dt><dd className="mt-1 text-ink">{organization.capacity.mealsPerDay} meals per day</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Verification</dt><dd className="mt-2"><Badge variant={stateStyle(organization.verificationStatus)}><span className="capitalize">{readable(organization.verificationStatus)}</span></Badge></dd></div></dl></> : <EmptyState title="Organization details unavailable" description="No organization profile was returned for this account. Contact support if you expected an application to be on file."/>}</Card>}</div></div>
}
