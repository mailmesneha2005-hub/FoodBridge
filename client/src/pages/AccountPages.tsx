import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, FlaskConical, Leaf } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Button } from '../components/Button'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { FormField } from '../components/ui/FormField'
import { useToast } from '../components/ui/Toast'
import { useAuth, authErrorMessage } from '../contexts/AuthContext'
import { firebaseAuth, missingFirebaseConfig } from '../services/firebase'
import { apiRequest } from '../services/apiClient'
import type { UserRole } from '../types/domain'

function homeFor(role: UserRole) { return `/${role}/dashboard` }
function ConfigMessage() { return <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><p>Firebase Authentication is not configured in this client. Add these missing Firebase Web App values to the repository-root <code className="font-bold">.env</code>, then restart Vite:</p><code className="mt-2 block break-words font-semibold">{missingFirebaseConfig.join(', ') || 'No missing client values detected'}</code><p className="mt-2">Also enable Email/Password in Firebase Console. The API needs Firebase Admin credentials and MongoDB configuration before FoodBridge can create your profile.</p></div> }

export function LoginPage() {
  const { configured, refreshProfile, startDemoSession } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const openDemo = (role: UserRole) => {
    try { startDemoSession(role); navigate(homeFor(role), { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open the prototype preview.') }
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') || '').trim().toLowerCase()
    const password = String(values.get('password') || '')
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) { setError('Enter a valid email and password.'); return }
    if (!firebaseAuth || !configured) { setError('Firebase Authentication is not configured.'); return }
    setBusy(true)
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      const profile = await refreshProfile()
      if (profile.accountStatus !== 'active') { setError(profile.accountStatus === 'pending' ? 'Your account is pending review. You will be able to use your workspace when it is approved.' : 'This account is suspended. Contact FoodBridge support for assistance.'); return }
      toast({ title: 'Welcome back', message: `Signed in as ${profile.displayName}.`, variant: 'success' })
      const requested = (location.state as { from?: string } | null)?.from
      navigate(requested || homeFor(profile.role), { replace: true })
    } catch (authError) { setError(authErrorMessage(authError)) }
    finally { setBusy(false) }
  }
  return <><SiteHeader/><main className="grid min-h-[60vh] place-items-center bg-background px-5 py-10"><div className="w-full max-w-lg rounded-2xl border border-[#e8eee9] bg-white p-6 shadow-card sm:p-9"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-mist text-forest"><Leaf size={22}/></span><p className="eyebrow mt-5 text-center">Welcome back</p><h1 className="mt-2 text-center font-display text-3xl font-extrabold tracking-tight text-ink">Sign in to FoodBridge</h1><p className="mt-3 text-center text-sm leading-6 text-muted">Use your FoodBridge account to continue to your role-based workspace.</p>{!configured && <div className="mt-5"><ConfigMessage/></div>}<form noValidate onSubmit={submit} className="mt-6 space-y-4"><FormField id="login-email" name="email" label="Email address" type="email" autoComplete="email" required placeholder="you@example.com"/><FormField id="login-password" name="password" label="Password" type="password" autoComplete="current-password" required placeholder="Your password"/>{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}<Button type="submit" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16}/></Button><div className="flex flex-wrap justify-between gap-2 text-xs"><Link to="/forgot-password" className="font-bold text-forest hover:underline">Forgot password?</Link><span className="text-muted">New here? <Link to="/register" className="font-bold text-forest hover:underline">Create an account</Link></span></div></form>{import.meta.env.DEV && !configured && <section aria-label="Prototype demo login" className="mt-6 rounded-xl border border-leaf-100 bg-mist/60 p-4"><div className="flex items-start gap-2"><FlaskConical size={17} className="mt-0.5 shrink-0 text-forest"/><div><h2 className="text-sm font-extrabold text-ink">Interactive prototype · no authentication</h2><p className="mt-1 text-xs leading-5 text-muted">Use a demo role to walk through food listing, NGO verification, requests, approvals, pickup and delivery. Demo changes stay in this browser only.</p></div></div><div className="mt-3 grid grid-cols-2 gap-2">{(['donor','ngo','volunteer','admin'] as UserRole[]).map(role => <Button key={role} variant="secondary" className="justify-center capitalize" onClick={() => openDemo(role)}>Demo {role}</Button>)}</div></section>}<Link to="/" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-forest"><ArrowLeft size={15}/> Back to FoodBridge</Link></div></main><SiteFooter/></>
}

export function RegisterPage() {
  const { configured, refreshProfile } = useAuth()
  const location = useLocation()
  const requestedRole = new URLSearchParams(location.search).get('role')
  const initialRole = requestedRole === 'ngo' || requestedRole === 'volunteer' ? requestedRole : 'donor'
  const [role, setRole] = useState<'donor'|'ngo'|'volunteer'>(initialRole)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name') || '').trim()
    const email = String(values.get('email') || '').trim().toLowerCase()
    const password = String(values.get('password') || '')
    const next: Record<string,string> = {}
    if (name.length < 2) next.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (values.get('password') !== values.get('confirmPassword')) next.confirmPassword = 'Passwords do not match.'
    if (role === 'ngo') {
      if (String(values.get('organizationName') || '').trim().length < 2) next.organizationName = 'Enter the organization name.'
      if (String(values.get('registrationNumber') || '').trim().length < 2) next.registrationNumber = 'Enter the NGO registration number.'
      for (const field of ['line1','city','region','country']) if (!String(values.get(field) || '').trim()) next[field] = 'This field is required.'
      if (!(Number(values.get('mealsPerDay')) >= 0)) next.mealsPerDay = 'Enter a valid daily capacity.'
    }
    setErrors(next)
    if (Object.keys(next).length) return
    if (!firebaseAuth || !configured) { setError('Firebase Authentication is not configured.'); return }
    setBusy(true)
    try {
      const currentUser = firebaseAuth.currentUser
      if (currentUser && currentUser.email?.toLowerCase() !== email) {
        throw new Error('A different FoodBridge account is already signed in. Sign out before creating this account.')
      }
      // A still-authenticated account may resume onboarding after an API outage.
      // Never silently sign in an existing account during public registration.
      const credential = currentUser
        ? { user: currentUser }
        : await createUserWithEmailAndPassword(firebaseAuth, email, password)
      await updateProfile(credential.user, { displayName: name })
      await apiRequest('/users/me')
      await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify({ displayName: name }) })
      if (role === 'volunteer') await apiRequest('/users/me/volunteer', { method: 'PUT' })
      if (role === 'ngo') await apiRequest('/users/me/ngo-profile', { method: 'PUT', body: JSON.stringify({
        organizationName: String(values.get('organizationName')).trim(),
        registration: { number: String(values.get('registrationNumber')).trim() },
        capacity: { mealsPerDay: Number(values.get('mealsPerDay')), storageNotes: String(values.get('storageNotes') || '').trim() || undefined },
        address: { line1: String(values.get('line1')).trim(), line2: String(values.get('line2') || '').trim() || undefined, city: String(values.get('city')).trim(), region: String(values.get('region')).trim(), postalCode: String(values.get('postalCode') || '').trim() || undefined, country: String(values.get('country')).trim() },
      }) })
      const profile = await refreshProfile()
      if (profile.accountStatus === 'pending') toast({ title: 'Organization profile submitted', message: 'Your NGO workspace will open after verification.', variant: 'success' })
      else toast({ title: 'FoodBridge account created', message: `Your ${profile.role} workspace is ready.`, variant: 'success' })
      navigate(profile.accountStatus === 'pending' ? '/ngo/dashboard' : homeFor(profile.role), { replace: true })
    } catch (registrationError) {
      const code = typeof registrationError === 'object' && registrationError !== null && 'code' in registrationError ? String(registrationError.code) : ''
      if (code === 'auth/email-already-in-use') setError('An account already uses this email. Sign in to continue. If you were finishing registration after an interruption, sign in and return here to resume setup.')
      else if (firebaseAuth.currentUser?.email?.toLowerCase() === email) setError(`Your Firebase account was created, but FoodBridge setup did not finish: ${authErrorMessage(registrationError)} Your session is still active; fix the service issue and submit again to resume setup. No FoodBridge registration success was recorded.`)
      else setError(authErrorMessage(registrationError))
    } finally { setBusy(false) }
  }
  return <><SiteHeader/><main className="bg-background px-5 py-9 sm:px-8 sm:py-12"><div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div className="max-w-md"><p className="eyebrow">Join FoodBridge</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Let’s build a better food bridge.</h1><p className="mt-4 text-sm leading-6 text-muted">Create an account securely with Firebase Authentication. FoodBridge assigns permissions from your server profile; administrator access cannot be selected here.</p>{!configured && <div className="mt-5"><ConfigMessage/></div>}</div><form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-[#e8eee9] bg-white p-5 shadow-card sm:p-7"><FormField id="name" name="name" label="Full name" autoComplete="name" required error={errors.name} placeholder="Your name"/><FormField id="email" name="email" label="Email address" type="email" autoComplete="email" required error={errors.email} placeholder="you@example.com"/><FormField id="role" name="role" label="I’m joining as"><select id="role" name="role" value={role} onChange={event => setRole(event.target.value as typeof role)} className="field-control"><option value="donor">Food donor</option><option value="ngo">NGO / community organization</option><option value="volunteer">Volunteer</option></select></FormField>
      {role === 'ngo' && <section className="space-y-4 rounded-xl border border-leaf-100 bg-mist/50 p-4"><h2 className="font-display text-base font-extrabold text-ink">Organization verification details</h2><p className="text-xs leading-5 text-muted">An administrator must verify this information before the NGO can request donations.</p><FormField id="organizationName" name="organizationName" label="Organization name" required error={errors.organizationName}/><FormField id="registrationNumber" name="registrationNumber" label="Registration number" required error={errors.registrationNumber}/><FormField id="mealsPerDay" name="mealsPerDay" label="Meal capacity per day" type="number" min="0" required error={errors.mealsPerDay}/><FormField id="storageNotes" name="storageNotes" label="Storage notes" placeholder="Optional"/><FormField id="line1" name="line1" label="Street address" required error={errors.line1}/><FormField id="line2" name="line2" label="Address line 2"/><div className="grid gap-3 sm:grid-cols-2"><FormField id="city" name="city" label="City" required error={errors.city}/><FormField id="region" name="region" label="State / region" required error={errors.region}/><FormField id="postalCode" name="postalCode" label="Postal code"/><FormField id="country" name="country" label="Country" defaultValue="India" required error={errors.country}/></div></section>}
      <div className="grid gap-4 sm:grid-cols-2"><FormField id="password" name="password" label="Password" type="password" autoComplete="new-password" required error={errors.password} placeholder="At least 8 characters"/><FormField id="confirmPassword" name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" required error={errors.confirmPassword} placeholder="Re-enter password"/></div>{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-800">{error}</p>}<Button type="submit" disabled={busy || !configured}>{busy ? 'Creating account…' : 'Create account'} <ArrowRight size={16}/></Button><p className="text-xs text-muted">Already registered? <Link to="/login" className="font-bold text-forest hover:underline">Sign in</Link></p></form></div></main><SiteFooter/></>
}

