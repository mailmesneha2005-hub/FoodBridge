import type { ReactNode } from 'react'

const variants = {
  success: 'bg-[#eaf7ec] text-[#176b35]', warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700', info: 'bg-sky-50 text-sky-800', neutral: 'bg-slate-100 text-slate-700',
}

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: keyof typeof variants }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${variants[variant]}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${variant === 'success' ? 'bg-[#2e8b45]' : variant === 'warning' ? 'bg-amber-500' : variant === 'danger' ? 'bg-rose-500' : variant === 'info' ? 'bg-sky-500' : 'bg-slate-400'}`}/>{children}</span>
}
