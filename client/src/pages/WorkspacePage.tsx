import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '../components/ui/DashboardLayout'
import type { UserRole } from '../types/domain'
import { AdminWorkspace } from './AdminWorkspace'
import { ConnectedWorkspace } from './ConnectedWorkspace'

/** Shared route shell for role pages that are not handled by dedicated workflow pages. */
export function WorkspacePage({ role }: { role: UserRole }) {
  const { pathname } = useLocation()
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return <DashboardLayout role={role}>{role === 'admin' ? <AdminWorkspace pathname={normalizedPath}/> : <ConnectedWorkspace pathname={normalizedPath} role={role}/>}</DashboardLayout>
}
