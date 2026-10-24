import type { ReactNode } from 'react'
import { DashboardSidebar } from './DashboardSidebar'
import type { UserRole } from '../../types/domain'

export function DashboardLayout({ children, role }: { children: ReactNode; role: UserRole }) {
  return <div className="min-h-screen bg-background lg:flex"><DashboardSidebar role={role}/><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9"><div className="mx-auto max-w-6xl">{children}</div></main></div>
}
