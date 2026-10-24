import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from './Brand'
import { Button } from './Button'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './ui/Toast'

const links = [
  { label: 'Home', to: '/' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'About', to: '/about' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { firebaseUser, profile, isDemoSession, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const close = () => setOpen(false)
  const workspace = profile ? `/${profile.role}/dashboard` : '/login'
  const hasSession = Boolean(firebaseUser || isDemoSession)
  const signOut = async () => { try { await logout(); close(); navigate('/'); toast({ title: 'You are signed out', variant: 'success' }) } catch { toast({ title: 'Could not sign out', message: 'Please try again.', variant: 'error' }) } }

  return <header className="sticky top-0 z-40 border-b border-[#e8eee9] bg-white/95 backdrop-blur-sm">
    <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-8">
      <Brand />
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
        {links.map(link => <Link key={link.label} to={link.to} className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-leaf-50 hover:text-forest">{link.label}</Link>)}
      </nav>
      <div className="hidden items-center gap-2 lg:flex">
        {hasSession ? <><Button to={workspace} variant="quiet">{isDemoSession ? 'Demo workspace' : profile ? 'My workspace' : 'Finish account setup'}</Button><Button onClick={() => void signOut()} variant="secondary">{isDemoSession ? 'Exit demo' : 'Sign out'}</Button></> : <><Button to="/login" variant="quiet">Login</Button><Button to="/register" className="px-4">Get started <ArrowRight size={16}/></Button></>}
      </div>
      <button type="button" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(value => !value)} className="grid size-10 place-items-center rounded-xl border border-leaf-200 text-forest lg:hidden">
        {open ? <X size={20}/> : <Menu size={20}/>}
      </button>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-[#e8eee9] bg-white px-4 pb-5 pt-2 lg:hidden">
      <div className="mx-auto flex max-w-7xl flex-col">
        {links.map(link => <Link key={link.label} onClick={close} to={link.to} className="border-b border-leaf-50 py-3.5 text-sm font-semibold text-muted hover:text-forest">{link.label}</Link>)}
        {hasSession ? <><Link onClick={close} to={workspace} className="border-b border-leaf-50 py-3.5 text-sm font-semibold text-muted hover:text-forest">{isDemoSession ? 'Demo workspace' : profile ? 'My workspace' : 'Finish account setup'}</Link><Button variant="secondary" className="mt-4" onClick={() => void signOut()}>{isDemoSession ? 'Exit demo' : 'Sign out'}</Button></> : <><Link onClick={close} to="/login" className="border-b border-leaf-50 py-3.5 text-sm font-semibold text-muted hover:text-forest">Login</Link><Button to="/register" className="mt-4" onClick={close}>Get started <ArrowRight size={16}/></Button></>}
      </div>
    </nav>}
  </header>
}
