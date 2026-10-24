import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { EmptyState, ErrorState, PageHeader } from '../components/ui/FeedbackState'
import { FormField } from '../components/ui/FormField'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { ResponsiveTable, type TableColumn } from '../components/ui/ResponsiveTable'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Button } from '../components/Button'
import { apiList, apiRequest, type ApiPage } from '../services/apiClient'
import { useToast } from '../components/ui/Toast'

type UserRow = { _id: string; displayName: string; email: string; role: string; accountStatus: string; createdAt: string }
type NgoRow = { _id: string; organizationName: string; userId: string; address: { city: string; region: string; country: string }; registration: { number: string }; capacity: { mealsPerDay: number }; verificationStatus: string; createdAt: string }
type DonationRow = { _id: string; title: string; category: string; status: string; quantity: { amount: number; unit: string }; safeUseDeadline: string; address: { city: string; region: string }; createdAt: string }
type Analytics = { donations: number; users: number; verifiedNgos: number; deliveredDonations: number; donationsByStatus: Array<{ _id: string; count: number }> }
type ActionTarget = { item: NgoRow; decision: 'approve' | 'reject' }

const variant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => status === 'active' || status === 'approved' || status === 'delivered' ? 'success' : status === 'pending' || status === 'available' ? 'warning' : status === 'rejected' || status === 'suspended' || status === 'cancelled' || status === 'expired' ? 'danger' : 'neutral'
const label = (value: string) => value.replaceAll('_', ' ')
const date = (value: string) => new Date(value).toLocaleDateString([], { dateStyle: 'medium' })

function useAdminPage<T>(path: string) {
  const [page, setPage] = useState<ApiPage<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setPage(await apiList<T>(path)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load this admin view.') }
    finally { setLoading(false) }
  }, [path])
  useEffect(() => { void load() }, [load])
  return { page, loading, error, load }
}

export function AdminWorkspace({ pathname }: { pathname: string }) {
  if (pathname === '/admin/dashboard' || pathname === '/admin/analytics') return <AdminAnalytics analyticsOnly={pathname.endsWith('/analytics')}/>
  if (pathname === '/admin/verifications') return <AdminVerifications/>
  if (pathname === '/admin/users') return <AdminUsers/>
  return <AdminDonations/>
}

function AdminAnalytics({ analyticsOnly }: { analyticsOnly: boolean }) {
  const [data, setData] = useState<Analytics | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await apiRequest<Analytics>('/admin/analytics')) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load platform analytics.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const stats = data ? [
    ['Donations listed', data.donations], ['Completed handoffs', data.deliveredDonations], ['Registered users', data.users], ['Verified NGOs', data.verifiedNgos],
  ] as const : []
  return <div className="space-y-5"><PageHeader eyebrow="Administrator workspace" title={analyticsOnly ? 'Platform analytics' : 'Platform overview'} description="Live counts from FoodBridge records stored in MongoDB."/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{loading ? [1,2,3,4].map(item => <LoadingSkeleton key={item} className="h-28"/>) : stats.map(([name,value]) => <Card key={name} className="p-5"><p className="text-sm font-semibold text-muted">{name}</p><p className="mt-3 font-display text-3xl font-extrabold text-ink">{value.toLocaleString()}</p></Card>)}</div>{!loading && !error && data && <Card className="p-5"><h2 className="font-display text-lg font-extrabold text-ink">Donations by status</h2>{data.donationsByStatus.length ? <div className="mt-4 flex flex-wrap gap-2">{data.donationsByStatus.map(item => <span key={item._id} className="inline-flex items-center gap-2 rounded-xl border border-[#e8eee9] px-3 py-2 text-sm"><span className="capitalize text-muted">{label(item._id)}</span><strong className="text-ink">{item.count}</strong></span>)}</div> : <p className="mt-3 text-sm text-muted">No donation records have been created.</p>}<p className="mt-4 text-xs text-muted">These totals are calculated from persisted platform records. Quantity totals are not reported because donation quantities can use different units.</p></Card>}</div>
}

function AdminVerifications() {
  const { page, loading, error, load } = useAdminPage<NgoRow>('/admin/verifications?limit=100')
  const [action, setAction] = useState<ActionTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const decide = async () => {
    if (!action) return
    setBusy(true)
    try { await apiRequest(`/admin/verifications/${encodeURIComponent(action.item._id)}/decision`, { method: 'PATCH', body: JSON.stringify({ decision: action.decision }) }); toast({ title: action.decision === 'approve' ? 'NGO verified' : 'Application rejected', message: action.item.organizationName, variant: 'success' }); setAction(null); await load() }
    catch (reason) { toast({ title: 'Could not save the decision', message: reason instanceof Error ? reason.message : 'Try again.', variant: 'error' }) }
    finally { setBusy(false) }
  }
  const columns: TableColumn<NgoRow>[] = [
    { key: 'organization', header: 'Organization', cell: row => <span className="font-bold">{row.organizationName}</span> },
    { key: 'location', header: 'Location', cell: row => `${row.address.city}, ${row.address.region}` },
    { key: 'registration', header: 'Registration', cell: row => row.registration.number },
    { key: 'capacity', header: 'Daily capacity', cell: row => `${row.capacity.mealsPerDay} meals` },
    { key: 'submitted', header: 'Submitted', cell: row => date(row.createdAt) },
    { key: 'actions', header: 'Review', cell: row => <div className="flex gap-2"><Button aria-label={`Approve ${row.organizationName}`} onClick={() => setAction({ item: row, decision: 'approve' })}><Check size={15}/> Approve</Button><Button aria-label={`Reject ${row.organizationName}`} variant="secondary" onClick={() => setAction({ item: row, decision: 'reject' })}><X size={15}/> Reject</Button></div> },
  ]
  return <div className="space-y-5"><PageHeader eyebrow="Administrator workspace" title="NGO verifications" description="Review submitted organization details before they can request donations."/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<Card className="p-2 sm:p-4">{loading ? <div className="space-y-3 p-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-16"/>)}</div> : <ResponsiveTable columns={columns} rows={page?.items ?? []} rowKey={row => row._id} empty={<EmptyState title="No applications awaiting review" description="New NGO applications will appear here after registration."/>}/>}</Card><ConfirmDialog open={Boolean(action)} onClose={() => setAction(null)} onConfirm={() => void decide()} disabled={busy} title={action?.decision === 'approve' ? 'Approve NGO verification?' : 'Reject NGO application?'} confirmLabel={busy ? 'Saving…' : action?.decision === 'approve' ? 'Approve organization' : 'Reject application'} destructive={action?.decision === 'reject'} message={action ? `${action.item.organizationName} will be ${action.decision === 'approve' ? 'verified and enabled to request food' : 'marked as rejected'}. This decision is recorded by the server.` : ''}/></div>
}

