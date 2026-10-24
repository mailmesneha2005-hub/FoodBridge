import { Bell, ClipboardCheck, HandHeart, LayoutDashboard, MapPin, PackagePlus, PackageSearch, PackageCheck, UsersRound, UserRound, ChartNoAxesCombined, FileCheck2, History } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../Brand'
import type { UserRole } from '../../types/domain'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from './Toast'
import { Button } from '../Button'

const items: Record<UserRole, Array<{ label: string; to: string; icon: typeof LayoutDashboard }>> = {
  donor: [
    { label: 'Overview', to: '/donor/dashboard', icon: LayoutDashboard },
    { label: 'My donations', to: '/donor/donations', icon: PackageCheck },
    { label: 'New donation', to: '/donor/donations/new', icon: PackagePlus },
    { label: 'Requests', to: '/donor/requests', icon: ClipboardCheck },
    { label: 'History', to: '/donor/history', icon: History },
    { label: 'My profile', to: '/donor/profile', icon: UserRound },
  ],
  ngo: [
    { label: 'Overview', to: '/ngo/dashboard', icon: LayoutDashboard },
    { label: 'Find donations', to: '/ngo/donations', icon: PackageSearch },
    { label: 'My requests', to: '/ngo/requests', icon: ClipboardCheck },
    { label: 'Pickups', to: '/ngo/pickups', icon: MapPin },
    { label: 'History', to: '/ngo/history', icon: History },
    { label: 'My profile', to: '/ngo/profile', icon: UserRound },
  ],
  volunteer: [
    { label: 'Overview', to: '/volunteer/dashboard', icon: LayoutDashboard },
    { label: 'Available tasks', to: '/volunteer/tasks', icon: HandHeart },
    { label: 'My history', to: '/volunteer/history', icon: History },
    { label: 'My profile', to: '/volunteer/profile', icon: UserRound },
  ],
  admin: [
    { label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: UsersRound },
    { label: 'Verifications', to: '/admin/verifications', icon: FileCheck2 },
    { label: 'Donations', to: '/admin/donations', icon: PackageCheck },
    { label: 'Analytics', to: '/admin/analytics', icon: ChartNoAxesCombined },
  ],
}

const roleLabels: Record<UserRole, string> = { donor: 'Donor workspace', ngo: 'NGO workspace', volunteer: 'Volunteer workspace', admin: 'Admin workspace' }

export function DashboardSidebar({ role }: { role: UserRole }) {
  const { profile, isDemoSession, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const signOut = async () => { try { await logout(); navigate('/'); toast({ title: 'You are signed out', variant: 'success' }) } catch { toast({ title: 'Could not sign out', message: 'Please try again.', variant: 'error' }) } }
  return <aside className="flex w-full shrink-0 flex-col border-b border-[#e8eee9] bg-white p-3 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:p-5">
    <div className="hidden px-1 pb-6 pt-1 lg:block"><Brand/></div>
    <div className="mb-2 flex items-center justify-between px-2 lg:mb-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted">{roleLabels[role]}{isDemoSession ? ' · demo' : ''}</p><Link to="/notifications" aria-label="Notifications" className="rounded-lg p-2 text-muted hover:bg-mist hover:text-forest lg:hidden"><Bell size={17}/></Link></div>
    <nav aria-label={`${role} workspace navigation`} className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">{items[role].map(({ label, to, icon: Icon }) => <NavLink end key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors lg:gap-3 ${isActive ? 'bg-mist text-forest' : 'text-muted hover:bg-background hover:text-forest'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
    <div className="mt-2 lg:hidden"><Button onClick={() => void signOut()} variant="quiet">{isDemoSession ? 'Exit demo' : 'Sign out'}</Button></div>
    <div className="mt-auto hidden border-t border-leaf-50 pt-4 lg:block"><p className="truncate px-3 pb-2 text-xs text-muted" title={profile?.email}>{profile?.displayName}</p><Link to="/notifications" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-background hover:text-forest"><Bell size={18}/>Notifications</Link><Link to="/" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-background hover:text-forest"><MapPin size={18}/>Back to FoodBridge</Link><Button onClick={() => void signOut()} variant="quiet" className="mt-1 w-full justify-start">{isDemoSession ? 'Exit demo' : 'Sign out'}</Button></div>
  </aside>
}
