import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { ToastProvider } from '../components/ui/Toast'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { LoginPage } from './AccountPages'
import { readDemoState } from '../demo/demoStore'
import type { UserRole } from '../types/domain'

function DemoRoute() {
  const { role } = useParams()
  return <ProtectedRoute role={role as UserRole}><p>This authenticated child must not render in demo mode.</p></ProtectedRoute>
}

describe('local prototype demo login', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear() } })
  })
  afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear() })

  it('opens the selected workspace without Firebase authentication', async () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><ToastProvider><Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/:role/dashboard" element={<DemoRoute/>}/>
    </Routes></ToastProvider></AuthProvider></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Demo ngo/i }))
    expect(await screen.findByText('Local workflow demo · ngo')).toBeInTheDocument()
    expect(screen.getByText(/Authentication is bypassed.*local storage/i)).toBeInTheDocument()
    expect(screen.queryByText('This authenticated child must not render in demo mode.')).not.toBeInTheDocument()
  })

  it('creates a donation, persists submitted details and exposes it to the NGO demo role', async () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><ToastProvider><Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/:role/*" element={<DemoRoute/>}/>
    </Routes></ToastProvider></AuthProvider></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Demo donor/i }))
    expect(await screen.findByText('Local workflow demo · donor')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /New donation/i }))
    expect(await screen.findByRole('heading', { name: 'Donate surplus food' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Food name/), { target: { value: 'Fresh vegetable boxes' } })
    fireEvent.change(screen.getByLabelText(/Food category/), { target: { value: 'Fresh produce' } })
    fireEvent.change(screen.getByLabelText(/Quantity/), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/Number of meals/), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText(/Food type/), { target: { value: 'raw' } })
    fireEvent.change(screen.getByLabelText(/Pickup city/), { target: { value: 'Pune' } })
    fireEvent.change(screen.getByLabelText(/Expiry date & time/), { target: { value: '2030-01-01T19:00' } })
    fireEvent.change(screen.getByLabelText(/Available from/), { target: { value: '2030-01-01T15:00' } })
    fireEvent.change(screen.getByLabelText(/Available until/), { target: { value: '2030-01-01T18:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Add food to demo/i }))
    expect(await screen.findByText('Donation added')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Fresh vegetable boxes' })).toBeInTheDocument()
    expect(screen.getByText('Fresh produce · 12 kg · 24 meals · raw')).toBeInTheDocument()
    expect(screen.getByText(/Pune · Donated by Demo Donor/)).toBeInTheDocument()
    const saved = readDemoState().donations[0]
    expect(saved).toMatchObject({ title: 'Fresh vegetable boxes', amount: 12, meals: 24, unit: 'kg', foodType: 'raw', city: 'Pune', status: 'available' })
    expect(saved.pickupStart).toBe(new Date('2030-01-01T15:00').toISOString())
    expect(saved.pickupEnd).toBe(new Date('2030-01-01T18:00').toISOString())
    expect(saved.safeUseDeadline).toBe(new Date('2030-01-01T19:00').toISOString())
    cleanup()
    sessionStorage.setItem('foodbridge-prototype-demo-role', 'ngo')
    render(<MemoryRouter initialEntries={['/ngo/donations']}><AuthProvider><ToastProvider><Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/:role/*" element={<DemoRoute/>}/>
    </Routes></ToastProvider></AuthProvider></MemoryRouter>)
    expect(await screen.findByText('Local workflow demo · ngo')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Fresh vegetable boxes' })).toBeInTheDocument()
  })

  it('shows field errors when required fields including pickup times are missing', async () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><ToastProvider><Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/:role/*" element={<DemoRoute/>}/>
    </Routes></ToastProvider></AuthProvider></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: /Demo donor/i }))
    fireEvent.click(await screen.findByRole('link', { name: /New donation/i }))
    fireEvent.click(screen.getByRole('button', { name: /Add food to demo/i }))
    expect(screen.getByText(/fix the highlighted fields/i)).toBeInTheDocument()
    expect(screen.getByText(/Choose when pickup becomes available/i)).toBeInTheDocument()
    expect(screen.getByText(/Choose when pickup availability ends/i)).toBeInTheDocument()
    expect(readDemoState().donations).toHaveLength(0)
  })

  it('rejects an available-until time that is not later than available-from', async () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><ToastProvider><Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/:role/*" element={<DemoRoute/>}/>
    </Routes></ToastProvider></AuthProvider></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Demo donor/i }))
    fireEvent.click(await screen.findByRole('link', { name: /New donation/i }))
    fireEvent.change(screen.getByLabelText(/Food name/), { target: { value: 'Fresh vegetable boxes' } })
    fireEvent.change(screen.getByLabelText(/Food category/), { target: { value: 'Fresh produce' } })
    fireEvent.change(screen.getByLabelText(/Quantity/), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/Number of meals/), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText(/Food type/), { target: { value: 'raw' } })
    fireEvent.change(screen.getByLabelText(/Pickup city/), { target: { value: 'Pune' } })
    fireEvent.change(screen.getByLabelText(/Expiry date & time/), { target: { value: '2030-01-01T19:00' } })
    fireEvent.change(screen.getByLabelText(/Available from/), { target: { value: '2030-01-01T18:00' } })
    fireEvent.change(screen.getByLabelText(/Available until/), { target: { value: '2030-01-01T18:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Add food to demo/i }))
    expect(await screen.findByText(/Available until must be later than available from/i)).toBeInTheDocument()
    expect(readDemoState().donations).toHaveLength(0)
  })
})
