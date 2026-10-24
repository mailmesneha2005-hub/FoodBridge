import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../Button'

type Props = { title: string; description: string; actionLabel?: string; actionTo?: string; onAction?: () => void }

export function EmptyState({ title, description, actionLabel, actionTo, onAction }: Props) {
  return <div className="rounded-2xl border border-dashed border-[#d9e5dc] bg-white px-6 py-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-mist text-forest"><Inbox size={22}/></span><h3 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>{actionLabel && (actionTo ? <Button to={actionTo} className="mt-5">{actionLabel}</Button> : onAction ? <Button onClick={onAction} className="mt-5">{actionLabel}</Button> : null)}</div>
}

export function ErrorState({ title = 'Something went wrong', description, actionLabel = 'Try again', actionTo, onRetry }: { title?: string; description: string; actionLabel?: string; actionTo?: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50/70 px-6 py-8 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-rose-700"><AlertCircle size={21}/></span><h3 className="mt-3 font-display font-extrabold text-ink">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>{actionTo ? <Button to={actionTo} variant="secondary" className="mt-4">{actionLabel}</Button> : onRetry ? <Button variant="secondary" onClick={onRetry} className="mt-4">{actionLabel}</Button> : null}</div>
}

export function SuccessState({ title, description, actionLabel, actionTo }: { title: string; description: string; actionLabel?: string; actionTo?: string }) {
  return <div role="status" className="rounded-2xl border border-leaf-100 bg-mist px-6 py-8 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-forest"><CheckCircle2 size={21}/></span><h3 className="mt-3 font-display font-extrabold text-ink">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>{actionLabel && actionTo && <Button to={actionTo} variant="secondary" className="mt-4">{actionLabel}</Button>}</div>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>
}