function AdminUsers() {
  const { page, loading, error, load } = useAdminPage<UserRow>('/admin/users?limit=100')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const rows = useMemo(() => (page?.items ?? []).filter(user => (role === 'all' || user.role === role) && (!query.trim() || `${user.displayName} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase()))), [page, query, role])
  const columns: TableColumn<UserRow>[] = [
    { key: 'name', header: 'User', cell: row => <span className="font-bold">{row.displayName}</span> },
    { key: 'email', header: 'Email', cell: row => row.email },
    { key: 'role', header: 'Role', cell: row => <span className="capitalize">{row.role}</span> },
    { key: 'status', header: 'Account', cell: row => <Badge variant={variant(row.accountStatus)}><span className="capitalize">{label(row.accountStatus)}</span></Badge> },
    { key: 'joined', header: 'Joined', cell: row => date(row.createdAt) },
  ]
  return <div className="space-y-5"><PageHeader eyebrow="Administrator workspace" title="Users" description="Review FoodBridge accounts and their server-assigned roles."/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<Card className="p-4"><div className="grid gap-3 sm:grid-cols-[1fr_14rem]"><label className="relative"><span className="sr-only">Search users</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} className="field-control pl-9" placeholder="Search name or email"/></label><FormField id="user-role-filter" label="Filter by role"><select id="user-role-filter" className="field-control" value={role} onChange={event => setRole(event.target.value)}><option value="all">All roles</option><option value="donor">Donors</option><option value="ngo">NGOs</option><option value="volunteer">Volunteers</option><option value="admin">Administrators</option></select></FormField></div><div className="mt-4">{loading ? <div className="space-y-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-14"/>)}</div> : <ResponsiveTable columns={columns} rows={rows} rowKey={row => row._id} empty={<EmptyState title="No matching users" description="Try a different name, email or role filter."/>}/>}</div><p className="mt-3 text-xs text-muted">Showing {rows.length} of {page?.total ?? 0} accounts loaded from the API.</p></Card></div>
}

function AdminDonations() {
  const [status, setStatus] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const path = `/admin/donations?limit=20&page=${pageNumber}${status ? `&status=${encodeURIComponent(status)}` : ''}`
  const { page, loading, error, load } = useAdminPage<DonationRow>(path)
  const columns: TableColumn<DonationRow>[] = [
    { key: 'food', header: 'Food offer', cell: row => <span className="font-bold">{row.title}</span> },
    { key: 'category', header: 'Category', cell: row => row.category },
    { key: 'quantity', header: 'Quantity', cell: row => `${row.quantity.amount} ${row.quantity.unit}` },
    { key: 'location', header: 'Pickup area', cell: row => `${row.address.city}, ${row.address.region}` },
    { key: 'deadline', header: 'Safe-use deadline', cell: row => date(row.safeUseDeadline) },
    { key: 'status', header: 'Status', cell: row => <Badge variant={variant(row.status)}><span className="capitalize">{label(row.status)}</span></Badge> },
  ]
  return <div className="space-y-5"><PageHeader eyebrow="Administrator workspace" title="Donations" description="Monitor food offers and their current handoff status."/>{error && <ErrorState description={error} onRetry={() => void load()}/>}<Card className="p-4"><div className="max-w-xs"><FormField id="donation-status-filter" label="Filter by status"><select className="field-control" id="donation-status-filter" value={status} onChange={event => { setStatus(event.target.value); setPageNumber(1) }}><option value="">All statuses</option>{['available','requested','matched','picked_up','delivered','cancelled','expired'].map(item => <option key={item} value={item} className="capitalize">{label(item)}</option>)}</select></FormField></div><div className="mt-4">{loading ? <div className="space-y-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-14"/>)}</div> : <ResponsiveTable columns={columns} rows={page?.items ?? []} rowKey={row => row._id} empty={<EmptyState title="No donations found" description="Food offers matching this status will appear here."/>}/>}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-muted">{page?.total ?? 0} matching donations</p><div className="flex items-center gap-2"><Button variant="secondary" disabled={pageNumber <= 1 || loading} onClick={() => setPageNumber(value => value - 1)}>Previous</Button><span className="text-xs text-muted">Page {page?.page ?? pageNumber} of {Math.max(1,page?.pages ?? 1)}</span><Button variant="secondary" disabled={loading || pageNumber >= (page?.pages ?? 1)} onClick={() => setPageNumber(value => value + 1)}>Next</Button></div></div></Card></div>
}
