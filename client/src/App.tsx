import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { ErrorState } from './components/ui/FeedbackState'
import { AboutPage, HowItWorksPage } from './pages/PublicPages'
import { DonationFormPage } from './pages/DonationFormPage'
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AccountPages'
import { HomePage } from './pages/HomePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { WorkspacePage } from './pages/WorkspacePage'
import type { UserRole } from './types/domain'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { DonationDashboard, DonationWorkflowPage } from './pages/DonationWorkflows'
import { VolunteerDashboard, VolunteerWorkflowPage } from './pages/VolunteerWorkflow'

function UnauthorizedPage() {
  return <><SiteHeader/><main className="mx-auto grid min-h-[55vh] max-w-3xl place-items-center px-5 py-12"><ErrorState title="This workspace belongs to another role" description="Your FoodBridge profile does not have permission to open this page." actionLabel="Go to your workspace" actionTo="/"/></main><SiteFooter/></>
}

function NotFoundPage() {
  return <><SiteHeader/><main className="mx-auto grid min-h-[55vh] max-w-3xl place-items-center px-5 py-12"><ErrorState title="We couldn’t find that page" description="The page may have moved, or the address may be incorrect." actionLabel="Back to FoodBridge" actionTo="/"/></main><SiteFooter/></>
}

function RolePage({ role }: { role: UserRole }) { return <ProtectedRoute role={role}><WorkspacePage role={role}/></ProtectedRoute> }

export default function App() {
  return <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/how-it-works" element={<HowItWorksPage/>}/>
    <Route path="/about" element={<AboutPage/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route path="/get-started" element={<Navigate to="/register" replace/>}/>
    <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>

    <Route path="/donor/dashboard" element={<ProtectedRoute role="donor"><DonationDashboard role="donor"/></ProtectedRoute>}/>
    <Route path="/donor/donations" element={<ProtectedRoute role="donor"><DonationWorkflowPage scope="donor-donations"/></ProtectedRoute>}/>
    <Route path="/donor/donations/:id/edit" element={<ProtectedRoute role="donor"><DonationFormPage/></ProtectedRoute>}/>
    <Route path="/donor/donations/new" element={<ProtectedRoute role="donor"><DonationFormPage/></ProtectedRoute>}/>
    <Route path="/donor/requests" element={<ProtectedRoute role="donor"><DonationWorkflowPage scope="donor-requests"/></ProtectedRoute>}/>
    <Route path="/donor/history" element={<RolePage role="donor"/>}/>
    <Route path="/donor/profile" element={<RolePage role="donor"/>}/>

    <Route path="/ngo/dashboard" element={<ProtectedRoute role="ngo"><DonationDashboard role="ngo"/></ProtectedRoute>}/>
    <Route path="/ngo/donations" element={<ProtectedRoute role="ngo"><DonationWorkflowPage scope="ngo-donations"/></ProtectedRoute>}/>
    <Route path="/ngo/requests" element={<ProtectedRoute role="ngo"><DonationWorkflowPage scope="ngo-requests"/></ProtectedRoute>}/>
    <Route path="/ngo/pickups" element={<RolePage role="ngo"/>}/>
    <Route path="/ngo/history" element={<RolePage role="ngo"/>}/>
    <Route path="/ngo/profile" element={<RolePage role="ngo"/>}/>

    <Route path="/volunteer/dashboard" element={<ProtectedRoute role="volunteer"><VolunteerDashboard/></ProtectedRoute>}/>
    <Route path="/volunteer/tasks" element={<ProtectedRoute role="volunteer"><VolunteerWorkflowPage/></ProtectedRoute>}/>
    <Route path="/volunteer/tasks/" element={<ProtectedRoute role="volunteer"><VolunteerWorkflowPage/></ProtectedRoute>}/>
    <Route path="/volunteer/history" element={<ProtectedRoute role="volunteer"><VolunteerWorkflowPage history/></ProtectedRoute>}/>
    <Route path="/volunteer/profile" element={<RolePage role="volunteer"/>}/>

    <Route path="/admin/dashboard" element={<RolePage role="admin"/>}/>
    <Route path="/admin/users" element={<RolePage role="admin"/>}/>
    <Route path="/admin/verifications" element={<RolePage role="admin"/>}/>
    <Route path="/admin/donations" element={<RolePage role="admin"/>}/>
    <Route path="/admin/analytics" element={<RolePage role="admin"/>}/>

    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage/></ProtectedRoute>}/>
    <Route path="/unauthorized" element={<UnauthorizedPage/>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes>
}
