import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title: string; children: ReactNode; labelledBy?: string }) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#15231a]/45 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? 'modal-title'} className="w-full max-w-lg rounded-2xl border border-[#e8eee9] bg-white p-5 shadow-raised sm:p-6">
      <div className="flex items-start justify-between gap-4"><h2 id={labelledBy ?? 'modal-title'} className="font-display text-xl font-extrabold text-ink">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-leaf-50 hover:text-forest"><X size={18}/></button></div>
      <div className="mt-4">{children}</div>
    </section>
  </div>
}