export function ForgotPasswordPage() {
  const { configured } = useAuth()
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSent(false)
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (!firebaseAuth || !configured) { setError('Firebase Authentication is not configured, so a reset email cannot be sent.'); return }
    setBusy(true)
    try { await sendPasswordResetEmail(firebaseAuth, email); setSent(true); toast({ title: 'Password reset email sent', message: 'Check your inbox and spam folder for Firebase’s reset link.', variant: 'success' }) }
    catch (resetError) {
      if (typeof resetError === 'object' && resetError !== null && 'code' in resetError && resetError.code === 'auth/user-not-found') setSent(true)
      else setError(authErrorMessage(resetError))
    }
    finally { setBusy(false) }
  }
  return <><SiteHeader/><main className="grid min-h-[60vh] place-items-center bg-background px-5 py-10"><div className="w-full max-w-lg rounded-2xl border border-[#e8eee9] bg-white p-6 shadow-card sm:p-8"><p className="eyebrow">Account help</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">Reset your password</h1><p className="mt-3 text-sm leading-6 text-muted">We’ll send a password reset link using Firebase Authentication.</p>{!configured && <div className="mt-5"><ConfigMessage/></div>}<form noValidate onSubmit={submit} className="mt-6 space-y-4"><FormField id="reset-email" name="email" label="Email address" type="email" autoComplete="email" required error={error} placeholder="you@example.com"/>{sent && <p role="status" className="rounded-lg bg-mist px-3 py-2 text-sm text-forest">If an account uses that address, Firebase has sent a reset link.</p>}<Button type="submit" disabled={busy || !configured}>{busy ? 'Sending…' : 'Send reset link'}</Button></form><Link to="/login" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-forest"><ArrowLeft size={15}/> Back to sign in</Link></div></main><SiteFooter/></>
}
