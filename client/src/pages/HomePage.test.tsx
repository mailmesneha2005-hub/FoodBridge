import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'
import { ToastProvider } from '../components/ui/Toast'
import { AuthProvider } from '../contexts/AuthContext'

describe('FoodBridge landing page', () => {
  it('shows the core message and ways to participate', () => {
    render(<MemoryRouter><ToastProvider><AuthProvider><HomePage /></AuthProvider></ToastProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /turning surplus food into shared hope/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /donate food/i })).toHaveAttribute('href', '/register?role=donor')
    expect(screen.getByRole('link', { name: /join as an ngo/i })).toHaveAttribute('href', '/register?role=ngo')
    expect(screen.getByRole('heading', { name: /three good neighbors. one simple connection./i })).toBeInTheDocument()
    expect(screen.getByText(/illustrative · not live data/i)).toBeInTheDocument()
  })
})
