import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'
type ToastInput = { title: string; message?: string; variant?: ToastVariant }
type ToastItem = ToastInput & { id: number }
const ToastContext = createContext<(toast: ToastInput) => void>(() => { throw new Error('useToast must be used inside ToastProvider') })
const icon = { success: Check, error: TriangleAlert, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setItems(current => current.filter(item => item.id !== id))
  }, [])
  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current
    setItems(current => [...current, { ...input, variant: input.variant ?? 'info', id }])
    timers.current.set(id, setTimeout(() => dismiss(id), 5000))
  }, [dismiss])
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear() }, [])
  return <ToastContext.Provider value={toast}>{children}<div aria-label="Notifications" aria-live="polite" className="fixed right-4 top-20 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">{items.map(item => {
    const Icon = icon[item.variant ?? 'info']
    return <div key={item.id} role="status" className="flex items-start gap-3 rounded-xl border border-[#e8eee9] bg-white p-3.5 shadow-raised"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.variant === 'success' ? 'bg-mist text-forest' : item.variant === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'}`}><Icon size={17}/></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-ink">{item.title}</p>{item.message && <p className="mt-0.5 text-xs leading-5 text-muted">{item.message}</p>}</div><button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)} className="grid size-7 place-items-center rounded-md text-muted hover:bg-slate-100"><X size={15}/></button></div>
  })}</div></ToastContext.Provider>
}

export function useToast() { return useContext(ToastContext) }
